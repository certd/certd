import { Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { logger } from "@certd/basic";
import { CertRevocationEntity } from "../entity/cert-revocation.js";

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
}
