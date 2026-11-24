import { Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { logger } from "@certd/basic";
import { CertRevocationEntity } from "../entity/cert-revocation.js";
import { LocalCaEntity } from "../entity/local-ca.js";
import { CertInfoEntity, CertStatus } from "../../monitor/entity/cert-info.js";
import { runTransaction } from "../../db/db-transaction.js";
import { CodeException, Constants } from "@certd/lib-server";

export type RecordRevocationReq = {
  caId: number;
  userId: number;
  projectId?: number;
  certInfoId?: number;
  serialNumber: string;
  revokedTime?: number;
  reason?: string;
  expiresTime?: number;
};

function normalizeSerialNumber(value: string) {
  return String(value || "")
    .trim()
    .replace(/[:\s]/g, "")
    .toUpperCase();
}

@Provide()
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class CertRevocationService {
  @InjectEntityModel(CertRevocationEntity)
  repository: Repository<CertRevocationEntity>;

  @InjectEntityModel(LocalCaEntity)
  localCaRepository: Repository<LocalCaEntity>;

  @InjectEntityModel(CertInfoEntity)
  certInfoRepository: Repository<CertInfoEntity>;

  async record(req: RecordRevocationReq, manager?: EntityManager) {
    const repository = manager ? manager.getRepository(CertRevocationEntity) : this.repository;
    const serialNumber = normalizeSerialNumber(req.serialNumber);
    if (!serialNumber) {
      throw new Error("证书序列号为空，无法记录吊销");
    }
    const existing = await this.findBySerial(req.caId, serialNumber, manager);
    if (existing) {
      return existing;
    }
    const bean = repository.create({
      caId: req.caId,
      userId: req.userId,
      projectId: req.projectId,
      certInfoId: req.certInfoId,
      serialNumber,
      revokedTime: req.revokedTime || Date.now(),
      reason: req.reason || "unspecified",
      expiresTime: req.expiresTime,
    });
    // 数据库原生 INSERT ... ON CONFLICT/IGNORE，避免并发吊销重复落库
    await repository.createQueryBuilder().insert().into(CertRevocationEntity).values(bean).orIgnore().execute();
    const saved = await this.findBySerial(req.caId, serialNumber, manager);
    if (!saved) {
      throw new Error("吊销记录写入失败");
    }
    logger.info(`[local-ca] revocation recorded ca=${req.caId} cert=${req.certInfoId ?? "-"} serial=${serialNumber} user=${req.userId} reason=${saved.reason}`);
    return saved;
  }

  async findBySerial(caId: number, serialNumber: string, manager?: EntityManager) {
    const repository = manager ? manager.getRepository(CertRevocationEntity) : this.repository;
    const normalized = normalizeSerialNumber(serialNumber);
    if (!normalized) {
      return null;
    }
    return await repository.findOne({
      where: { caId, serialNumber: normalized },
    });
  }

  async listByCa(caId: number) {
    return await this.repository.find({
      where: { caId },
      order: { revokedTime: "DESC" },
    });
  }
  /**
   * Local CA 证书记录吊销：校验CA存在与证书归属，事务内写吊销记录、更新证书状态并失效CRL缓存。
   * 该业务属于Local CA，通用证书服务仅委托调用。
   */
  async revokeCertInfo(req: { certInfoId: number; caId: number; userId: number; projectId?: number; serialNumber: string; expiresTime?: number; reason?: string }) {
    const ca = await this.localCaRepository.findOne({ where: { id: req.caId, deleted: false }, select: { id: true } });
    if (!ca) {
      logger.warn(`[local-ca] revocation denied ca=${req.caId} cert=${req.certInfoId} user=${req.userId} project=${req.projectId ?? "-"}`);
      throw new CodeException({ ...Constants.res.openCertNotFound, message: "本地CA不存在或无访问权限" });
    }
    const certWhere: any = {
      id: req.certInfoId,
      userId: req.userId,
      localCaId: req.caId,
      serialNumber: String(req.serialNumber || "").toUpperCase(),
    };
    if (req.projectId != null) {
      certWhere.projectId = req.projectId;
    }
    const cert = await this.certInfoRepository.findOne({ where: certWhere, select: { id: true, status: true } });
    if (!cert) {
      logger.warn(`[local-ca] revocation target mismatch ca=${req.caId} cert=${req.certInfoId} user=${req.userId} project=${req.projectId ?? "-"}`);
      throw new CodeException({ ...Constants.res.openCertNotFound, message: "证书记录与CA或序列号不匹配" });
    }
    const revokedTime = Date.now();
    const manager = this.certInfoRepository?.manager;
    if (!manager?.transaction) {
      throw new Error("数据库事务不可用，无法安全吊销证书");
    }
    await runTransaction(manager, async tx => {
      await this.record(
        { caId: req.caId, userId: req.userId, projectId: req.projectId, certInfoId: req.certInfoId, serialNumber: req.serialNumber, revokedTime, expiresTime: req.expiresTime, reason: req.reason },
        tx
      );
      await tx.getRepository(CertInfoEntity).update(certWhere, { status: CertStatus.revoked, revokeTime: revokedTime });
      await tx
        .getRepository(LocalCaEntity)
        .createQueryBuilder()
        .update()
        .set({ lastCrlTime: -1, crlNumber: () => "crl_number + 1" } as any)
        .where("id = :id", { id: req.caId })
        .execute();
    });
    return revokedTime;
  }

}
