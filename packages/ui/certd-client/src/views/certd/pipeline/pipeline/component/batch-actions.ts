export type PipelineItem = {
  id: string;
  disabled?: boolean;
};

export type PipelineTask = PipelineItem & {
  steps?: PipelineItem[];
};

export type PipelineStage = {
  id: string;
  style?: Record<string, unknown>;
};

const defaultStageWidth = 300;
const minStageWidth = 260;
const maxStageWidth = 720;

export function removeSelectedItems<T extends PipelineItem>(items: T[], selectedIds: ReadonlySet<string>): T[] {
  return items.filter(item => !selectedIds.has(item.id));
}

export function disableTasks<T extends PipelineTask>(tasks: T[], selectedIds: ReadonlySet<string>): T[] {
  return setTasksDisabled(tasks, selectedIds, true);
}

export function enableTasks<T extends PipelineTask>(tasks: T[], selectedIds: ReadonlySet<string>): T[] {
  return setTasksDisabled(tasks, selectedIds, false);
}

function setTasksDisabled<T extends PipelineTask>(tasks: T[], selectedIds: ReadonlySet<string>, disabled: boolean): T[] {
  return tasks.map(task => {
    if (!selectedIds.has(task.id)) {
      return task;
    }

    const steps = task.steps?.map(step => ({ ...step, disabled }));
    return { ...task, disabled, steps } as T;
  });
}

export function disableSteps<T extends PipelineItem>(steps: T[], selectedIds: ReadonlySet<string>): T[] {
  return setStepsDisabled(steps, selectedIds, true);
}

export function enableSteps<T extends PipelineItem>(steps: T[], selectedIds: ReadonlySet<string>): T[] {
  return setStepsDisabled(steps, selectedIds, false);
}

function setStepsDisabled<T extends PipelineItem>(steps: T[], selectedIds: ReadonlySet<string>, disabled: boolean): T[] {
  return steps.map(step => {
    if (!selectedIds.has(step.id)) {
      return step;
    }

    return { ...step, disabled } as T;
  });
}

export function getStageWidth(stage: PipelineStage): number {
  const width = stage.style?.width;
  if (typeof width !== "number" || !Number.isFinite(width)) {
    return defaultStageWidth;
  }
  return Math.min(Math.max(Math.round(width), minStageWidth), maxStageWidth);
}

export function setStageWidth(stage: PipelineStage, width: number): number {
  const nextWidth = Math.min(Math.max(Math.round(width), minStageWidth), maxStageWidth);
  stage.style = { ...stage.style, width: nextWidth };
  return nextWidth;
}
