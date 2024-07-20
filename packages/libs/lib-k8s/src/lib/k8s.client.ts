import kubernetesClient from 'kubernetes-client';
//@ts-ignore
import dns from 'dns';
import { logger } from '@certd/pipeline';

//@ts-ignore
const { KubeConfig, Client, Request } = kubernetesClient;

export class K8sClient {
  kubeConfigStr: string;
  lookup!: any;
  client!: any;
  constructor(kubeConfigStr: string) {
    this.kubeConfigStr = kubeConfigStr;
    this.init();
  }

  init() {
    const kubeconfig = new KubeConfig();
    kubeconfig.loadFromString(this.kubeConfigStr);
    const reqOpts = { kubeconfig, request: {} } as any;
    if (this.lookup) {
      reqOpts.request.lookup = this.lookup;
    }

    const backend = new Request(reqOpts);
    this.client = new Client({ backend, version: '1.13' });
  }

  /**
   *
   * @param localRecords {  [domain]:{ip:'xxx.xx.xxx'} }
   */
  setLookup(localRecords: { [key: string]: { ip: string } }) {
    this.lookup = (hostnameReq: any, options: any, callback: any) => {
      logger.info('custom lookup', hostnameReq, localRecords);
      if (localRecords[hostnameReq]) {
        logger.info('local record', hostnameReq, localRecords[hostnameReq]);
        callback(null, localRecords[hostnameReq].ip, 4);
      } else {
        dns.lookup(hostnameReq, options, callback);
      }
    };
    this.init();
  }

  /**
   * 查询 secret列表
   * @param opts = {namespace:default}
   * @returns secretsList
   */
  async getSecret(opts: { namespace: string }) {
    const namespace = opts.namespace || 'default';
    return await this.client.api.v1.namespaces(namespace).secrets.get();
  }

  /**
   * 创建Secret
   * @param opts {namespace:default, body:yamlStr}
   * @returns {Promise<*>}
   */
  async createSecret(opts: any) {
    const namespace = opts.namespace || 'default';
    const created = await this.client.api.v1.namespaces(namespace).secrets.post({
      body: opts.body,
    });
    logger.info('new secrets:', created);
    return created;
  }

  async updateSecret(opts: any) {
    const namespace = opts.namespace || 'default';
    const secretName = opts.secretName;
    if (secretName == null) {
      throw new Error('secretName 不能为空');
    }
    return await this.client.api.v1.namespaces(namespace).secrets(secretName).put({
      body: opts.body,
    });
  }

  async patchSecret(opts: any) {
    const namespace = opts.namespace || 'default';
    const secretName = opts.secretName;
    if (secretName == null) {
      throw new Error('secretName 不能为空');
    }
    return await this.client.api.v1.namespaces(namespace).secrets(secretName).patch({
      body: opts.body,
    });
  }

  async getIngressList(opts: any) {
    const namespace = opts.namespace || 'default';
    return await this.client.apis.extensions.v1beta1.namespaces(namespace).ingresses.get();
  }

  async getIngress(opts: any) {
    const namespace = opts.namespace || 'default';
    const ingressName = opts.ingressName;
    if (!ingressName) {
      throw new Error('ingressName 不能为空');
    }
    return await this.client.apis.extensions.v1beta1.namespaces(namespace).ingresses(ingressName).get();
  }

  async patchIngress(opts: any) {
    const namespace = opts.namespace || 'default';
    const ingressName = opts.ingressName;
    if (!ingressName) {
      throw new Error('ingressName 不能为空');
    }
    return await this.client.apis.extensions.v1beta1.namespaces(namespace).ingresses(ingressName).patch({
      body: opts.body,
    });
  }
}
