# tls-alpn-01

Responding to `tls-alpn-01` challenges using Node.js is a bit more involved than the other two challenge types, and requires a proxy (f.ex. [Nginx](https://nginx.org) or [HAProxy](https://www.haproxy.org)) in front of the Node.js service. The reason for this is that `tls-alpn-01` is solved by responding to the ACME challenge using self-signed certificates with an ALPN extension containing the challenge response.

Since we don't want users of our application to be served with these self-signed certificates, we need to split the HTTPS traffic into two different Node.js backends - one that only serves ALPN certificates for challenge responses, and the other for actual end-user traffic that serves certificates retrieved from the ACME provider. As far as I *(library author)* know, routing HTTPS traffic based on ALPN protocol can not be done purely using Node.js.

The end result should look something like this:

```text
Nginx or HAProxy (0.0.0.0:443)
    *inspect requests SSL ALPN protocol*
        If ALPN == acme-tls/1
            -> Node.js ALPN responder (127.0.0.1:4444)
        Else
            -> Node.js HTTPS server (127.0.0.1:4443)
```

Example proxy configuration:

* [haproxy.cfg](haproxy.cfg) *(requires HAProxy >= v1.9.1)*
* [nginx.conf](nginx.conf) *(requires [ngx_stream_ssl_preread_module](https://nginx.org/en/docs/stream/ngx_stream_ssl_preread_module.html))*

Big thanks to [acme.sh](https://github.com/acmesh-official/acme.sh) and [dehydrated](https://github.com/dehydrated-io/dehydrated) for doing the legwork and providing Nginx and HAProxy config examples.

## How it works

When solving `tls-alpn-01` challenges, you prove ownership of a domain name by serving a specially crafted certificate over HTTPS. The ACME authority provides the client with a token that is placed into the certificates `id-pe-acmeIdentifier` extension along with a thumbprint of your account key.

Once the order is finalized, the ACME authority will verify by sending HTTPS requests to your domain with the `acme-tls/1` ALPN protocol, indicating to the server that it should serve the challenge response certificate. If the `id-pe-acmeIdentifier` extension contains the correct payload, the challenge is valid.

## Pros and cons

* Challenge must be satisfied using port 443 (HTTPS)
* Useful in instances where port 80 is unavailable
* Can not be used to issue wildcard certificates
* More complex than `http-01`, can not be solved purely using Node.js
* If using multiple web servers, all of them need to respond with the correct certificate

## External links

* [https://letsencrypt.org/docs/challenge-types/#tls-alpn-01](https://letsencrypt.org/docs/challenge-types/#tls-alpn-01)
* [https://github.com/dehydrated-io/dehydrated/blob/master/docs/tls-alpn.md](https://github.com/dehydrated-io/dehydrated/blob/master/docs/tls-alpn.md)
* [https://github.com/acmesh-official/acme.sh/wiki/TLS-ALPN-without-downtime](https://github.com/acmesh-official/acme.sh/wiki/TLS-ALPN-without-downtime)
* [https://datatracker.ietf.org/doc/html/rfc8737](https://datatracker.ietf.org/doc/html/rfc8737)
