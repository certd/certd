import { PipelineEntity } from '../pipeline.js';
import { HistoryEntity } from '../history.js';
import { HistoryLogEntity } from '../history-log.js';

export class PipelineDetail {
  pipeline: PipelineEntity;
  constructor(pipeline: PipelineEntity) {
    this.pipeline = pipeline;
  }

  last: HistoryEntity;
  logs: HistoryLogEntity[];
}
