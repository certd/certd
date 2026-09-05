import { AbstractTaskPlugin, IsTaskPlugin, pluginGroups, RunStrategy, TaskInput, TaskOutput } from "@certd/pipeline";
import { CertApplyPluginNames, CertInfo } from "@certd/plugin-cert";
import { FastlyAccess } from "../access.js";

@IsTaskPlugin({
  name: "FastlyUploadCert",
  title: "Fastly-上传证书到Fastly",
  desc: "部署 / 上传 SSL/TLS 自定义证书到 Fastly CDN",
  icon: "simple-icons:fastly",
  group: pluginGroups.cdn.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
})
export class FastlyUploadCertPlugin extends AbstractTaskPlugin {
  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames],
    },
    required: true,
  })
  cert!: CertInfo;

  @TaskInput({
    title: "Access授权",
    helper: "Fastly 授权凭证",
    component: {
      name: "access-selector",
      type: "fastly",
    },
    required: true,
  })
  accessId!: string;

  @TaskInput({
    title: "证书ID (tls_certificate_id)",
    helper:
      "可选。若填写则对 Fastly 已有证书进行更新(PATCH)；留空则新建上传(POST)。" +
      "注意：Fastly 更新证书要求新证书与原证书使用相同的私钥，请确保续期时复用私钥(reuse key)，否则更新会失败。",
    component: {
      placeholder: "例如: tls_cert_xxx (留空表示新建)",
    },
    required: false,
  })
  certificateId = "";

  @TaskInput({
    title: "证书名称",
    helper: "可选。上传到 Fastly 上的自定义证书名称/标签",
    component: {
      placeholder: "例如: my-fastly-cert",
    },
    required: false,
  })
  name = "";

  @TaskOutput({
    title: "Fastly 证书 ID",
  })
  fastlyCertId = "";

  async onInstance() {}

  async execute(): Promise<void> {
    const { cert, accessId, certificateId, name } = this;
    const access = (await this.getAccess(accessId)) as FastlyAccess;

    // cert.crt is the full certificate chain (PEM); cert.key is the private key (PEM)
    const certPem = cert.crt;
    const keyPem = cert.key;

    const certName = name && name.trim() ? name.trim() : undefined;

    if (certificateId && certificateId.trim()) {
      // --- UPDATE existing certificate (PATCH) ---
      // Only cert_blob is needed; private key is already linked to the certificate.
      const targetId = certificateId.trim();
      this.logger.info(`开始更新 Fastly 证书 [${targetId}]...`);

      const payload: any = {
        data: {
          type: "tls_certificate",
          id: targetId,
          attributes: {
            cert_blob: certPem,
            ...(certName && { name: certName }),
          },
        },
      };

      const res = await access.doRequestApi(`/tls/certificates/${targetId}`, payload, "patch");
      this.fastlyCertId = res?.data?.id || targetId;
      this.logger.info(`Fastly 证书更新成功, ID: ${this.fastlyCertId}`);
    } else {
      // --- CREATE new certificate (2-step: upload private key first, then cert) ---
      // Step 1: Upload the private key to /tls/private_keys
      this.logger.info("开始上传私钥到 Fastly...");
      const keyPayload: any = {
        data: {
          type: "tls_private_key",
          attributes: {
            key: keyPem,
            ...(certName && { name: certName }),
          },
        },
      };

      const keyRes = await access.doRequestApi("/tls/private_keys", keyPayload, "post");
      const privateKeyId = keyRes?.data?.id;
      if (!privateKeyId) {
        throw new Error("Fastly 私钥上传失败，未获取到 private key ID");
      }
      this.logger.info(`Fastly 私钥上传成功, privateKeyId: ${privateKeyId}`);

      // Step 2: Upload the certificate referencing the private key
      this.logger.info("开始上传证书到 Fastly...");
      const certPayload: any = {
        data: {
          type: "tls_certificate",
          attributes: {
            cert_blob: certPem,
            ...(certName && { name: certName }),
          },
          relationships: {
            tls_private_key: {
              data: {
                type: "tls_private_key",
                id: privateKeyId,
              },
            },
          },
        },
      };

      const certRes = await access.doRequestApi("/tls/certificates", certPayload, "post");
      this.fastlyCertId = certRes?.data?.id || "";
      this.logger.info(`Fastly 证书新建成功, ID: ${this.fastlyCertId}`);
    }
  }
}

new FastlyUploadCertPlugin();
