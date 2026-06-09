import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("cd_oauth_bound")
export class OauthBoundEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "user_id", comment: "用户id" })
  userId: number;

  @Column({ name: "type", comment: "第三方类型" })
  type: string; // oidc, wechat, github, gitee , qq , alipay

  @Column({ name: "open_id", comment: "第三方openid" })
  openId: string;

  @Column({ name: "create_time", comment: "创建时间", default: () => "CURRENT_TIMESTAMP" })
  createTime: Date;

  @Column({ name: "update_time", comment: "修改时间", default: () => "CURRENT_TIMESTAMP" })
  updateTime: Date;
}
