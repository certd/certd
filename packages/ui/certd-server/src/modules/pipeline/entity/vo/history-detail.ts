import { HistoryEntity } from '../history.js';
import { HistoryLogEntity } from '../history-log.js';

export class HistoryDetail {
  history: HistoryEntity;
  log: HistoryLogEntity;

  constructor(history: HistoryEntity, log: HistoryLogEntity) {
    this.history = history;
    this.log = log;
  }
}
