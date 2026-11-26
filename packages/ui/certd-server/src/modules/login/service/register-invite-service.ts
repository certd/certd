import crypto from "node:crypto";
import { Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { EntityManager, IsNull, MoreThan, Repository } from "typeorm";
import { BaseService } from "@certd/lib-server";
import { RegisterInviteEntity } from "../entity/register-invite.js";

export type RegisterMode = "closed" | "invite" | "open";

/** 兼容旧数据：未设置 registerMode 时按 registerEnabled 派生。 */
export function resolveRegisterMode(pub: { registerMode?: string; registerEnabled?: boolean } | null | undefined): RegisterMode {
  const mode = pub?.registerMode;
  if (mode === "closed" || mode === "invite" || mode === "open") {
    return mode;
  }
  if (pub?.registerEnabled === false) {
    return "closed";
  }
  return "open";
}

const DEFAULT_EXPIRES_DAYS = 3;
const MAX_EXPIRES_DAYS = 30;
const DAY_MS = 86400000;

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class RegisterInviteService extends BaseService<RegisterInviteEntity> {
  @InjectEntityModel(RegisterInviteEntity)
  repository: Repository<RegisterInviteEntity>;

  //@ts-ignore
  getRepository() {
    return this.repository;
  }

  private static readonly rateBuckets = new Map<string, { windowStart: number; count: number }>();
  private static readonly RATE_WINDOW_MS = 60 * 1000;
  private static readonly RATE_MAX = { register: 7, status: 30 } as const;

  /**
   * 按来源IP固定窗口限流，防止暴力枚举邀请token。
   * 错误token同样计数；超限统一抛“未开放注册”，避免暴露具体原因。
   */
  assertRateLimit(ip: string, kind: "register" | "status" = "register") {
    const key = `${kind}:${String(ip || "unknown")}`;
    const max = RegisterInviteService.RATE_MAX[kind];
    const now = Date.now();
    const bucket = RegisterInviteService.rateBuckets.get(key);
    if (!bucket || now - bucket.windowStart >= RegisterInviteService.RATE_WINDOW_MS) {
      RegisterInviteService.rateBuckets.set(key, { windowStart: now, count: 1 });
      return;
    }
    bucket.count += 1;
    if (bucket.count > max) {
      throw new Error("未开放注册");
    }
  }

  static resetRateLimitForTest() {
    RegisterInviteService.rateBuckets.clear();
  }

  hashToken(token: string) {
    return crypto.createHash("sha256").update(String(token)).digest("hex");
  }

  private normalizeDays(input?: number) {
    const n = Number(input);
    if (!Number.isFinite(n) || n <= 0) {
      return DEFAULT_EXPIRES_DAYS;
    }
    return Math.min(MAX_EXPIRES_DAYS, Math.max(1, Math.floor(n)));
  }

  /** 生成邀请：明文 token 仅在此处返回一次，数据库只保存哈希。 */
  async create(req: { createdBy: number; expiresDays?: number; remark?: string }) {
    const days = this.normalizeDays(req.expiresDays);
    const token = crypto.randomBytes(32).toString("base64url");
    const entity = this.repository.create({
      tokenHash: this.hashToken(token),
      createdBy: req.createdBy,
      expiresTime: Date.now() + days * DAY_MS,
      usedTime: null,
      usedUserId: null,
      usedUserName: null,
      remark: req.remark || "",
    });
    const saved = await this.repository.save(entity);
    return {
      id: saved.id,
      token,
      expiresTime: Number(saved.expiresTime),
      expiresDays: days,
    };
  }

  /** 注册页判断是否展示表单；无效/过期/已用 token 返回 null，调用方按“未开放注册”处理。 */
  async findUsableByToken(token: string) {
    const text = String(token || "").trim();
    if (!text) {
      return null;
    }
    const bean = await this.repository.findOne({
      where: {
        tokenHash: this.hashToken(text),
        usedTime: IsNull(),
        expiresTime: MoreThan(Date.now()),
      },
    });
    return bean ?? null;
  }

  /**
   * 在注册事务内原子消费：条件 UPDATE 只有一次能成功，避免并发注册绕过一次性限制。
   * 返回 false 表示不存在/已过期/已被消费。
   */
  async consume(req: { token: string; usedUserId: number; usedUserName: string; manager?: EntityManager }) {
    const tokenHash = this.hashToken(req.token);
    const repository = req.manager ? req.manager.getRepository(RegisterInviteEntity) : this.repository;
    const result = await repository
      .createQueryBuilder()
      .update()
      .set({ usedTime: Date.now(), usedUserId: req.usedUserId, usedUserName: req.usedUserName })
      .where("token_hash = :tokenHash", { tokenHash })
      .andWhere("used_time IS NULL")
      .andWhere("expires_time > :now", { now: Date.now() })
      .execute();
    return (result.affected || 0) > 0;
  }

  /** 管理列表：隐藏“已过期且未使用”的链接；已使用保留用于审计（含注册用户）。 */
  async listInvites() {
    const now = Date.now();
    const rows = await this.repository.find({ order: { createTime: "DESC" } });
    return rows
      .filter(item => item.usedTime != null || Number(item.expiresTime) > now)
      .map(item => ({
        id: item.id,
        createTime: item.createTime,
        expiresTime: Number(item.expiresTime),
        usedTime: item.usedTime != null ? Number(item.usedTime) : null,
        usedUserId: item.usedUserId ?? null,
        usedUserName: item.usedUserName || null,
        status: item.usedTime != null ? "used" : "active",
        remark: item.remark || "",
      }));
  }
}
