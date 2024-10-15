import { forEach } from "lodash-es";

export function eachStages(list: any[], exec: (item: any, runnableType: string) => void, runnableType: string = "stage") {
  if (!list || list.length <= 0) {
    return;
  }
  forEach(list, (item) => {
    exec(item, runnableType);
    if (runnableType === "stage") {
      eachStages(item.tasks, exec, "task");
    } else if (runnableType === "task") {
      eachStages(item.steps, exec, "step");
    }
  });
}
