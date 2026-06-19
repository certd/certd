import assert from "assert";
import { NpmRegistryResolver } from "./npm-registry-resolver.js";

describe("NpmRegistryResolver", () => {
  it("chooses the fastest successful registry in auto mode", async () => {
    const resolver = new NpmRegistryResolver();
    resolver.config = {
      mode: "auto",
      fixedUrl: "",
      candidates: ["https://slow.example.com", "https://fast.example.com"],
      probeTimeoutMs: 100,
      cacheTtlMs: 1000,
    };
    resolver.probe = async registryUrl => {
      return {
        registryUrl,
        ok: true,
        elapsedMs: registryUrl.includes("fast") ? 10 : 50,
      };
    };

    const result = await resolver.resolve();

    assert.equal(result, "https://fast.example.com");
  });

  it("uses fixed registry without probing", async () => {
    const resolver = new NpmRegistryResolver();
    resolver.config = {
      mode: "fixed",
      fixedUrl: "https://registry.example.com",
      candidates: [],
      probeTimeoutMs: 100,
      cacheTtlMs: 1000,
    };

    const result = await resolver.resolve();

    assert.equal(result, "https://registry.example.com");
  });
});
