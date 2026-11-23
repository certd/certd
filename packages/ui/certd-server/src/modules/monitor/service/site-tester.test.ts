import assert from "node:assert/strict";
import { collectCertificateChain, summarizeCertificateChain } from "./site-tester.js";

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
});
