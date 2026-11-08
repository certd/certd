import assert from "node:assert/strict";
import { DataSource } from "typeorm";
import Database from "better-sqlite3";
import { AuditService, getAuditIpKey } from "./audit-service.js";
import { AuditLogEntity } from "../entity/audit-log.js";
import { cache } from "@certd/basic";

describe("AuditService.isUnusualLoginIp", () => {
  let database: DataSource;
  let service: AuditService;

  beforeEach(async () => {
    cache.delete("audit.userIps:11");
    cache.delete("audit.userIps:12");
    database = new DataSource({ type: "better-sqlite3", driver: Database, database: ":memory:", entities: [AuditLogEntity], synchronize: true });
    await database.initialize();
    service = new AuditService();
    service.repository = database.getRepository(AuditLogEntity);
  });

  afterEach(async () => {
    cache.delete("audit.userIps:11");
    cache.delete("audit.userIps:12");
    await database.destroy();
  });

  async function addLog(userId: number, ipAddress: string, daysAgo: number, success = true) {
    await service.repository.save({
      userId,
      ipAddress,
      success,
      username: "test-user",
      projectId: 0,
      scope: "user",
      type: "pipeline",
      action: "保存",
      content: "保存流水线",
      createTime: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
    });
  }

  it("only flags a new IP when the same user has successful audits within 30 days", async () => {
    await addLog(11, "192.0.2.1", 29);
    assert.equal(await service.isUnusualLoginIp({ userId: 11, ipKey: getAuditIpKey("192.0.2.1") }), false);
    assert.equal(await service.isUnusualLoginIp({ userId: 11, ipKey: getAuditIpKey("198.51.100.1") }), true);
    assert.equal(await service.isUnusualLoginIp({ userId: 12, ipKey: getAuditIpKey("198.51.100.1") }), false);
  });

  it("does not use future, failed or empty-IP audits as a baseline", async () => {
    await addLog(11, "192.0.2.1", 31, false);
    await addLog(11, "192.0.2.2", -1);
    await addLog(11, "192.0.2.3", 1, false);
    await addLog(11, "", 1);
    assert.equal(await service.isUnusualLoginIp({ userId: 11, ipKey: getAuditIpKey("198.51.100.1") }), false);
  });

  it("flags an IP whose own history is expired or failed when another recent IP exists", async () => {
    await addLog(11, "192.0.2.1", 1);
    await addLog(11, "198.51.100.1", 31);
    await addLog(11, "198.51.100.2", 1, false);
    assert.equal(await service.isUnusualLoginIp({ userId: 11, ipKey: getAuditIpKey("198.51.100.1") }), true);
    assert.equal(await service.isUnusualLoginIp({ userId: 11, ipKey: getAuditIpKey("198.51.100.2") }), true);
  });

  it("近 30 天没有成功审计时只用该用户最后一条成功日志的 IP", async () => {
    await addLog(11, "192.0.2.1", 31);
    await addLog(11, "192.0.2.2", 45);
    await addLog(12, "192.0.2.3", 1);
    await addLog(11, "192.0.2.4", 1, false);
    await addLog(11, "192.0.2.5", -1);
    assert.equal(await service.isUnusualLoginIp({ userId: 11, ipKey: getAuditIpKey("::ffff:192.0.2.1") }), false);
    assert.equal(await service.isUnusualLoginIp({ userId: 11, ipKey: getAuditIpKey("192.0.2.2") }), true);
    assert.equal(await service.isUnusualLoginIp({ userId: 11, ipKey: getAuditIpKey("198.51.100.1") }), true);
  });

  it("最后一条日志的回退结果也缓存一小时，新 IP 落库后刷新", async () => {
    await addLog(11, "192.0.2.1", 31);
    const findOne = service.repository.findOne.bind(service.repository);
    let fallbackCount = 0;
    service.repository.findOne = options => {
      fallbackCount++;
      return findOne(options);
    };
    assert.equal(await service.isUnusualLoginIp({ userId: 11, ipKey: getAuditIpKey("192.0.2.1") }), false);
    assert.equal(await service.isUnusualLoginIp({ userId: 11, ipKey: getAuditIpKey("198.51.100.1") }), true);
    assert.equal(fallbackCount, 1);
    assert.ok(cache.getRemainingTTL("audit.userIps:11") > 59 * 60 * 1000);
    await service.log({ userId: 11, username: "test-user", type: "login", action: "登录", content: "登录成功", ipAddress: "198.51.100.1" });
    assert.equal(await service.isUnusualLoginIp({ userId: 11, ipKey: getAuditIpKey("198.51.100.1") }), false);
    assert.equal(await service.isUnusualLoginIp({ userId: 11, ipKey: getAuditIpKey("192.0.2.1") }), true);
    assert.equal(fallbackCount, 1);
  });

  it("最后一条日志查询失败不缓存失败结果，下一次可重试", async () => {
    await addLog(11, "192.0.2.1", 31);
    const findOne = service.repository.findOne.bind(service.repository);
    service.repository.findOne = async () => {
      throw new Error("fallback failed");
    };
    await assert.rejects(service.isUnusualLoginIp({ userId: 11, ipKey: getAuditIpKey("198.51.100.1") }), /fallback failed/);
    assert.equal(cache.has("audit.userIps:11"), false);
    service.repository.findOne = findOne;
    assert.equal(await service.isUnusualLoginIp({ userId: 11, ipKey: getAuditIpKey("198.51.100.1") }), true);
  });

  it("treats IPv4 and mapped IPv6 as the same IP", async () => {
    await addLog(11, "192.0.2.1", 1);
    assert.equal(await service.isUnusualLoginIp({ userId: 11, ipKey: getAuditIpKey("::ffff:192.0.2.1") }), false);
    assert.equal(await service.isUnusualLoginIp({ userId: 11, ipKey: getAuditIpKey("::ffff:c000:201") }), false);
    await addLog(12, "::ffff:192.0.2.2", 1);
    assert.equal(await service.isUnusualLoginIp({ userId: 12, ipKey: getAuditIpKey("192.0.2.2") }), false);
  });

  it("caches each user's IP statistics for one hour and refreshes after a new IP audit", async () => {
    await addLog(11, "192.0.2.1", 1);
    const createQueryBuilder = service.repository.createQueryBuilder.bind(service.repository);
    let queryCount = 0;
    service.repository.createQueryBuilder = (...args: any[]) => {
      queryCount++;
      return createQueryBuilder(...args);
    };
    assert.equal(await service.isUnusualLoginIp({ userId: 11, ipKey: getAuditIpKey("192.0.2.1") }), false);
    assert.equal(await service.isUnusualLoginIp({ userId: 11, ipKey: getAuditIpKey("198.51.100.1") }), true);
    assert.equal(queryCount, 1);
    assert.ok(cache.getRemainingTTL("audit.userIps:11") > 59 * 60 * 1000);
    await service.log({ userId: 11, username: "test-user", type: "login", action: "登录", content: "登录成功", ipAddress: "198.51.100.1" });
    assert.equal(queryCount, 2);
    assert.equal(await service.isUnusualLoginIp({ userId: 11, ipKey: getAuditIpKey("198.51.100.1") }), false);
    assert.equal(queryCount, 2);
  });

  it("refreshes an empty baseline after the user's first successful audit", async () => {
    assert.equal(await service.isUnusualLoginIp({ userId: 11, ipKey: getAuditIpKey("192.0.2.1") }), false);
    await service.log({ userId: 11, username: "test-user", type: "login", action: "登录", content: "登录成功", ipAddress: "192.0.2.1" });
    assert.equal(await service.isUnusualLoginIp({ userId: 11, ipKey: getAuditIpKey("198.51.100.1") }), true);
  });

  it("ignores invalid IP addresses", async () => {
    await addLog(11, "192.0.2.1", 1);
    assert.equal(await service.isUnusualLoginIp({ userId: 11, ipKey: getAuditIpKey("unknown") }), false);
  });

  it("识别带网卡作用域的 IPv6，不影响登录检查", async () => {
    await addLog(11, "fe80::1", 1);
    assert.equal(await service.isUnusualLoginIp({ userId: 11, ipKey: getAuditIpKey("fe80::1%eth0") }), false);
  });

  it("同一用户并发检查共用一次查询，缓存过期后重查", async () => {
    await addLog(11, "192.0.2.1", 1);
    const createQueryBuilder = service.repository.createQueryBuilder.bind(service.repository);
    let queryCount = 0;
    service.repository.createQueryBuilder = (...args: any[]) => {
      queryCount++;
      return createQueryBuilder(...args);
    };
    await Promise.all([service.isUnusualLoginIp({ userId: 11, ipKey: getAuditIpKey("192.0.2.1") }), service.isUnusualLoginIp({ userId: 11, ipKey: getAuditIpKey("192.0.2.1") })]);
    assert.equal(queryCount, 1);
    cache.set("audit.userIps:11", cache.get("audit.userIps:11"), { ttl: 1 });
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.equal(await service.isUnusualLoginIp({ userId: 11, ipKey: getAuditIpKey("192.0.2.1") }), false);
    assert.equal(queryCount, 2);
  });

  it("失败审计不更新常用 IP 缓存", async () => {
    await addLog(11, "192.0.2.1", 1);
    await service.isUnusualLoginIp({ userId: 11, ipKey: getAuditIpKey("198.51.100.1") });
    const cached = cache.get("audit.userIps:11");
    await service.log({ userId: 11, username: "test-user", type: "login", action: "登录", content: "登录失败", ipAddress: "198.51.100.1", success: false });
    assert.equal(cache.get("audit.userIps:11"), cached);
    assert.equal(await service.isUnusualLoginIp({ userId: 11, ipKey: getAuditIpKey("198.51.100.1") }), true);
  });

  it("统计查询失败不缓存失败结果，下一次可以重试", async () => {
    await addLog(11, "192.0.2.1", 1);
    const createQueryBuilder = service.repository.createQueryBuilder.bind(service.repository);
    service.repository.createQueryBuilder = () =>
      ({
        select() {
          return this;
        },
        where() {
          return this;
        },
        andWhere() {
          return this;
        },
        groupBy() {
          return this;
        },
        getRawMany: async () => {
          throw new Error("query failed");
        },
      }) as any;
    await assert.rejects(service.isUnusualLoginIp({ userId: 11, ipKey: getAuditIpKey("198.51.100.1") }), /query failed/);
    assert.equal(cache.has("audit.userIps:11"), false);
    service.repository.createQueryBuilder = createQueryBuilder;
    assert.equal(await service.isUnusualLoginIp({ userId: 11, ipKey: getAuditIpKey("198.51.100.1") }), true);
  });
});
