import { Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { In, Repository } from "typeorm";
import { ValidateException } from "@certd/lib-server";
import { LocalCaEntity } from "../entity/local-ca.js";
import { LocalCaAdminEntity } from "../entity/local-ca-admin.js";
import { LocalCaGrantEntity } from "../entity/local-ca-grant.js";

export type LocalCaScope = {
  id: number;
  userId: number;
  projectId?: number;
};

/**
 * 本地CA访问控制：管理员ACL、用户授权与归属校验。
 * 不依赖CRL/ACME子服务；签发与ACME视图共用的CA可用性校验也收敛在这里。
 */
@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class LocalCaAccessService {
  @InjectEntityModel(LocalCaEntity)
  repository: Repository<LocalCaEntity>;

  @InjectEntityModel(LocalCaAdminEntity)
  adminRepository: Repository<LocalCaAdminEntity>;

  @InjectEntityModel(LocalCaGrantEntity)
  grantRepository: Repository<LocalCaGrantEntity>;

  // 移除授权时同步禁用绑定该授权的EAB，避免残留凭证继续可用


  async findAdminAccess(caId: number, adminUserId: number) {
    return await this.adminRepository.findOne({ where: { caId, adminUserId } });
  }

  async getAdminAccess(caId: number, adminUserId: number, requireOwner = false) {
    const access = await this.findAdminAccess(caId, adminUserId);
    if (!access) {
      throw new ValidateException("本地CA不存在或无访问权限");
    }
    if (requireOwner && access.role !== "owner") {
      throw new ValidateException("仅本地CA的创建管理员可以执行该操作");
    }
    return access;
  }

  async addAdminAccess(caId: number, adminUserId: number, role = "owner") {
    const existing = await this.findAdminAccess(caId, adminUserId);
    if (existing) {
      await this.adminRepository.update({ id: existing.id }, { role, updateTime: new Date() });
      return;
    }
    await this.adminRepository.save(this.adminRepository.create({ caId, adminUserId, role }));
  }

  async assertAdminCa(caId: number, adminUserId: number, requireOwner = false) {
    return await this.getAdminAccess(caId, adminUserId, requireOwner);
  }

  async assertCaOwner(req: LocalCaScope) {
    await this.getOwnedCa(req);
  }

  private async getAccessibleCa(req: LocalCaScope, requireOwner = false) {
    const ca = await this.repository.findOne({ where: { id: req.id, deleted: false } });
    if (!ca) {
      throw new ValidateException("本地CA不存在或无访问权限");
    }
    await this.getAdminAccess(ca.id, req.userId, requireOwner);
    return ca;
  }

  async getOwnedCa(req: LocalCaScope, requireOwner = false) {
    return await this.getAccessibleCa(req, requireOwner);
  }

  async getGrantedCa(req: LocalCaScope) {
    const ca = await this.repository.findOne({ where: { id: req.id, deleted: false } });
    if (!ca) {
      throw new ValidateException("本地CA不存在或无访问权限");
    }
    if (req.userId > 0) {
      const admin = await this.findAdminAccess(ca.id, req.userId);
      if (admin) {
        return ca;
      }
    }
    const grants = await this.listApplicableGrants(req);
    if (!grants.some(item => item.caId === ca.id)) {
      throw new ValidateException("本地CA不存在或无访问权限");
    }
    return ca;
  }

  /**
   * 企业模式下项目用户/流水线的userId固定为-1，此时按项目授权匹配；否则按真实用户匹配。
   */
  async listApplicableGrants(req: { userId: number; projectId?: number }) {
    if (req.userId > 0) {
      const grants = await this.grantRepository.find({ where: { userId: req.userId, disabled: false } });
      return grants.filter(item => item.projectId === 0 || item.projectId === req.projectId);
    }
    if (req.projectId) {
      return await this.grantRepository.find({ where: { projectId: req.projectId, disabled: false } });
    }
    return [];
  }

  async listGrants(req: LocalCaScope) {
    const ca = await this.getOwnedCa(req);
    return await this.grantRepository.find({ where: { caId: ca.id }, order: { id: "DESC" } });
  }

  async findActiveGrant(caId: number, grantId: number) {
    return await this.grantRepository.findOne({ where: { id: grantId, caId, disabled: false } });
  }

  async addGrant(req: { id: number; userId: number; grantUserId: number; grantProjectId?: number }) {
    if (!Number.isInteger(req.grantUserId) || req.grantUserId <= 0) {
      throw new ValidateException("请选择有效的用户");
    }
    if (req.grantProjectId != null && (!Number.isInteger(req.grantProjectId) || req.grantProjectId <= 0)) {
      throw new ValidateException("项目ID不合法");
    }
    const ca = await this.getOwnedCa({ id: req.id, userId: req.userId }, true);
    if (ca.caType !== "intermediate") {
      throw new ValidateException("只能授权中间CA");
    }
    const projectId = req.grantProjectId ?? 0;
    const existing = await this.grantRepository.findOne({
      where: { caId: ca.id, userId: req.grantUserId, projectId },
    });
    if (existing) {
      if (existing.disabled) {
        await this.grantRepository.update({ id: existing.id }, { disabled: false, updateTime: new Date() });
      }
      return existing;
    }
    const bean = this.grantRepository.create({
      caId: ca.id,
      userId: req.grantUserId,
      projectId,
      createdByAdminId: req.userId,
      disabled: false,
    });
    return await this.grantRepository.save(bean);
  }

  async removeGrant(req: { id: number; userId: number; grantId: number }) {
    const ca = await this.getOwnedCa({ id: req.id, userId: req.userId }, true);
    const grant = await this.grantRepository.findOne({ where: { id: req.grantId, caId: ca.id } });
    if (!grant) {
      throw new ValidateException("授权不存在");
    }
    // 同一(caId,userId,projectId)可能存在历史重复行，撤销时全部删除并禁用其EAB，避免残留授权
    const duplicates = await this.grantRepository.find({
      where: { caId: ca.id, userId: grant.userId, projectId: grant.projectId },
    });
    const grantIds = duplicates.map(item => item.id);
    await this.grantRepository.delete({ id: In(grantIds) } as any);
    return grantIds;
  }

  async listAdmins(req: LocalCaScope) {
    const ca = await this.getOwnedCa(req);
    return await this.adminRepository.find({ where: { caId: ca.id }, order: { id: "DESC" } });
  }

  async addCaAdmin(req: { id: number; userId: number; adminUserId: number; role?: string }) {
    if (!Number.isInteger(req.adminUserId) || req.adminUserId <= 0) {
      throw new ValidateException("请选择有效的管理员用户");
    }
    if (req.role === "owner") {
      throw new ValidateException("本地CA仅允许创建者作为所有者，不能添加其他所有者");
    }
    const ca = await this.getOwnedCa({ id: req.id, userId: req.userId }, true);
    const existing = await this.findAdminAccess(ca.id, req.adminUserId);
    if (existing?.role === "owner") {
      return existing;
    }
    return await this.addAdminAccess(ca.id, req.adminUserId, "operator");
  }

  async removeCaAdmin(req: { id: number; userId: number; adminUserId: number }) {
    const ca = await this.getOwnedCa({ id: req.id, userId: req.userId }, true);
    const access = await this.findAdminAccess(ca.id, req.adminUserId);
    if (!access) {
      return;
    }
    if (access.role === "owner") {
      throw new ValidateException("不能移除CA的创建管理员");
    }
    await this.adminRepository.delete({ id: access.id });
  }

  /**
   * 轮换中间CA时把旧CA的管理员（不含owner）与有效授权复制到新CA。
   */
  async copyAdminsAndGrants(fromCaId: number, toCaId: number, createdByAdminId: number) {
    await this.addAdminAccess(toCaId, createdByAdminId, "owner");
    const oldAdmins = await this.adminRepository.find({ where: { caId: fromCaId } });
    for (const admin of oldAdmins) {
      if (admin.role !== "owner") {
        await this.addAdminAccess(toCaId, admin.adminUserId, "operator");
      }
    }
    const oldGrants = await this.grantRepository.find({ where: { caId: fromCaId, disabled: false } });
    for (const grant of oldGrants) {
      await this.grantRepository.save(
        this.grantRepository.create({
          caId: toCaId,
          userId: grant.userId,
          projectId: grant.projectId,
          createdByAdminId,
          disabled: false,
        })
      );
    }
  }

}