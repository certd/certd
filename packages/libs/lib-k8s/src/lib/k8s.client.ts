import { CoreV1Api, KubeConfig, NetworkingV1Api, V1Ingress, V1Secret } from '@kubernetes/client-node';
import dns from 'dns';
import { ILogger } from '@certd/pipeline';
import _ from 'lodash-es';

export type K8sClientOpts = {
  kubeConfigStr: string;
  logger: ILogger;
  //{  [domain]:{ip:'xxx.xx.xxx'} }
  //暂时没用
  lookup?: any;
};
export class K8sClient {
  kubeconfig!: KubeConfig;
  kubeConfigStr: string;
  lookup!: (hostnameReq: any, options: any, callback: any) => void;
  client!: CoreV1Api;
  logger: ILogger;
  constructor(opts: K8sClientOpts) {
    this.kubeConfigStr = opts.kubeConfigStr;
    this.logger = opts.logger;
    this.setLookup(opts.lookup);
    this.init();
  }

  init() {
    const kubeconfig = new KubeConfig();
    kubeconfig.loadFromString(this.kubeConfigStr);
    this.kubeconfig = kubeconfig;
    this.client = kubeconfig.makeApiClient(CoreV1Api);

    // const reqOpts = { kubeconfig, request: {} } as any;
    // if (this.lookup) {
    //   reqOpts.request.lookup = this.lookup;
    // }
    //
    // const backend = new Request(reqOpts);
    // this.client = new Client({ backend, version: '1.13' });
  }

  /**
   *
   * @param localRecords {  [domain]:{ip:'xxx.xx.xxx'} }
   */
  setLookup(localRecords: { [key: string]: { ip: string } }) {
    if (localRecords == null) {
      return;
    }
    this.lookup = (hostnameReq: any, options: any, callback: any) => {
      this.logger.info('custom lookup', hostnameReq, localRecords);
      if (localRecords[hostnameReq]) {
        this.logger.info('local record', hostnameReq, localRecords[hostnameReq]);
        callback(null, localRecords[hostnameReq].ip, 4);
      } else {
        dns.lookup(hostnameReq, options, callback);
      }
    };
  }

  /**
   * 查询 secret列表
   * @param opts = {namespace:default}
   * @returns secretsList
   */
  async getSecrets(opts: { namespace: string }) {
    const namespace = opts.namespace || 'default';
    return await this.client.listNamespacedSecret(namespace);
  }

  /**
   * 创建Secret
   * @param opts {namespace:default, body:yamlStr}
   * @returns {Promise<*>}
   */
  async createSecret(opts: { namespace: string; body: V1Secret }) {
    const namespace = opts.namespace || 'default';
    const created = await this.client.createNamespacedSecret(namespace, opts.body);
    this.logger.info('new secrets:', opts.body);
    return created.body;
  }

  // async updateSecret(opts: any) {
  //   const namespace = opts.namespace || 'default';
  //   const secretName = opts.secretName;
  //   if (secretName == null) {
  //     throw new Error('secretName 不能为空');
  //   }
  //   return await this.client.replaceNamespacedSecret(secretName, namespace, opts.body);
  // }

  async patchSecret(opts: { namespace: string; secretName: string; body: V1Secret }) {
    const namespace = opts.namespace || 'default';
    const secretName = opts.secretName;
    if (secretName == null) {
      throw new Error('secretName 不能为空');
    }
    this.logger.info('patch secret:', secretName, namespace);
    const oldSecret = await this.client.readNamespacedSecret(secretName, namespace);
    const newSecret = _.merge(oldSecret.body, opts.body);
    const res = await this.client.replaceNamespacedSecret(secretName, namespace, newSecret);
    this.logger.info('secret updated');
    return res.body;
  }

  async getIngressList(opts: { namespace: string }) {
    const namespace = opts.namespace || 'default';
    const client = this.kubeconfig.makeApiClient(NetworkingV1Api);
    const res = await client.listNamespacedIngress(namespace);
    this.logger.info('ingress list get:', res.body);
    return res.body;
  }

  // async getIngress(opts: { namespace: string; ingressName: string }) {
  //   const namespace = opts.namespace || 'default';
  //   const ingressName = opts.ingressName;
  //   if (!ingressName) {
  //     throw new Error('ingressName 不能为空');
  //   }
  //   const client = this.kubeconfig.makeApiClient(NetworkingV1Api);
  //   const res = await client.listNamespacedIngress();
  //   return await this.client.apis.extensions.v1beta1.namespaces(namespace).ingresses(ingressName).get();
  // }

  async patchIngress(opts: { namespace: string; ingressName: string; body: V1Ingress }) {
    const namespace = opts.namespace || 'default';
    const ingressName = opts.ingressName;
    if (!ingressName) {
      throw new Error('ingressName 不能为空');
    }
    this.logger.info('patch ingress:', ingressName, namespace);
    const client = this.kubeconfig.makeApiClient(NetworkingV1Api);
    const oldIngress = await client.readNamespacedIngress(ingressName, namespace);
    const newIngress = _.merge(oldIngress.body, opts.body);
    const res = await client.replaceNamespacedIngress(ingressName, namespace, newIngress);
    this.logger.info('ingress patched', opts.body);
    return res;
  }
}
