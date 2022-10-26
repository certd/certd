import { Registry } from "../registry";
import { AbstractDnsProvider } from "./abstract-dns-provider";

// @ts-ignore
export const dnsProviderRegistry = new Registry<typeof AbstractDnsProvider>();
