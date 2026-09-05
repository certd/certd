import assert from "node:assert/strict";
import esmock from "esmock";

async function createAwsClient(records: any[]) {
  const sentChanges: any[] = [];

  class ListResourceRecordSetsCommand {
    constructor(readonly input: any) {}
  }

  class ChangeResourceRecordSetsCommand {
    constructor(readonly input: any) {}
  }

  class Route53Client {
    async send(command: any) {
      if (command instanceof ListResourceRecordSetsCommand) {
        return { ResourceRecordSets: records };
      }
      sentChanges.push(command.input);
      return {};
    }
  }

  const { AwsClient } = await esmock("./aws-client.js", {
    "@certd/basic": { utils: { sleep: async () => {} } },
  });
  const client = new AwsClient({
    access: {
      accessKeyId: "key",
      secretAccessKey: "secret",
      importRuntime: async () => ({
        Route53Client,
        ListResourceRecordSetsCommand,
        ChangeResourceRecordSetsCommand,
      }),
    } as any,
    logger: { info() {}, warn() {}, error() {} } as any,
    region: "us-east-1",
  });
  return { client, sentChanges };
}

describe("AwsClient.route53ChangeRecord", () => {
  it("keeps an existing TXT challenge when adding a wildcard challenge", async () => {
    const { client, sentChanges } = await createAwsClient([
      {
        Name: "_acme-challenge.example.com.",
        Type: "TXT",
        TTL: 300,
        ResourceRecords: [{ Value: '"apex-token"' }],
      },
    ]);

    await client.route53ChangeRecord({
      hostedZoneId: "zone-id",
      fullRecord: "_acme-challenge.example.com",
      type: "TXT",
      value: "wildcard-token",
      action: "UPSERT",
    });

    const change = sentChanges[0].ChangeBatch.Changes[0];
    assert.equal(change.Action, "UPSERT");
    assert.deepEqual(change.ResourceRecordSet.ResourceRecords, [
      { Value: '"apex-token"' },
      { Value: '"wildcard-token"' },
    ]);
    assert.equal(change.ResourceRecordSet.TTL, 300);
  });

  it("keeps the wildcard TXT challenge when removing the apex challenge", async () => {
    const { client, sentChanges } = await createAwsClient([
      {
        Name: "_acme-challenge.example.com.",
        Type: "TXT",
        TTL: 300,
        ResourceRecords: [{ Value: '"apex-token"' }, { Value: '"wildcard-token"' }],
      },
    ]);

    await client.route53ChangeRecord({
      hostedZoneId: "zone-id",
      fullRecord: "_acme-challenge.example.com",
      type: "TXT",
      value: "apex-token",
      action: "DELETE",
    });

    const change = sentChanges[0].ChangeBatch.Changes[0];
    assert.equal(change.Action, "UPSERT");
    assert.deepEqual(change.ResourceRecordSet.ResourceRecords, [{ Value: '"wildcard-token"' }]);
  });
});

function throttle(name: string, extra: Record<string, any> = {}) {
  const err: any = new Error(name);
  err.name = name;
  return Object.assign(err, extra);
}

describe("AwsClient.withRetry", () => {
  it("retries a throttled call and then resolves", async () => {
    const { client } = await createAwsClient([]);
    let calls = 0;
    const result = await client.withRetry(async () => {
      calls++;
      if (calls < 3) {
        throw throttle("ThrottlingException");
      }
      return "ok";
    });
    assert.equal(result, "ok");
    assert.equal(calls, 3);
  });

  it("retries Route53 PriorRequestNotComplete", async () => {
    const { client } = await createAwsClient([]);
    let calls = 0;
    const result = await client.withRetry(async () => {
      calls++;
      if (calls < 2) {
        throw throttle("PriorRequestNotComplete");
      }
      return "done";
    });
    assert.equal(result, "done");
    assert.equal(calls, 2);
  });

  it("retries on HTTP 429 without a known error code", async () => {
    const { client } = await createAwsClient([]);
    let calls = 0;
    await client.withRetry(async () => {
      calls++;
      if (calls < 2) {
        const err: any = new Error("too many requests");
        err.$metadata = { httpStatusCode: 429 };
        throw err;
      }
      return null;
    });
    assert.equal(calls, 2);
  });

  it("does not retry non-throttling errors", async () => {
    const { client } = await createAwsClient([]);
    let calls = 0;
    await assert.rejects(
      client.withRetry(async () => {
        calls++;
        throw throttle("AccessDeniedException");
      }),
      /AccessDeniedException/
    );
    assert.equal(calls, 1);
  });

  it("stops after maxAttempts and rethrows the throttling error", async () => {
    const { client } = await createAwsClient([]);
    let calls = 0;
    await assert.rejects(
      client.withRetry(async () => {
        calls++;
        throw throttle("Throttling", { message: "Rate exceeded" });
      }, 3),
      /Throttling|Rate exceeded/
    );
    assert.equal(calls, 3);
  });
});
