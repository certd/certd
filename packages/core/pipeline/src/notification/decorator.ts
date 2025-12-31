// src/decorator/memoryCache.decorator.ts
import { Decorator } from "../decorator/index.js";
import * as _ from "lodash-es";
import { merge } from "lodash-es";
import { notificationRegistry } from "./registry.js";
import { BaseNotification, NotificationBody, NotificationContext, NotificationDefine, NotificationInputDefine, NotificationInstanceConfig } from "./api.js";

// 提供一个唯一 key
export const NOTIFICATION_CLASS_KEY = "pipeline:notification";
export const NOTIFICATION_INPUT_KEY = "pipeline:notification:input";

export function IsNotification(define: NotificationDefine): ClassDecorator {
  return (target: any) => {
    if (process.env.certd_plugin_loadmode === "metadata") {
      return;
    }
    target = Decorator.target(target);

    const inputs: any = {};
    const properties = Decorator.getClassProperties(target);
    for (const property in properties) {
      const input = Reflect.getMetadata(NOTIFICATION_INPUT_KEY, target, property);
      if (input) {
        inputs[property] = input;
      }
    }
    _.merge(define, { input: inputs });
    Reflect.defineMetadata(NOTIFICATION_CLASS_KEY, define, target);
    target.define = define;
    notificationRegistry.register(define.name, {
      define,
      target: async () => {
        return target;
      },
    });
  };
}

export function NotificationInput(input?: NotificationInputDefine): PropertyDecorator {
  return (target, propertyKey) => {
    if (process.env.certd_plugin_loadmode === "metadata") {
      return;
    }
    target = Decorator.target(target, propertyKey);
    // const _type = Reflect.getMetadata("design:type", target, propertyKey);
    Reflect.defineMetadata(NOTIFICATION_INPUT_KEY, input, target, propertyKey);
  };
}

export async function newNotification(type: string, input: any, ctx: NotificationContext) {
  const register = notificationRegistry.get(type);
  if (register == null) {
    throw new Error(`notification ${type} not found`);
  }
  // @ts-ignore
  const pluginCls = await register.target();
  // @ts-ignore
  const plugin = new pluginCls();
  merge(plugin, input);
  if (!ctx) {
    throw new Error("ctx is required");
  }
  plugin.setDefine(register.define);
  plugin.setCtx(ctx);
  await plugin.onInstance();
  return plugin;
}

export async function sendNotification(opts: { config: NotificationInstanceConfig; ctx: NotificationContext; body: NotificationBody }) {
  const notification: BaseNotification = await newNotification(opts.config.type, opts.config.setting, opts.ctx);
  await notification.doSend(opts.body);
}
