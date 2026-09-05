import assert from "assert";
import { AsyncSsh2Client, createJumpSocket, MAX_JUMP_HOST_DEPTH, nextJumpConnectionContext } from "./ssh.js";

function makeLogger(): any {
  return { info() {}, error() {}, warn() {} };
}

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

describe("AsyncSsh2Client.resolveKeyboardInteractiveAnswers", () => {
  function makeClient(connConf: Partial<AsyncSsh2Client["connConf"]>): AsyncSsh2Client {
    return new AsyncSsh2Client(connConf as any, makeLogger());
  }

  it("私钥登录场景（password 为 undefined）遇到 Password prompt，必须返回空字符串而非 undefined", () => {
    const client = makeClient({
      host: "target.example.com",
      port: 22,
      username: "root",
      // password 未设置（用户用私钥登录）
      privateKey: "-----BEGIN OPENSSH PRIVATE KEY-----\nxxx\n-----END OPENSSH PRIVATE KEY-----",
    });

    const prompts = [{ prompt: "Password: ", echo: false }];
    const answers = (client as any).resolveKeyboardInteractiveAnswers(prompts);

    assert.ok(Array.isArray(answers), "应返回数组");
    assert.strictEqual(answers.length, 1);
    assert.strictEqual(typeof answers[0], "string", "每一项都必须是 string，不能为 undefined");
    assert.strictEqual(answers[0], "", "无可用 password 时应回退为空字符串");
  });

  it("存在 password 时，Password prompt 应返回配置的 password", () => {
    const client = makeClient({
      host: "target.example.com",
      port: 22,
      username: "root",
      password: "my-secret",
    });

    const answers = (client as any).resolveKeyboardInteractiveAnswers([{ prompt: "Password: ", echo: false }]);

    assert.deepStrictEqual(answers, ["my-secret"]);
  });

  it("遇到 Passphrase prompt 时，优先使用 passphrase，兜底 password，再兜底空串", () => {
    // 场景 1：仅配置 passphrase
    const client1 = makeClient({
      host: "target.example.com",
      port: 22,
      username: "root",
      passphrase: "key-pass",
    });
    assert.deepStrictEqual((client1 as any).resolveKeyboardInteractiveAnswers([{ prompt: 'Passphrase for key "id_rsa": ', echo: false }]), ["key-pass"]);

    // 场景 2：未设 passphrase 但有 password（部分服务器混用）
    const client2 = makeClient({
      host: "target.example.com",
      port: 22,
      username: "root",
      password: "login-pass",
    });
    assert.deepStrictEqual((client2 as any).resolveKeyboardInteractiveAnswers([{ prompt: "Enter passphrase: ", echo: false }]), ["login-pass"]);

    // 场景 3：两者都没设 → 必须是 "" 而不是 undefined
    const client3 = makeClient({
      host: "target.example.com",
      port: 22,
      username: "root",
    });
    const answers = (client3 as any).resolveKeyboardInteractiveAnswers([{ prompt: "Passphrase for key: ", echo: false }]);
    assert.strictEqual(typeof answers[0], "string");
    assert.strictEqual(answers[0], "");
  });

  it("中文 prompt（如 口令）应匹配 password", () => {
    const client = makeClient({
      host: "target.example.com",
      port: 22,
      username: "root",
      password: "zh-pass",
    });
    const answers = (client as any).resolveKeyboardInteractiveAnswers([{ prompt: "请输入登录口令：", echo: false }]);
    assert.deepStrictEqual(answers, ["zh-pass"]);
  });

  it("未知类型 prompt，兜底按优先级选择；所有未命中的答案都必须是 string（禁止 undefined）", () => {
    const client = makeClient({
      host: "target.example.com",
      port: 22,
      username: "root",
      password: "p1",
    });
    const answers = (client as any).resolveKeyboardInteractiveAnswers([
      { prompt: "OTP Code: ", echo: true },
      { prompt: "Verification code: ", echo: true },
    ]);
    assert.strictEqual(answers.length, 2);
    // 未知 prompt 兜底用 password，password 没了才是空串
    for (const a of answers) {
      assert.strictEqual(typeof a, "string", "所有答案都必须是字符串，不能出现 undefined");
    }
    // 没有任何 OTP 相关配置，两项应回退到兜底值 password
    assert.deepStrictEqual(answers, ["p1", "p1"]);
  });

  it("多 prompt 混合场景（二次验证 + password 为空）：长度一致且全是字符串，不抛 Buffer.byteLength(undefined)", () => {
    const client = makeClient({
      host: "target.example.com",
      port: 22,
      username: "root",
      // 故意不填 password，模拟仅私钥登录
    });
    const prompts = [
      { prompt: "Password: ", echo: false },
      { prompt: "Verification code: ", echo: true },
    ];
    const answers = (client as any).resolveKeyboardInteractiveAnswers(prompts);

    assert.strictEqual(answers.length, prompts.length);
    answers.forEach((a: any, i: number) => {
      assert.strictEqual(typeof a, "string", `第 ${i} 项答案类型必须为 string，否则 Buffer.byteLength 会抛 ERR_INVALID_ARG_TYPE；实际为: ${typeof a}`);
    });
    // 尝试用 Buffer.byteLength 校验，模拟 ssh2 内部调用
    for (const a of answers) {
      // 这里不应抛出 TypeError
      Buffer.byteLength(a);
    }
  });
});
