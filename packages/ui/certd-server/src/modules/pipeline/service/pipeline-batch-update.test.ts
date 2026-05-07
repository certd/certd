import assert from "node:assert/strict";
import { updateCertApplyStepInputs } from "./pipeline-batch-update.js";

describe("pipeline batch update", () => {
  it("updates only cert apply step inputs", () => {
    const pipeline: any = {
      stages: [
        {
          tasks: [
            {
              steps: [
                {
                  type: "CertApply",
                  input: {
                    renewDays: 20,
                    privateKeyType: "rsa_2048",
                    domains: ["example.com"],
                  },
                },
                {
                  type: "DeployToHost",
                  input: {
                    renewDays: 1,
                    privateKeyType: "rsa_1024",
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    const count = updateCertApplyStepInputs(pipeline, {
      renewDays: 10,
      privateKeyType: "ec_256",
    });

    assert.equal(count, 1);
    assert.deepEqual(pipeline.stages[0].tasks[0].steps[0].input, {
      renewDays: 10,
      privateKeyType: "ec_256",
      domains: ["example.com"],
    });
    assert.deepEqual(pipeline.stages[0].tasks[0].steps[1].input, {
      renewDays: 1,
      privateKeyType: "rsa_1024",
    });
  });

  it("does not overwrite fields omitted from the patch", () => {
    const pipeline: any = {
      stages: [
        {
          tasks: [
            {
              steps: [
                {
                  type: "CertApply",
                  input: {
                    renewDays: 20,
                    privateKeyType: "ec_256",
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    updateCertApplyStepInputs(pipeline, {
      renewDays: 15,
    });

    assert.deepEqual(pipeline.stages[0].tasks[0].steps[0].input, {
      renewDays: 15,
      privateKeyType: "ec_256",
    });
  });

  it("updates uploaded cert pipelines only for fields defined by the plugin", () => {
    const pipeline: any = {
      stages: [
        {
          tasks: [
            {
              steps: [
                {
                  type: "CertApplyUpload",
                  input: {
                    renewDays: 20,
                  },
                },
                {
                  type: "CertApply",
                  input: {
                    renewDays: 20,
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    const inputDefines: Record<string, Record<string, unknown>> = {
      CertApplyUpload: {
        renewDays: {},
      },
      CertApply: {
        renewDays: {},
        privateKeyType: {},
      },
    };

    assert.equal(updateCertApplyStepInputs(pipeline, {}, stepType => inputDefines[stepType]), 0);
    assert.equal(
      updateCertApplyStepInputs(
        pipeline,
        {
          renewDays: 12,
          privateKeyType: "ec_256",
        },
        stepType => inputDefines[stepType]
      ),
      2
    );
    assert.deepEqual(pipeline.stages[0].tasks[0].steps[0].input, {
      renewDays: 12,
    });
    assert.deepEqual(pipeline.stages[0].tasks[0].steps[1].input, {
      renewDays: 12,
      privateKeyType: "ec_256",
    });
  });

  it("skips lego cert apply steps", () => {
    const pipeline: any = {
      stages: [
        {
          tasks: [
            {
              steps: [
                {
                  type: "CertApplyLego",
                  input: {
                    renewDays: 20,
                    privateKeyType: "ec256",
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    assert.equal(updateCertApplyStepInputs(pipeline, { renewDays: 12, privateKeyType: "ec_256" }), 0);
    assert.deepEqual(pipeline.stages[0].tasks[0].steps[0].input, {
      renewDays: 20,
      privateKeyType: "ec256",
    });
  });
});
