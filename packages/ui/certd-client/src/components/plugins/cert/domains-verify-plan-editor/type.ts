import { CnameRecord } from "@certd/pipeline";

export type DomainVerifyPlanInput = {
  domain: string;
  type: "cname" | "dns";
  dnsProviderType?: string;
  dnsProviderAccessId?: number;
  cnameVerifyPlan?: Record<string, CnameRecord>;
};
export type DomainsVerifyPlanInput = {
  [key: string]: DomainVerifyPlanInput;
};
