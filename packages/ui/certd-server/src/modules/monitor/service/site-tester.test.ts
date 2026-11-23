import assert from "node:assert/strict";
import https from "node:https";
// @ts-ignore
import forge from "node-forge";
import { collectCertificateChain, siteTester, summarizeCertificateChain } from "./site-tester.js";

function createTestCertificate() {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "0A0B0C";
  cert.validFrom = new Date(Date.now() - 86400000).toISOString();
  cert.validTo = new Date(Date.now() + 86400000).toISOString();
  const attrs = [
    { name: "commonName", value: "chain.example.com" },
    { name: "organizationName", value: "Chain Org" },
    { name: "organizationalUnitName", value: "PKI" },
    { name: "countryName", value: "CN" },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());
  return {
    certPem: forge.pki.certificateToPem(cert),
    keyPem: forge.pki.privateKeyToPem(keys.privateKey),
    der: Buffer.from(forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).getBytes(), "binary"),
  };
}

function mockCert(cn: string, issuerCn: string, fingerprint: string) {
  return {
    subject: { CN: cn, O: "Test Org" },
    issuer: { CN: issuerCn, O: "Test Org" },
    valid_from: "2026-01-01T00:00:00Z",
    valid_to: "2027-01-01T00:00:00Z",
    serialNumber: fingerprint,
    fingerprint256: fingerprint,
    issuerCertificate: undefined as any,
  } as any;
}

describe("site certificate chain", () => {
  it("从TLS peer证书提取叶证书到根证书的链", () => {
    const root = mockCert("Root CA", "Root CA", "AA:BB:CC");
    const intermediate = mockCert("Intermediate CA", "Root CA", "DD:EE:FF");
    const leaf = mockCert("example.com", "Intermediate CA", "11:22:33");
    intermediate.issuerCertificate = root;
    leaf.issuerCertificate = intermediate;

    const chain = collectCertificateChain(leaf);
    assert.equal(chain.length, 3);
    assert.equal(chain[0].subject.CN, "example.com");
    assert.equal(chain[2].subject.CN, "Root CA");

    const summary = summarizeCertificateChain(chain);
    assert.equal(summary[0].subject, "CN=example.com, O=Test Org");
    assert.equal(summary[0].issuer, "CN=Intermediate CA, O=Test Org");
    assert.equal(summary[0].fingerprintSha256, "112233");
    assert.ok(summary[0].validTo);
  });

  it("自签名链不会无限循环", () => {
    const root = mockCert("Self Root", "Self Root", "AB:CD");
    root.issuerCertificate = root;
    const chain = collectCertificateChain(root);
    assert.equal(chain.length, 1);
  });

  it("没有证书时返回空链", () => {
    assert.deepEqual(collectCertificateChain(null), []);
  });

  it("使用真实DER证书解析Subject、Issuer、序列号和SHA-256指纹", () => {
    const { der } = createTestCertificate();
    const summary = summarizeCertificateChain([{ subject: {}, issuer: {}, raw: der } as any])[0];
    assert.match(summary.subject, /CN=chain\.example\.com/);
    assert.match(summary.subject, /O=Chain Org/);
    assert.match(summary.issuer, /CN=chain\.example\.com/);
    assert.equal(String(summary.serialNumber).toUpperCase(), "0A0B0C");
    assert.equal(summary.fingerprintSha256?.length, 64);
    assert.equal(summary.ca, false);
  });

  it("无效DER数据回退到PeerCertificate字段", () => {
    const summary = summarizeCertificateChain([{ subject: { CN: "Fallback", O: "Org", C: "CN" }, issuer: { CN: "Issuer" }, raw: Buffer.from("invalid") } as any])[0];
    assert.equal(summary.subject, "CN=Fallback, O=Org, C=CN");
    assert.equal(summary.issuer, "CN=Issuer");
    assert.equal(summary.ca, undefined);
  });

  it("真实TLS握手可以取得服务器提供的证书链", async () => {
    const { certPem, keyPem } = createTestCertificate();
    const server = https.createServer({ key: keyPem, cert: certPem }, (req, res) => res.end("ok"));
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", () => resolve()));
    try {
      const port = (server.address() as any).port;
      const result = await siteTester.test({ host: "127.0.0.1", port, retryTimes: 0 });
      assert.ok(result.chain?.length);
      const summary = summarizeCertificateChain(result.chain!);
      assert.match(summary[0].subject, /CN=chain\.example\.com/);
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });

});
