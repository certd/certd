import { PipelineEntity } from '../pipeline';
import { HistoryEntity } from '../history';
import { HistoryLogEntity } from '../history-log';

export class PipelineDetail {
  pipeline: PipelineEntity;
  constructor(pipeline: PipelineEntity) {
    this.pipeline = pipeline;
  }

  last: HistoryEntity;
  logs: HistoryLogEntity[];
}
