import { Registry } from "../registry";
import { AbstractDnsProvider } from "./abstract-dns-provider";

export const dnsProviderRegistry = new Registry<typeof AbstractDnsProvider>();
