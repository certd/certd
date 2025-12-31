import { AbstractTaskPlugin, TaskInstanceContext } from "@certd/pipeline";
import { isPlus } from "@certd/plus-core";

export function mustPlus() {
  if (!isPlus()) {
    throw new Error("此插件仅供专业版中使用");
  }
}

export abstract class AbstractPlusTaskPlugin extends AbstractTaskPlugin {
  setCtx(ctx: TaskInstanceContext) {
    super.setCtx(ctx);
    mustPlus();
  }

  abstract execute(): Promise<void>;
}
