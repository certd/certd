import assert from "node:assert/strict";
import { LoginService } from "./login-service.js";

function createLoginService() {
  const service = new LoginService();
  const calls: any = {
    register: [],
    bindInvitee: [],
    withTx: [],
  };
  const txManager = { tx: true };
  const newUser = { id: 1001, username: "new_user" };
  service.userService = {
    async register(type: string, user: any, withTx?: any) {
      calls.register.push({ type, user, withTx });
      user.id = newUser.id;
      if (withTx) {
        await withTx(txManager);
      }
      return newUser;
    },
  } as any;
  service.inviteService = {
    async bindInvitee(ctx: any, req: any) {
      calls.bindInvitee.push({ ctx, req });
      return { id: 1 };
    },
  } as any;
  return { service, calls, newUser, txManager };
}

describe("LoginService.register", () => {
  it("registers user and binds invite code after user creation", async () => {
    const { service, calls, newUser } = createLoginService();
    const registerUser = { username: "alice" } as any;

    const result = await service.register("username", registerUser, "ABC123");

    assert.equal(result, newUser);
    assert.equal(calls.register.length, 1);
    assert.equal(calls.register[0].type, "username");
    assert.equal(calls.register[0].user, registerUser);
    assert.equal(calls.bindInvitee.length, 1);
    assert.deepEqual(calls.bindInvitee[0].ctx, {});
    assert.deepEqual(calls.bindInvitee[0].req, {
      inviteeUserId: newUser.id,
      inviteCode: "ABC123",
    });
  });

  it("keeps registration successful when invite binding fails", async () => {
    const { service, calls, newUser } = createLoginService();
    service.inviteService = {
      async bindInvitee(ctx: any, req: any) {
        calls.bindInvitee.push({ ctx, req });
        throw new Error("invalid invite code");
      },
    } as any;

    const result = await service.register("username", { username: "alice" } as any, "BADCODE");

    assert.equal(result, newUser);
    assert.equal(calls.register.length, 1);
    assert.equal(calls.bindInvitee.length, 1);
  });

  it("keeps original registration transaction callback", async () => {
    const { service, calls, txManager } = createLoginService();

    await service.register("username", { username: "alice" } as any, "", async tx => {
      calls.withTx.push(tx);
    });

    assert.equal(calls.withTx.length, 1);
    assert.equal(calls.withTx[0], txManager);
    assert.equal(calls.bindInvitee.length, 0);
  });
});
