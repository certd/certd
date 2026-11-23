import { Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { InjectEntityModel } from "@midwayjs/typeorm";
import { Repository } from "typeorm";
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

  async record(req: RecordRevocationReq) {
    const serialNumber = normalizeSerialNumber(req.serialNumber);
    if (!serialNumber) {
      throw new Error("证书序列号为空，无法记录吊销");
    }
    const existing = await this.findBySerial(req.caId, serialNumber);
    if (existing) {
      return existing;
    }
    const bean = this.repository.create({
      caId: req.caId,
      userId: req.userId,
      projectId: req.projectId,
      certInfoId: req.certInfoId,
      serialNumber,
      revokedTime: req.revokedTime || Date.now(),
      reason: req.reason || "unspecified",
      expiresTime: req.expiresTime,
    });
    try {
      return await this.repository.save(bean);
    } catch (e) {
      // 并发吊销时唯一索引会冲突，回查已有记录
      const again = await this.findBySerial(req.caId, serialNumber);
      if (again) {
        return again;
      }
      throw e;
    }
  }

  async findBySerial(caId: number, serialNumber: string) {
    const normalized = normalizeSerialNumber(serialNumber);
    if (!normalized) {
      return null;
    }
    return await this.repository.findOne({
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
