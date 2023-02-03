import { dict } from "@fast-crud/fast-crud";

export const Dicts = {
  certIssuerDict: dict({ data: [{ value: "letencrypt", label: "LetEncrypt" }] }),
  challengeTypeDict: dict({ data: [{ value: "dns", label: "DNS校验" }] }),
  dnsProviderTypeDict: dict({
    url: "pi/dnsProvider/dnsProviderTypeDict"
  })
};
