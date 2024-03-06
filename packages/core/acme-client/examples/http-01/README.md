# http-01

The `http-01` challenge type is the simplest to implement and should likely be your default choice, unless you either require wildcard certificates or if port 80 is unavailable for use.

## How it works

When solving `http-01` challenges, you prove ownership of a domain name by serving a specific payload from a specific URL. The ACME authority provides the client with a token that is used to generate the URL and file contents. The file must exist at `http://$YOUR_DOMAIN/.well-known/acme-challenge/$TOKEN` and contain the token and a thumbprint of your account key.

Once the order is finalized, the ACME authority will verify that the URL responds with the correct payload by sending HTTP requests before the challenge is valid. HTTP redirects are followed, and Let's Encrypt allows redirecting to HTTPS although this diverges from the ACME spec.

## Pros and cons

* Challenge must be satisfied using port 80 (HTTP)
* The simplest challenge type to implement
* Can not be used to issue wildcard certificates
* If using multiple web servers, all of them need to respond with the correct token

## External links

* [https://letsencrypt.org/docs/challenge-types/#http-01-challenge](https://letsencrypt.org/docs/challenge-types/#http-01-challenge)
* [https://datatracker.ietf.org/doc/html/rfc8555#section-8.3](https://datatracker.ietf.org/doc/html/rfc8555#section-8.3)
