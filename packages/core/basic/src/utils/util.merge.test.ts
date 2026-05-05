/// <reference types="mocha" />

import { expect } from "chai";

import { mergeUtils, UnMergeable } from "./util.merge.js";

describe("mergeUtils", () => {
  describe("merge", () => {
    it("deep merges plain objects", () => {
      const target = { acme: { email: "admin@example.com" }, deploy: { retries: 1 } };

      const result = mergeUtils.merge(target, { acme: { dnsProvider: "cloudflare" } });

      expect(result).to.equal(target);
      expect(result).to.deep.equal({
        acme: { email: "admin@example.com", dnsProvider: "cloudflare" },
        deploy: { retries: 1 },
      });
    });

    it("replaces arrays instead of merging them by index", () => {
      const result = mergeUtils.merge({ domains: ["old.example.com", "legacy.example.com"] }, { domains: ["new.example.com"] });

      expect(result).to.deep.equal({ domains: ["new.example.com"] });
    });

    it("allows null to clear nested values", () => {
      const result = mergeUtils.merge({ cert: { name: "certd" } }, { cert: null });

      expect(result).to.deep.equal({ cert: null });
    });

    it("keeps undefined sources from overwriting existing nested values", () => {
      const result = mergeUtils.merge({ cert: { name: "certd" } }, { cert: undefined });

      expect(result).to.deep.equal({ cert: { name: "certd" } });
    });

    it("returns an UnMergeable source directly when it is merged at the top level", () => {
      const source = new UnMergeable();

      const result = mergeUtils.merge({ enabled: true }, source);

      expect(result).to.equal(source);
    });

    it("replaces nested values marked as UnMergeable", () => {
      const source = new UnMergeable();

      const result = mergeUtils.merge({ plugin: { enabled: true } }, { plugin: source });

      expect(result.plugin).to.equal(source);
    });
  });

  describe("cloneDeep", () => {
    it("deep clones plain values", () => {
      const source = { acme: { email: "admin@example.com" }, domains: ["example.com"] };

      const result = mergeUtils.cloneDeep(source);

      expect(result).to.deep.equal(source);
      expect(result).not.to.equal(source);
      expect(result.acme).not.to.equal(source.acme);
      expect(result.domains).not.to.equal(source.domains);
    });

    it("preserves references marked as not cloneable", () => {
      const uncloneable = new UnMergeable();
      const source = { plugin: uncloneable };

      const result = mergeUtils.cloneDeep(source);

      expect(result).not.to.equal(source);
      expect(result.plugin).to.equal(uncloneable);
    });
  });
});
