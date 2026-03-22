import { reactive, ref } from "vue";

export class CopyeStore {
  type: "step" | "steps" | "task" | "tasks";
  target: any;

  getCopyedCount() {
    if (this.type === "step") {
      return 1;
    } else if (this.type === "steps") {
      return this.target.length;
    } else if (this.type === "task") {
      return 1;
    } else if (this.type === "tasks") {
      return this.target.length;
    } else {
      return 0;
    }
  }

  setStep(target: any) {
    this.target = target;
    this.type = "step";
  }
  setSteps(target: any) {
    this.target = target;
    this.type = "steps";
  }
  setTask(target: any) {
    this.target = target;
    this.type = "task";
  }
  setTasks(target: any) {
    this.target = target;
    this.type = "tasks";
  }
}

export const Copyed: any = reactive(new CopyeStore());
