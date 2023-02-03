import { PluginDefine, Pipeline } from "@certd/pipeline/src";
export * from "@certd/pipeline/src";
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
  doTrigger(options: { pipelineId }): Promise<void>;
  doSave(pipelineConfig: PipelineDefile): Promise<void>;
  getPipelineDetail(query: { pipelineId }): Promise<PipelineDetail>;
  getHistoryList(query: { pipelineId }): Promise<RunHistory[]>;
  getHistoryDetail(query: { historyId }): Promise<RunHistory>;
  getPlugins(): Promise<PluginDefine[]>;
};
