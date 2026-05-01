/// <reference types="mocha" />
/// <reference types="node" />

import assert from "node:assert/strict";

import { Constants } from "./constants.js";
import { ParamException } from "./exception/param-exception.js";
import { Result } from "./result.js";

describe("lib-server basic helpers", () => {
  it("builds success and error results", () => {
    const success = Result.success("ok", { id: 1 });
    assert.ok(success instanceof Result);
    assert.equal(success.code, 0);
    assert.equal(success.message, "ok");
    assert.deepEqual(success.data, { id: 1 });

    const error = Result.error(400, "bad request");
    assert.ok(error instanceof Result);
    assert.equal(error.code, 400);
    assert.equal(error.message, "bad request");
    assert.equal(error.data, undefined);
  });

  it("uses default param exception metadata", () => {
    const error = new ParamException(undefined);

    assert.equal(error.name, "ParamException");
    assert.equal(error.code, Constants.res.param.code);
    assert.equal(error.message, Constants.res.param.message);
  });
});
