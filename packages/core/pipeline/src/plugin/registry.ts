import { createRegistry, OnRegisterContext } from "../registry/index.js";
import { AbstractTaskPlugin } from "./api.js";
import { pluginGroups } from "./group.js";

const onRegister = ({ key, value }: OnRegisterContext<AbstractTaskPlugin>) => {
  //如果有相同名字的先移除

  for (const group of Object.values(pluginGroups)) {
    const index = group.plugins.findIndex(plugin => plugin.name === key);
    if (index > -1) {
      group.plugins.splice(index, 1);
    }
  }

  const group = value?.define?.group as string;
  if (group) {
    if (pluginGroups.hasOwnProperty(group)) {
      // @ts-ignore
      pluginGroups[group].plugins.push(value.define);
      return;
    }
  }
  pluginGroups.other.plugins.push(value.define);
};

const onUnRegister = ({ key }: OnRegisterContext<AbstractTaskPlugin>) => {
  for (const group of Object.values(pluginGroups)) {
    const index = group.plugins.findIndex(plugin => plugin.name === key);
    if (index > -1) {
      group.plugins.splice(index, 1);
      return;
    }
  }
};

export const pluginRegistry = createRegistry<AbstractTaskPlugin>("plugin", onRegister, onUnRegister);
