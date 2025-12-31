import { IAccess } from "../access/index.js";

export type CnameProvider = {
  id: any;
  domain: string;
  title?: string;
  dnsProviderType?: string;
  access?: IAccess;
  accessId?: any;
};

export type CnameRecord = {
  id: any;
  domain: string;
  hostRecord: string;
  recordValue: string;
  cnameProvider: CnameProvider;
  status: string;
  commonDnsProvider?: any;
  mainDomain?: string;
};

export type ICnameProxyService = {
  getByDomain: (domain: string) => Promise<CnameRecord>;
};
