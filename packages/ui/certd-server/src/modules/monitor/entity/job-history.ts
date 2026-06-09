import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { PipelineEntity } from "../../pipeline/entity/pipeline.js";

@Entity("cd_job_history")
export class JobHistoryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "user_id", comment: "用户id" })
  userId: number;

  @Column({ name: "project_id", comment: "项目id" })
  projectId: number;

  @Column({ name: "type", comment: "类型" })
  type: string;

  @Column({ name: "title", comment: "标题" })
  title: string;

  @Column({ name: "content", comment: "内容" })
  content: string;

  @Column({ name: "related_id", comment: "关联id" })
  relatedId: string;

  @Column({ name: "result", comment: "结果" })
  result: string;

  @Column({ name: "start_at", comment: "开始时间" })
  startAt: number;

  @Column({ name: "end_at", comment: "结束时间" })
  endAt: number;

  @Column({
    name: "create_time",
    comment: "创建时间",
    default: () => "CURRENT_TIMESTAMP",
  })
  createTime: Date;

  @Column({
    name: "update_time",
    comment: "修改时间",
    default: () => "CURRENT_TIMESTAMP",
  })
  updateTime: Date;

  pipeline?: PipelineEntity;
}
