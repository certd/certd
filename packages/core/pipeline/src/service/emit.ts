import { logger } from "@certd/basic";
export type PipelineEventListener = (...args: any[]) => Promise<void>;
export class PipelineEmitter<T> implements TaskEmitter<T> {
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
  async emit<T>(name: string, event: T) {
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

export type TaskEmitter<T> = {
  emit: (name: string, event: T) => Promise<void>;
};
