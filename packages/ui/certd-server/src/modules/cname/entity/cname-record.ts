import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
export type CnameRecordStatusType = 'cname' | 'validating' | 'valid' | 'error';
/**
 * cname record配置
 */
@Entity('cd_cname_record')
export class CnameRecordEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ comment: '用户ID', name: 'user_id' })
  userId: number;

  @Column({ comment: '证书申请域名', length: 100 })
  domain: string;

  @Column({ comment: '主机记录', name: 'host_record', length: 100 })
  hostRecord: string;

  @Column({ comment: '记录值', name: 'record_value', length: 200 })
  recordValue: string;

  @Column({ comment: 'CNAME提供者', name: 'cname_provider_id' })
  cnameProviderId: number;

  @Column({ comment: '验证状态', length: 20 })
  status: string;

  @Column({
    comment: '创建时间',
    name: 'create_time',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createTime: Date;
  @Column({
    comment: '修改时间',
    name: 'update_time',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updateTime: Date;
}
