export type CnameProvider = {
  id: any;
  domain: string;
  dnsProviderType: string;
  accessId: any;
};
export type CnameRecord = {
  id: any;
  domain: string;
  hostRecord: string;
  recordValue: string;
  cnameProvider: CnameProvider;
  status: string;
};
export type ICnameProxyService = {
  getByDomain: (domain: string) => Promise<CnameRecord>;
};
