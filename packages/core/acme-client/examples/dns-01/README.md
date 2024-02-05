# dns-01

The greatest benefit of `dns-01` is that it is the only challenge type that can be used to issue ACME wildcard certificates, however it also has a few downsides. Your DNS provider needs to offer some sort of API you can use to automate adding and removing the required `TXT` DNS records. Additionally, solving DNS challenges will be much slower than the other challenge types because of DNS propagation delays.

## How it works

When solving `dns-01` challenges, you prove ownership of a domain by serving a specific payload within a specific DNS `TXT` record from the domains authoritative nameservers. The ACME authority provides the client with a token that, along with a thumbprint of your account key, is used to generate a `base64url` encoded `SHA256` digest. This payload is then placed as a `TXT` record under DNS name `_acme-challenge.$YOUR_DOMAIN`.

Once the order is finalized, the ACME authority will lookup your domains DNS record to verify that the payload is correct. `CNAME` and `NS` records are followed, should you wish to delegate challenge response to another DNS zone or record.

## Pros and cons

* Only challenge type that can be used to issue wildcard certificates
* Your DNS provider needs to supply an API that can be used
* DNS propagation time may be slow
* Useful in instances where both port 80 and 443 are unavailable

## External links

* [https://letsencrypt.org/docs/challenge-types/#dns-01-challenge](https://letsencrypt.org/docs/challenge-types/#dns-01-challenge)
* [https://datatracker.ietf.org/doc/html/rfc8555#section-8.4](https://datatracker.ietf.org/doc/html/rfc8555#section-8.4)
