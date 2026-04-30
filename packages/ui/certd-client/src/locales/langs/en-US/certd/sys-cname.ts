export default {
  cnameTitle: "CNAME Service Configuration",
  cnameDescription:
            "The domain name configured here serves as a proxy for verifying other domains. When other domains apply for certificates, they map to this domain via CNAME for ownership verification. The advantage is that any domain can apply for a certificate this way without providing an AccessSecret.",
  cnameLinkText: "CNAME principle and usage instructions",
  cnameDomain: "CNAME Domain",
  cnameDomainPlaceholder: "cname.handsfree.work",
  cnameDomainHelper:
            "Requires a domain registered with a DNS provider on the right (or you can transfer other domain DNS servers here).\nOnce the CNAME domain is set, it cannot be changed. It is recommended to use a first-level subdomain.",
  cnameDomainPattern: "Domain name cannot contain *",
  dnsProvider: "DNS Provider",
  dnsProviderAuthorization: "DNS Provider Authorization",
};
