import type { Pipeline } from "@certd/pipeline";
import { PluginGroups } from "/@/store/plugin";

export type PipelineDetail = {
  pipeline: Pipeline;
  validTime?: number;
  webhookKey?: string;
};

export type RunHistory = {
  id: any;
  pipeline: Pipeline;
  logs?: {
    [id: string]: string[];
  };
};

export type PipelineOptions = {
  doTrigger(options: { pipelineId: number; stepId?: string }): Promise<void>;
  doSave(pipelineConfig: Pipeline): Promise<{ id: number; version: number }>;
  getPipelineDetail(query: { pipelineId: number }): Promise<PipelineDetail>;
  getHistoryList(query: { pipelineId: number }): Promise<RunHistory[]>;
  getHistoryDetail(query: { historyId: number }): Promise<RunHistory>;
  getPluginGroups(): Promise<PluginGroups>;
};
