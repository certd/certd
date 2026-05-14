#!/usr/bin/env node

const { CertdClient } = require("./certd-client");

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function boolEnv(name, defaultValue = false) {
  const value = process.env[name];
  if (value == null || value === "") {
    return defaultValue;
  }
  return ["1", "true", "yes", "y"].includes(value.toLowerCase());
}

async function main() {
  const client = new CertdClient(requireEnv("CERTD_KEY_ID"), requireEnv("CERTD_KEY_SECRET"), {
    baseUrl: process.env.CERTD_BASE_URL,
    encrypt: boolEnv("CERTD_ENCRYPT"),
  });

  const params = {
    autoApply: boolEnv("CERTD_AUTO_APPLY"),
  };
  if (process.env.CERTD_CERT_ID) {
    params.certId = Number(process.env.CERTD_CERT_ID);
    if (!Number.isInteger(params.certId) || params.certId <= 0) {
      throw new Error("CERTD_CERT_ID must be a positive integer");
    }
  }
  if (process.env.CERTD_DOMAINS) {
    params.domains = process.env.CERTD_DOMAINS;
  }
  if (process.env.CERTD_FORMAT) {
    params.format = process.env.CERTD_FORMAT;
  }
  if (!params.certId && !params.domains) {
    throw new Error("Set CERTD_CERT_ID or CERTD_DOMAINS");
  }

  console.log(await client.getCert(params));
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
