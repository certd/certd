import { OnRegisterContext, Registry } from "../registry/index.js";
import { AbstractTaskPlugin } from "./api.js";
import { pluginGroups } from "./group.js";

const onRegister = ({ key, value }: OnRegisterContext<AbstractTaskPlugin>) => {
  const group = value?.define?.group as string;
  if (group) {
    if (pluginGroups.hasOwnProperty(group)) {
      // @ts-ignore
      pluginGroups[group].plugins.push(value.define);
    } else {
      pluginGroups.other.plugins.push(value.define);
    }
  }
};
export const pluginRegistry = new Registry<AbstractTaskPlugin>("plugin", onRegister);
