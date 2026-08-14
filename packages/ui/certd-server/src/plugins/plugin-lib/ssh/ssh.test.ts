import assert from "assert";
import { AsyncSsh2Client, createJumpSocket, MAX_JUMP_HOST_DEPTH, nextJumpConnectionContext } from "./ssh.js";

describe("createJumpSocket", () => {
  it("forwards the target SSH connection through the jump host", async () => {
    const forwardedStream = { id: "jump-stream" };
    const forwardedArgs: any[] = [];

    const jumpConnection = {
      forwardOut(...args: any[]) {
        forwardedArgs.push(args.slice(0, 4));
        const callback = args[4];
        callback(null, forwardedStream);
      },
    };

    const socket = await createJumpSocket(jumpConnection, {
      host: "target.example.com",
      port: 2222,
    });

    assert.deepEqual(forwardedArgs, [["127.0.0.1", 0, "target.example.com", 2222]]);
    assert.equal(socket, forwardedStream);
  });

  it("propagates jump host forwarding errors", async () => {
    const forwardError = new Error("forward denied");
    const jumpConnection = {
      forwardOut(_srcHost: string, _srcPort: number, _targetHost: string, _targetPort: number, callback: (err: Error) => void) {
        callback(forwardError);
      },
    };

    await assert.rejects(
      createJumpSocket(jumpConnection, {
        host: "target.example.com",
        port: 2222,
      }),
      forwardError
    );
  });

  it("loads the jump host from the selected SSH authorization", async () => {
    const jumpHost = {
      host: "jump.example.com",
      port: 22,
      username: "jump-user",
    };
    let requestedAccessId: number | undefined;
    const client = new AsyncSsh2Client(
      {
        host: "target.example.com",
        port: 2222,
        username: "target-user",
        jumpHostAccessId: 10,
        ctx: {
          accessService: {
            async getById(id: number) {
              requestedAccessId = id;
              return jumpHost;
            },
          },
        },
      } as any,
      { info() {}, error() {}, warn() {} } as any
    );

    const resolvedJumpHost = await (client as any).getJumpHost();

    assert.equal(requestedAccessId, 10);
    assert.equal(resolvedJumpHost.accessId, 10);
    assert.equal(resolvedJumpHost.config, jumpHost);
  });
});

describe("nextJumpConnectionContext", () => {
  it("rejects jump host chains that exceed the maximum depth", () => {
    const jumpHost = { host: "jump.example.com", port: 22 } as any;

    assert.throws(
      () =>
        nextJumpConnectionContext(
          {
            depth: MAX_JUMP_HOST_DEPTH,
            accessIds: [],
            hosts: [],
          },
          jumpHost
        ),
      /跳板机层级不能超过/
    );
  });

  it("rejects circular jump host authorization references", () => {
    const firstJumpHost = { host: "jump-1.example.com", port: 22 } as any;
    const secondJumpHost = { host: "jump-2.example.com", port: 22 } as any;
    const context = nextJumpConnectionContext(
      {
        depth: 0,
        accessIds: [],
        hosts: [],
      },
      firstJumpHost,
      1
    );
    const nextContext = nextJumpConnectionContext(context, secondJumpHost, 2);

    assert.throws(() => nextJumpConnectionContext(nextContext, firstJumpHost, 1), /检测到跳板机循环引用/);
  });

  it("rejects circular direct jump host configurations", () => {
    const targetHost = { host: "target.example.com", port: 22 } as any;
    const jumpHost = { host: "jump.example.com", port: 22 } as any;
    const context = nextJumpConnectionContext(
      {
        depth: 0,
        accessIds: [],
        hosts: [targetHost],
      },
      jumpHost
    );

    assert.throws(() => nextJumpConnectionContext(context, targetHost), /检测到跳板机循环引用/);
  });
});
