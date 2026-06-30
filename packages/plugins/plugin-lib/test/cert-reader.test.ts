/// <reference types="mocha" />
/// <reference types="node" />

import assert from "node:assert/strict";

import { CertReader } from "../src/cert/cert-reader.js";
import type { CertInfo } from "../src/cert/cert-reader.js";

// @ts-ignore
import forge from "node-forge";

/**
 * Generate a minimal self-signed X.509 cert + key in PEM format for testing.
 */
function createSelfSignedCert(commonName: string): { crt: string; key: string } {
  const keypair = forge.pki.rsa.generateKeyPair(2048);

  const cert = forge.pki.createCertificate();
  cert.publicKey = keypair.publicKey;
  cert.serialNumber = "01";
  cert.validFrom = new Date("2025-01-01").toISOString();
  cert.validTo = new Date("2026-01-01").toISOString();

  const attrs = [{ name: "commonName", value: commonName }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keypair.privateKey, forge.md.sha256.create());

  return {
    crt: forge.pki.certificateToPem(cert),
    key: forge.pki.privateKeyToPem(keypair.privateKey),
  };
}

const testCert = createSelfSignedCert("example.com");
const testCertIc = createSelfSignedCert("intermediate.ca");
const mockCertInfo: CertInfo = {
  crt: testCert.crt + "\n" + testCertIc.crt,
  key: testCert.key,
  oc: testCert.crt,
  ic: testCertIc.crt,
  one: testCert.crt + "\n" + testCert.key,
  p7b: "PKCS7 test content",
  pfx: Buffer.from("fake-pfx-data").toString("base64"),
  der: Buffer.from("fake-der-data").toString("base64"),
  jks: Buffer.from("fake-jks-data").toString("base64"),
};

describe("CertReader.buildZip", () => {
  it("returns a non-empty Buffer", async () => {
    const reader = new CertReader(mockCertInfo);
    const buf = await reader.buildZip();
    assert.ok(Buffer.isBuffer(buf));
    assert.ok(buf.length > 0);
  });

  it("produces a valid zip containing expected files", async () => {
    const reader = new CertReader(mockCertInfo);
    const buf = await reader.buildZip();
    const { default: JSZip } = await import("jszip");
    const zip = await JSZip.loadAsync(buf);

    assert.ok(zip.file("证书.pem"), "should contain 证书.pem");
    assert.ok(zip.file("私钥.pem"), "should contain 私钥.pem");
    assert.ok(zip.file("中间证书.pem"), "should contain 中间证书.pem");
    assert.ok(zip.file("cert.crt"), "should contain cert.crt");
    assert.ok(zip.file("cert.key"), "should contain cert.key");
    assert.ok(zip.file("intermediate.crt"), "should contain intermediate.crt");
    assert.ok(zip.file("origin.crt"), "should contain origin.crt");
    assert.ok(zip.file("one.pem"), "should contain one.pem");
    assert.ok(zip.file("cert.p7b"), "should contain cert.p7b");
    assert.ok(zip.file("cert.pfx"), "should contain cert.pfx");
    assert.ok(zip.file("cert.der"), "should contain cert.der");
    assert.ok(zip.file("cert.jks"), "should contain cert.jks");
    assert.ok(zip.file("说明.txt"), "should contain 说明.txt");

    const pemContent = await zip.file("证书.pem").async("string");
    assert.ok(pemContent.includes("-----BEGIN CERTIFICATE-----"));

    const pfx = await zip.file("cert.pfx").async("nodebuffer");
    assert.equal(pfx.toString(), "fake-pfx-data");
  });
});

describe("CertReader.buildZipFilename", () => {
  it("includes the main domain and timestamp", () => {
    const reader = new CertReader(mockCertInfo);
    const name = reader.buildZipFilename("cert");
    assert.ok(name.startsWith("cert_example_com_"));
    assert.ok(name.endsWith(".zip"));
    const tsPart = name.replace("cert_example_com_", "").replace(".zip", "");
    assert.match(tsPart, /^\d{14}$/);
  });

  it("uses the default prefix when not provided", () => {
    const reader = new CertReader(mockCertInfo);
    const name = reader.buildZipFilename();
    assert.ok(name.startsWith("cert_example_com_"));
  });

  it("wildcard domain replaces asterisk", () => {
    const wildcardCert = createSelfSignedCert("*.example.com");
    const wcInfo: CertInfo = { crt: wildcardCert.crt, key: wildcardCert.key };
    const reader = new CertReader(wcInfo);
    const name = reader.buildZipFilename("cert");
    assert.ok(name.startsWith("cert___example_com_"), "asterisk should be replaced, got: " + name);
    assert.ok(!name.includes("*"));
  });
});