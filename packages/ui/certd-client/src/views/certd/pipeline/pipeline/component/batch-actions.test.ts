import { describe, expect, it } from "vitest";
import { disableTasks, disableSteps, enableSteps, enableTasks, getStageWidth, removeSelectedItems, setStageWidth } from "./batch-actions";

describe("pipeline batch actions", () => {
  it("removes only selected items", () => {
    const items = [{ id: "first" }, { id: "second" }, { id: "third" }];

    const result = removeSelectedItems(items, new Set(["first", "third"]));

    expect(result).toEqual([{ id: "second" }]);
  });

  it("disables selected tasks and all of their steps", () => {
    const tasks = [
      { id: "first", disabled: false, steps: [{ id: "first-step", disabled: false }] },
      { id: "second", disabled: false, steps: [{ id: "second-step", disabled: false }] },
    ];

    const result = disableTasks(tasks, new Set(["first"]));

    expect(result).toEqual([
      { id: "first", disabled: true, steps: [{ id: "first-step", disabled: true }] },
      { id: "second", disabled: false, steps: [{ id: "second-step", disabled: false }] },
    ]);
  });

  it("enables selected tasks and all of their steps", () => {
    const tasks = [
      { id: "first", disabled: true, steps: [{ id: "first-step", disabled: true }] },
      { id: "second", disabled: true, steps: [{ id: "second-step", disabled: true }] },
    ];

    const result = enableTasks(tasks, new Set(["first"]));

    expect(result).toEqual([
      { id: "first", disabled: false, steps: [{ id: "first-step", disabled: false }] },
      { id: "second", disabled: true, steps: [{ id: "second-step", disabled: true }] },
    ]);
  });

  it("disables selected steps without changing other steps", () => {
    const steps = [
      { id: "first", disabled: false },
      { id: "second", disabled: false },
    ];

    const result = disableSteps(steps, new Set(["second"]));

    expect(result).toEqual([
      { id: "first", disabled: false },
      { id: "second", disabled: true },
    ]);
  });

  it("enables selected steps without changing other steps", () => {
    const steps = [
      { id: "first", disabled: true },
      { id: "second", disabled: true },
    ];

    const result = enableSteps(steps, new Set(["second"]));

    expect(result).toEqual([
      { id: "first", disabled: true },
      { id: "second", disabled: false },
    ]);
  });

  it("uses the default width when a stage has no valid configured width", () => {
    expect(getStageWidth({ id: "default" })).toBe(300);
    expect(getStageWidth({ id: "invalid", style: { width: "wide" } })).toBe(300);
  });

  it("stores the resized stage width in style while preserving other style settings", () => {
    const stage = { id: "stage", style: { color: "blue" } };

    setStageWidth(stage, 484.6);

    expect(stage.style).toEqual({ color: "blue", width: 485 });
  });

  it("constrains stage widths to keep the stage usable", () => {
    const stage = { id: "stage" };

    setStageWidth(stage, 100);
    expect(getStageWidth(stage)).toBe(260);

    setStageWidth(stage, 1000);
    expect(getStageWidth(stage)).toBe(720);
  });
});
