import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { PipelineEntity } from '../../pipeline/entity/pipeline.js';

@Entity('cd_cert_info')
export class CertInfoEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', comment: '用户id' })
  userId: number;

  @Column({ name: 'domain', comment: '主域名' })
  domain: string;

  @Column({ name: 'domains', comment: '域名' })
  domains: string;

  @Column({ name: 'domain_count', comment: '域名数量' })
  domainCount: number;

  @Column({ name: 'pipeline_id', comment: '关联流水线id' })
  pipelineId: number;

  @Column({ name: 'apply_time', comment: '申请时间' })
  applyTime: number;

  @Column({ name: 'from_type', comment: '来源' })
  fromType: string;

  @Column({ name: 'cert_provider', comment: '证书颁发机构' })
  certProvider: string;

  @Column({ name: 'effective_time', comment: '生效时间' })
  effectiveTime: number;

  @Column({ name: 'expires_time', comment: '过期时间' })
  expiresTime: number;

  @Column({ name: 'cert_info', comment: '证书详情' })
  certInfo: string;

  @Column({ name: 'cert_file', comment: '证书下载' })
  certFile: string;

  @Column({
    name: 'create_time',
    comment: '创建时间',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createTime: Date;

  @Column({
    name: 'update_time',
    comment: '修改时间',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updateTime: Date;

  pipeline?: PipelineEntity;
}
