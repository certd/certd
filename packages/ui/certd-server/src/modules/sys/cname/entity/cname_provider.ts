import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * cname配置
 */
@Entity('cd_cname_provider')
export class CnameProviderEntity {
  @PrimaryGeneratedColumn()
  id: number;
  @Column({ comment: '域名', length: 100 })
  domain: string;
  @Column({ comment: 'DNS提供商类型', name: 'dns_provider_type', length: 20 })
  dnsProviderType: string;
  @Column({ comment: 'DNS授权Id', name: 'access_id' })
  accessId: number;
  @Column({ comment: '是否默认', name: 'is_default' })
  isDefault: boolean;
  @Column({ comment: '是否禁用', name: 'disabled' })
  disabled: boolean;
  @Column({ comment: '备注', length: 200 })
  remark: string;

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
