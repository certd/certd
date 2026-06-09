import { CnameRecord } from "@certd/pipeline";

export type HttpRecord = {
  domain: string;
  httpUploaderType: string;
  httpUploaderAccess: number;
  httpUploadRootDir: string;
};

export type DnsPersistRecord = {
  id?: number;
  domain: string;
  mainDomain?: string;
  status?: string;
  hostRecord?: string;
  recordValue?: string;
  caType?: string;
  acmeAccountAccessId?: number;
  accountUri?: string;
  wildcard?: boolean;
  persistUntil?: number;
  dnsProviderType?: string;
  dnsProviderAccess?: number;
};

export type DomainVerifyPlanInput = {
  domain: string;
  domains: string[];
  type: "cname" | "dns" | "http" | "dns-persist";
  dnsProviderType?: string;
  dnsProviderAccessType?: string;
  dnsProviderAccessId?: number;
  cnameVerifyPlan?: Record<string, CnameRecord>;
  httpVerifyPlan?: Record<string, HttpRecord>;
  dnsPersistVerifyPlan?: Record<string, DnsPersistRecord>;
};
export type DomainsVerifyPlanInput = {
  [key: string]: DomainVerifyPlanInput;
};
