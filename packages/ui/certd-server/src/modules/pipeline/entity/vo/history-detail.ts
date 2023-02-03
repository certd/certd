import { HistoryEntity } from '../history';
import { HistoryLogEntity } from '../history-log';

export class HistoryDetail {
  history: HistoryEntity;
  log: HistoryLogEntity;

  constructor(history: HistoryEntity, log: HistoryLogEntity) {
    this.history = history;
    this.log = log;
  }
}
