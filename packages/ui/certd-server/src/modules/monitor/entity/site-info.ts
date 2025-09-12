import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 */
@Entity('cd_site_info')
export class SiteInfoEntity {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ name: 'user_id', comment: '用户id' })
  userId: number;
  @Column({ name: 'name', comment: '站点名称', length: 100 })
  name: string;
  @Column({ name: 'domain', comment: '域名', length: 100 })
  domain: string;

  @Column({ name: 'https_port', comment: '端口' })
  httpsPort: number;

  @Column({ name: 'cert_domains', comment: '证书域名', length: 4096 })
  certDomains: string;
  @Column({ name: 'cert_info', comment: '证书详情', length: 4096 })
  certInfo: string;
  @Column({ name: 'cert_status', comment: '证书状态', length: 100 })
  certStatus: string;

  @Column({ name: 'cert_provider', comment: '证书颁发机构', length: 100 })
  certProvider: string;

  @Column({ name: 'cert_effective_time', comment: '证书生效时间' })
  certEffectiveTime: number;
  @Column({ name: 'cert_expires_time', comment: '证书到期时间' })
  certExpiresTime: number;
  @Column({ name: 'last_check_time', comment: '上次检查时间' })
  lastCheckTime: number;
  @Column({ name: 'check_status', comment: '检查状态' })
  checkStatus: string;
  @Column({ name: 'error', comment: '错误信息' })
  error: string;
  @Column({ name: 'pipeline_id', comment: '关联流水线id' })
  pipelineId: number;

  @Column({ name: 'cert_info_id', comment: '证书id' })
  certInfoId: number;


  @Column({ name: 'ip_check', comment: '是否检查IP' })
  ipCheck: boolean;

  @Column({ name: 'ip_count', comment: 'ip数量' })
  ipCount: number

  @Column({ name: 'ip_error_count', comment: 'ip异常数量' })
  ipErrorCount: number


  @Column({ name: 'disabled', comment: '禁用启用' })
  disabled: boolean;

  @Column({ name: 'create_time', comment: '创建时间', default: () => 'CURRENT_TIMESTAMP' })
  createTime: Date;
  @Column({ name: 'update_time', comment: '修改时间', default: () => 'CURRENT_TIMESTAMP' })
  updateTime: Date;
}
