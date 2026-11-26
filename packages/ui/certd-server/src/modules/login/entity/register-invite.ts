import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

/**
 * 注册邀请（一次性）：
 * 仅保存 token 的 SHA-256 哈希，明文 token 只在创建时返回一次。
 * 消费时用条件 UPDATE 原子领取，确保并发下只能成功注册一次。
 */
@Entity("cd_register_invite")
export class RegisterInviteEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Index({ unique: true })
  @Column({ name: "token_hash", comment: "邀请token的SHA256哈希(hex)", length: 64 })
  tokenHash: string;

  @Column({ name: "created_by", comment: "创建人userId" })
  createdBy: number;

  @Column({ name: "expires_time", comment: "过期时间(ms)", type: "bigint" })
  expiresTime: number;

  @Column({ name: "used_time", comment: "使用时间(ms)", type: "bigint", nullable: true })
  usedTime: number;

  @Column({ name: "used_user_id", comment: "注册用户id", nullable: true })
  usedUserId: number;

  @Column({ name: "used_user_name", comment: "注册用户名(快照)", length: 100, nullable: true })
  usedUserName: string;

  @Column({ comment: "备注", length: 255, nullable: true })
  remark: string;

  @Column({ name: "create_time", comment: "生成时间", default: () => "CURRENT_TIMESTAMP" })
  createTime: Date;
}
