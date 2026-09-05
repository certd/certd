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
    logger: { info() {}, error() {} } as any,
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
