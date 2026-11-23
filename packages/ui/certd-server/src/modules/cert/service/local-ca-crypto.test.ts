import assert from "node:assert/strict";
import crypto, { X509Certificate } from "node:crypto";
import { createCrl, createCsr, createIntermediateCa, createRootCa, getX509Summary, issueLeafCertificate, signCsr, validateImportedIntermediateCa, validateImportedRootCa, verifyCertIssuedBy } from "./local-ca-crypto.js";
// @ts-ignore
import * as x509 from "@peculiar/x509";

describe("local-ca-crypto", () => {
  it("生成根CA并可导入校验", async () => {
    const ca = await createRootCa({
      subject: { CN: "Certd Local Root CA", O: "Certd" },
      keyType: "rsa2048",
      validityYears: 10,
    });
    const cert = new X509Certificate(ca.certPem);
    assert.equal(cert.ca, true);
    assert.equal(cert.verify(cert.publicKey), true);
    assert.equal(ca.subjectCn, "Certd Local Root CA");
    assert.equal(ca.keySize, 2048);

    const imported = await validateImportedRootCa({
      certPem: ca.certPem,
      privateKeyPem: ca.privateKeyPem,
    });
    assert.equal(imported.subjectCn, "Certd Local Root CA");
    assert.equal(imported.fingerprintSha256, ca.fingerprintSha256);
    assert.match(imported.privateKeyPem, /BEGIN PRIVATE KEY/);
  });

  it("CSR 签发叶子证书，SAN/链/有效期正确", async () => {
    const ca = await createRootCa({
      subject: { CN: "Certd Test Root CA" },
      keyType: "rsa2048",
      validityYears: 5,
    });
    const { csrPem, privateKeyPem } = await createCsr({
      domains: ["foo.example.com", "*.foo.example.com", "127.0.0.1"],
      keyType: "rsa2048",
    });

    const signed = await signCsr({
      caCertPem: ca.certPem,
      caPrivateKeyPem: ca.privateKeyPem,
      csrPem,
      validityDays: 30,
      crlDistributionPoint: "https://certd.example.com/api/cert/local-ca/crl?id=1",
    });

    const leaf = new X509Certificate(signed.certPem);
    const caCert = new X509Certificate(ca.certPem);
    assert.equal(leaf.verify(caCert.publicKey), true);
    assert.equal(leaf.subject, "CN=foo.example.com");
    assert.match(leaf.issuer, /Certd Test Root CA/);
    assert.match(leaf.subjectAltName, /foo\.example\.com/);
    assert.match(leaf.subjectAltName, /\*\.foo\.example\.com/);
    assert.match(leaf.subjectAltName, /IP Address:127\.0\.0\.1/);
    assert.ok(leaf.checkPrivateKey(crypto.createPrivateKey(privateKeyPem)));
    assert.ok(new Date(leaf.validTo).getTime() <= new Date(caCert.validTo).getTime());
    assert.equal(signed.fullchainPem.split("BEGIN CERTIFICATE").length - 1, 2);

    const x509Leaf = new x509.X509Certificate(signed.certPem);
    assert.ok(
      x509Leaf.extensions.find(ext => ext.type === "2.5.29.31"),
      "叶子证书应包含CRL分发点"
    );

    const summary = getX509Summary(signed.fullchainPem);
    assert.equal(summary.serialNumber, signed.serialNumber);
    assert.equal(summary.ca, false);
    assert.ok(summary.keyUsage.includes("digitalSignature"));
    assert.ok(summary.extKeyUsage.includes("serverAuth"));
    assert.match(summary.signatureAlgorithm, /SHA-256/i);
  });

  it("Root 签发 Intermediate，Intermediate 签发叶子", async () => {
    const root = await createRootCa({
      subject: { CN: "Two Tier Root CA" },
      keyType: "rsa2048",
      validityYears: 10,
    });
    const intermediate = await createIntermediateCa({
      rootCertPem: root.certPem,
      rootPrivateKeyPem: root.privateKeyPem,
      subject: { CN: "Two Tier Intermediate CA" },
      keyType: "rsa2048",
      validityYears: 5,
    });
    const intermediateCert = new X509Certificate(intermediate.certPem);
    const rootCert = new X509Certificate(root.certPem);
    assert.equal(intermediateCert.ca, true);
    assert.equal(intermediateCert.verify(rootCert.publicKey), true);
    assert.ok(new Date(intermediateCert.validTo).getTime() <= new Date(rootCert.validTo).getTime());

    const issued = await issueLeafCertificate({
      caCertPem: intermediate.certPem,
      caPrivateKeyPem: intermediate.privateKeyPem,
      domains: ["two-tier.example.com"],
      keyType: "rsa2048",
      validityDays: 30,
    });
    const leaf = new X509Certificate(issued.certPem);
    assert.equal(leaf.verify(intermediateCert.publicKey), true);
    assert.equal(issued.crt.split("BEGIN CERTIFICATE").length - 1, 2);
  });

  it("支持 ECDSA 根CA、中间CA、叶子和 CRL", async () => {
    const root = await createRootCa({
      subject: { CN: "ECDSA Root CA" },
      keyType: "ecdsa256",
      validityYears: 10,
    });
    const intermediate = await createIntermediateCa({
      rootCertPem: root.certPem,
      rootPrivateKeyPem: root.privateKeyPem,
      subject: { CN: "ECDSA Intermediate CA" },
      keyType: "ecdsa384",
      validityYears: 5,
    });
    const rootCert = new X509Certificate(root.certPem);
    const intermediateCert = new X509Certificate(intermediate.certPem);
    assert.equal(intermediateCert.verify(rootCert.publicKey), true);

    const issued = await issueLeafCertificate({
      caCertPem: intermediate.certPem,
      caPrivateKeyPem: intermediate.privateKeyPem,
      domains: ["ecdsa.example.com"],
      keyType: "ecdsa256",
      validityDays: 30,
    });
    const leaf = new X509Certificate(issued.certPem);
    assert.equal(leaf.verify(intermediateCert.publicKey), true);
    assert.match(leaf.publicKey.asymmetricKeyType || "", /ec/i);
    const summary = getX509Summary(issued.crt);
    assert.ok(summary.keyUsage.includes("digitalSignature"));
    assert.ok(!summary.keyUsage.includes("keyEncipherment"));

    const crl = await createCrl({
      caCertPem: intermediate.certPem,
      caPrivateKeyPem: intermediate.privateKeyPem,
      entries: [{ serialNumber: issued.serialNumber, revokeTime: Date.now() - 1000 }],
    });
    const parsed = new x509.X509Crl(crl.pem);
    assert.ok(parsed.findRevoked(issued.serialNumber));
    const x509Intermediate = new x509.X509Certificate(intermediate.certPem);
    assert.equal(await parsed.verify({ publicKey: x509Intermediate.publicKey }, crypto.webcrypto as any), true);
  });

  it("RSA CA 可以签发 ECDSA 叶子证书", async () => {
    const root = await createRootCa({
      subject: { CN: "Mixed Root CA" },
      keyType: "rsa2048",
      validityYears: 5,
    });
    const intermediate = await createIntermediateCa({
      rootCertPem: root.certPem,
      rootPrivateKeyPem: root.privateKeyPem,
      subject: { CN: "Mixed Intermediate CA" },
      keyType: "rsa2048",
      validityYears: 2,
    });
    const issued = await issueLeafCertificate({
      caCertPem: intermediate.certPem,
      caPrivateKeyPem: intermediate.privateKeyPem,
      domains: ["mixed.example.com"],
      keyType: "ecdsa256",
      validityDays: 30,
    });
    const intermediateCert = new X509Certificate(intermediate.certPem);
    const leaf = new X509Certificate(issued.certPem);
    assert.equal(leaf.verify(intermediateCert.publicKey), true);
    assert.match(leaf.publicKey.asymmetricKeyType || "", /ec/i);
  });

  it("支持导入 ECDSA 根CA和中间CA", async () => {
    const root = await createRootCa({
      subject: { CN: "Imported ECDSA Root" },
      keyType: "ecdsa256",
      validityYears: 10,
    });
    const importedRoot = await validateImportedRootCa({ certPem: root.certPem, privateKeyPem: root.privateKeyPem });
    assert.equal(importedRoot.keyType, "ecdsa256");

    const intermediate = await createIntermediateCa({
      rootCertPem: root.certPem,
      rootPrivateKeyPem: root.privateKeyPem,
      subject: { CN: "Imported ECDSA Intermediate" },
      keyType: "ecdsa384",
      validityYears: 5,
    });
    const importedIntermediate = await validateImportedIntermediateCa({
      certPem: intermediate.certPem,
      privateKeyPem: intermediate.privateKeyPem,
      parentCertPem: root.certPem,
    });
    assert.equal(importedIntermediate.keyType, "ecdsa384");
    assert.equal(importedIntermediate.pathLength, 0);
  });

  it("普通叶子证书不能伪装成中间CA导入", async () => {
    const root = await createRootCa({
      subject: { CN: "Leaf Guard Root" },
      keyType: "rsa2048",
      validityYears: 2,
    });
    const leaf = await issueLeafCertificate({
      caCertPem: root.certPem,
      caPrivateKeyPem: root.privateKeyPem,
      domains: ["leaf.example.com"],
      keyType: "rsa2048",
      validityDays: 30,
    });

    await assert.rejects(
      () =>
        validateImportedIntermediateCa({
          certPem: leaf.certPem,
          privateKeyPem: leaf.key,
          parentCertPem: root.certPem,
        }),
      /不是CA证书/
    );
  });

  it("只认签发该证书的CA，拒绝其他CA或自造证书", async () => {
    const root = await createRootCa({ subject: { CN: "Revoke Root" }, keyType: "rsa2048", validityYears: 2 });
    const intermediate = await createIntermediateCa({
      rootCertPem: root.certPem,
      rootPrivateKeyPem: root.privateKeyPem,
      subject: { CN: "Revoke Intermediate" },
      keyType: "rsa2048",
      validityYears: 1,
    });
    const leaf = await issueLeafCertificate({
      caCertPem: intermediate.certPem,
      caPrivateKeyPem: intermediate.privateKeyPem,
      domains: ["revoke.example.com"],
      keyType: "rsa2048",
    });
    const other = await createRootCa({ subject: { CN: "Other Root" }, keyType: "rsa2048", validityYears: 1 });

    assert.equal(verifyCertIssuedBy(leaf.certPem, intermediate.certPem), true);
    assert.equal(verifyCertIssuedBy(leaf.certPem, other.certPem), false);
    assert.equal(verifyCertIssuedBy(other.certPem, intermediate.certPem), false);
    assert.equal(verifyCertIssuedBy("not-a-cert", intermediate.certPem), false);
  });

  it("生成CRL并包含已吊销序列号", async () => {
    const ca = await createRootCa({
      subject: { CN: "CRL Root CA" },
      keyType: "rsa2048",
      validityYears: 5,
    });
    const { csrPem } = await createCsr({ domains: ["crl.example.com"], keyType: "rsa2048" });
    const signed = await signCsr({
      caCertPem: ca.certPem,
      caPrivateKeyPem: ca.privateKeyPem,
      csrPem,
      validityDays: 30,
    });
    const crl = await createCrl({
      caCertPem: ca.certPem,
      caPrivateKeyPem: ca.privateKeyPem,
      entries: [{ serialNumber: signed.serialNumber, revokeTime: Date.now() - 60_000, reason: "keyCompromise" }],
    });
    assert.match(crl.pem, /BEGIN X509 CRL/);
    assert.ok(crl.der.length > 0);

    const parsed = new x509.X509Crl(crl.pem);
    const revoked = parsed.findRevoked(signed.serialNumber);
    assert.ok(revoked);
    assert.equal(revoked.reason, x509.X509CrlReason.keyCompromise);
    const verified = await parsed.verify({ publicKey: new x509.X509Certificate(ca.certPem).publicKey }, crypto.webcrypto as any);
    assert.equal(verified, true);
  });

  it("有效期参数裁剪到合法范围", async () => {
    const ca = await createRootCa({
      subject: { CN: "Validity Root CA" },
      keyType: "rsa2048",
      validityYears: 1,
    });
    const { csrPem } = await createCsr({ domains: ["validity.example.com"], keyType: "rsa2048" });
    const sign = async (validityDays: number, maxValidityDays?: number) => {
      const signed = await signCsr({
        caCertPem: ca.certPem,
        caPrivateKeyPem: ca.privateKeyPem,
        csrPem,
        validityDays,
        maxValidityDays,
      });
      return new X509Certificate(signed.certPem);
    };

    const now = Date.now();
    const defaultDays = await sign(0);
    assert.ok(new Date(defaultDays.validTo).getTime() - now > 89 * 86400000);
    assert.ok(new Date(defaultDays.validTo).getTime() - now < 91 * 86400000);

    const oneDay = await sign(-5);
    assert.ok(new Date(oneDay.validTo).getTime() - now > 0);
    assert.ok(new Date(oneDay.validTo).getTime() - now < 2 * 86400000);

    const capped = await sign(30, 5);
    assert.ok(new Date(capped.validTo).getTime() - now <= 6 * 86400000);

    const huge = await sign(1e9);
    assert.ok(new Date(huge.validTo).getTime() <= ca.notAfter - 86400000 + 5 * 60 * 1000);

    for (const cert of [defaultDays, oneDay, capped, huge]) {
      assert.ok(new Date(cert.validFrom).getTime() <= Date.now());
      assert.ok(new Date(cert.validTo).getTime() > Date.now());
    }
  });

  it("允许域名白名单会拒绝越界域名", async () => {
    const ca = await createRootCa({
      subject: { CN: "Restricted Root CA" },
      keyType: "rsa2048",
      validityYears: 1,
    });
    const { csrPem } = await createCsr({ domains: ["evil.example.net"], keyType: "rsa2048" });
    await assert.rejects(
      () =>
        signCsr({
          caCertPem: ca.certPem,
          caPrivateKeyPem: ca.privateKeyPem,
          csrPem,
          allowedDomains: ["example.com"],
        }),
      /不在该CA允许签发的范围内/
    );
  });

  it("issueLeafCertificate 返回匹配的证书和私钥", async () => {
    const ca = await createRootCa({
      subject: { CN: "Issue Root CA" },
      keyType: "rsa2048",
      validityYears: 1,
    });
    const issued = await issueLeafCertificate({
      caCertPem: ca.certPem,
      caPrivateKeyPem: ca.privateKeyPem,
      domains: ["internal.example.com"],
      keyType: "rsa2048",
      validityDays: 7,
    });
    const leaf = new X509Certificate(issued.certPem);
    assert.ok(leaf.checkPrivateKey(crypto.createPrivateKey(issued.key)));
    assert.match(issued.crt, /BEGIN CERTIFICATE/);
    assert.ok(issued.notAfter > Date.now());
  });

  it("私钥与证书不匹配时导入失败", async () => {
    const ca1 = await createRootCa({ subject: { CN: "Root A" }, keyType: "rsa2048", validityYears: 1 });
    const ca2 = await createRootCa({ subject: { CN: "Root B" }, keyType: "rsa2048", validityYears: 1 });
    await assert.rejects(() => validateImportedRootCa({ certPem: ca1.certPem, privateKeyPem: ca2.privateKeyPem }), /不匹配/);
  });
});
