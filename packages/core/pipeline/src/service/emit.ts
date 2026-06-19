import { logger } from "@certd/basic";
import { Pipeline, Runnable } from "../dt";

export type PipelineEventListener = (...args: any[]) => Promise<void>;
export type PipelineEvent<T> = {
  pipeline: Pipeline;
  step: Runnable;
  event: T;
};
export class PipelineEmitter {
  events: Record<string, PipelineEventListener[]>;
  constructor() {
    this.events = {};
  }
  on(event: string, listener: PipelineEventListener) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }
  async emit<T>(name: string, event: PipelineEvent<T>) {
    const listeners = this.events[name];
    if (listeners) {
      for (const listener of listeners) {
        try {
          await listener(event);
        } catch (e) {
          logger.error(`事件<${name}>监听器执行失败:`, e);
        }
      }
    }
  }
  off(event: string, listener: PipelineEventListener) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(l => l !== listener);
    }
  }
  once(event: string, listener: PipelineEventListener) {
    const onceListener = async (...args: any[]) => {
      this.off(event, onceListener);
      await listener(...args);
    };
    this.on(event, onceListener);
  }
}

export const pipelineEmitter = new PipelineEmitter();

export type TaskEmitterCreateReq = {
  step: Runnable;
  pipeline: Pipeline;
};

export type TaskEmitter = {
  emit: <T>(name: string, event: T) => Promise<void>;
};

export function taskEmitterCreate(req: TaskEmitterCreateReq) {
  return {
    emit: async <T>(name: string, event: T) => {
      await pipelineEmitter.emit(name, {
        pipeline: req.pipeline,
        step: req.step,
        event,
      });
    },
  } as TaskEmitter;
}
