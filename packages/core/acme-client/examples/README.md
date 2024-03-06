# Disclaimer

These examples should not be used as is for any production environment, as they are just proof of concepts meant for testing and to get you started. The examples are naively written and purposefully avoids important topics since they will be specific to your application and how you choose to use `acme-client`, like for example:

1. **Concurrency control**
    * If implementing on-demand certificate generation
    * What happens when multiple requests hit your domain at the same time?
    * Ensure your application does not place multiple cert orders for the same domain at the same time by implementing some sort of exclusive lock
2. **Domain allow lists**
    * If implementing on-demand certificate generation
    * What happens when someone manipulates the `ServerName` or `Host` header to your service?
    * Ensure your application is unable to place certificate orders for domains you do not intend, as this can quickly rate limit your account and cause a DoS
3. **Clustering**
    * If using `acme-client` across a cluster of servers
    * Ensure challenge responses are known to all servers in your cluster, perhaps using a database or shared storage
4. **Certificate and key storage**
    * Where and how should the account key be stored and read?
    * Where and how should certificates and cert keys be stored and read?
    * How and when should they be renewed?
