import { Pipeline } from "@certd/pipeline";
export * from "@certd/pipeline";
export type PipelineDetail = {
  pipeline: Pipeline;
};

export type RunHistory = {
  id: any;
  pipeline: Pipeline;
  logs?: {
    [id: string]: string[];
  };
};

export type PipelineOptions = {
  doTrigger(options: { pipelineId: number }): Promise<void>;
  doSave(pipelineConfig: Pipeline): Promise<void>;
  getPipelineDetail(query: { pipelineId: number }): Promise<PipelineDetail>;
  getHistoryList(query: { pipelineId: number }): Promise<RunHistory[]>;
  getHistoryDetail(query: { historyId: number }): Promise<RunHistory>;
  getPlugins(): Promise<Pipeline[]>;
};
