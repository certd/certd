/// <reference types="mocha" />

import assert from "node:assert/strict";

import { VolcengineDeployToVKE } from "./plugin-deploy-to-vke.js";
import { CertInfo } from "@certd/plugin-cert";

describe("VolcengineDeployToVKE", () => {
  it("uses a single-select cluster field", () => {
    const clusterInput = (VolcengineDeployToVKE as any).define.input.clusterId;

    assert.equal(clusterInput.component.single, true);
    assert.equal(clusterInput.component.mode, "tags");
  });

  it("sends the configured string ClusterId", async () => {
    const plugin = new VolcengineDeployToVKE();
    plugin.clusterId = "cc1234567890123456789";
    plugin.kubeconfigType = "Public";
    plugin.logger = { info: () => undefined } as any;

    let requestBody: any;
    const kubeconfigId = await (plugin as any).createKubeconfig({
      request: async (req: any) => {
        requestBody = req.body;
        return { Result: { Id: "kc-123" } };
      },
    });

    assert.equal(kubeconfigId, "kc-123");
    assert.equal(requestBody.ClusterId, "cc1234567890123456789");
  });

  it("decodes the base64 kubeconfig returned by VKE", async () => {
    const plugin = new VolcengineDeployToVKE();
    plugin.clusterId = "cc1234567890123456789";
    plugin.kubeconfigType = "Public";

    const kubeconfig = ["apiVersion: v1", "clusters:", "- cluster:", "    server: https://example.com", "  name: vke", "contexts: []", "current-context: vke"].join("\n");

    const result = await (plugin as any).getKubeconfig(
      {
        request: async () => ({
          Result: {
            Items: [{ Id: "kc-123", Kubeconfig: Buffer.from(kubeconfig).toString("base64") }],
          },
        }),
      },
      "kc-123"
    );

    assert.equal(result, kubeconfig);
  });

  it("formats Kubernetes forbidden errors with VKE RBAC guidance", () => {
    const plugin = new VolcengineDeployToVKE();
    plugin.clusterId = "cc1234567890123456789";
    plugin.namespace = "default";

    const message = (plugin as any).formatK8sError({
      status: "Failure",
      message: 'secrets "aaaa" is forbidden: User "2100656669-kd7ubde6lsvqbdgsa40t0" cannot get resource "secrets" in API group "" in the namespace "default"',
      reason: "Forbidden",
      details: { name: "aaaa", kind: "secrets" },
      code: 403,
    });

    assert.match(message, /VKE集群RBAC权限不足/);
    assert.match(message, /用户ID:2100656669/);
    assert.match(message, /命名空间:default/);
    assert.match(message, /secrets get\/create\/update\/patch/);
  });

  it("explains missing ingress names with available choices", async () => {
    const plugin = new VolcengineDeployToVKE();
    plugin.targetType = "ingress";
    plugin.namespace = "default";
    plugin.ingressName = "ingress-nginx-controller";

    await assert.rejects(
      () =>
        (plugin as any).getTargetSecretNames({
          getIngressList: async () => ({
            items: [{ metadata: { name: "app-web" } }, { metadata: { name: "api-web" } }],
          }),
        }),
      /当前命名空间可用Ingress:app-web,api-web/
    );
  });

  it("creates Secret with cert_center format for new non-tls secrets", async () => {
    const plugin = new VolcengineDeployToVKE();
    plugin.namespace = "default";
    plugin.targetType = "secret";
    plugin.secretName = "test-tls";
    plugin.createOnNotFound = true;
    plugin.logger = { info: () => undefined } as any;
    plugin.appendTimeSuffix = (s: string) => s + "-test";

    let secretBody: any;
    await (plugin as any).patchCertSecret({
      certId: "cert-abc123",
      k8sClient: {
        patchSecret: async (opts: any) => {
          secretBody = opts.body;
          return {};
        },
        client: {
          readNamespacedSecret: async () => {
            throw Object.assign(new Error("Not Found"), { response: { body: { code: 404 } } });
          },
        },
      },
      secretNames: ["test-tls"],
    });

    assert.equal(secretBody.type, "Opaque");
    assert.equal(secretBody.data["cert_id"], Buffer.from("cert-abc123").toString("base64"));
    assert.equal(secretBody.data["cert_source"], Buffer.from("cert_center").toString("base64"));
  });

  it("uses tls.crt/tls.key format for kubernetes.io/tls secrets", async () => {
    const plugin = new VolcengineDeployToVKE();
    plugin.namespace = "default";
    plugin.targetType = "secret";
    plugin.secretName = "test-tls";
    plugin.logger = { info: () => undefined } as any;
    plugin.appendTimeSuffix = (s: string) => s + "-test";
    plugin.cert = { crt: "MY_CRT", key: "MY_KEY" } as CertInfo;

    let secretBody: any;
    await (plugin as any).patchCertSecret({
      certId: "cert-abc123",
      k8sClient: {
        patchSecret: async (opts: any) => {
          secretBody = opts.body;
          return {};
        },
        client: {
          readNamespacedSecret: async () => ({
            body: { type: "kubernetes.io/tls" },
          }),
        },
      },
      secretNames: ["test-tls"],
    });

    assert.equal(secretBody.data["tls.crt"], Buffer.from("MY_CRT").toString("base64"));
    assert.equal(secretBody.data["tls.key"], Buffer.from("MY_KEY").toString("base64"));
  });
});
