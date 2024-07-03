import { dict } from "@fast-crud/fast-crud";

export const Dicts = {
  sslProviderDict: dict({
    data: [
      { value: "letsencrypt", label: "Let‘s Encrypt" },
      { value: "zerossl", label: "ZeroSSL" }
    ]
  }),
  challengeTypeDict: dict({ data: [{ value: "dns", label: "DNS校验" }] }),
  dnsProviderTypeDict: dict({
    url: "pi/dnsProvider/dnsProviderTypeDict"
  })
};
