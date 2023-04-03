import "@fast-crud/fast-bpmn/dist/style.css";
import FastBpmn, { FsBpmnSetupOptions, PanelComponentItem, Base, Shape } from "@fast-crud/fast-bpmn";

const fsBpmnOpts: FsBpmnSetupOptions = {
  // 注册panel公共组件
  // @ts-ignore
  registerPanelComponents(element: Base): Record<string, PanelComponentItem> {
    return {};
  },
  //自定义增强contextPad
  createEnhancementContextPadActions(provider) {
    const actions: Record<string, any> = {};
    const appendUserTask = (event: Event, element: Shape) => {
      const shape = provider.elementFactory.createShape({ type: "bpmn:UserTask" });
      provider.create.start(event, shape, {
        source: element
      });
    };

    const append = provider.autoPlace
      ? // @ts-ignore
        (event: Event, element: Shape) => {
          const shape = provider.elementFactory.createShape({ type: "bpmn:UserTask" });
          provider.autoPlace.append(element, shape);
        }
      : appendUserTask;

    // 添加创建用户任务按钮
    actions["append.append-user-task"] = {
      group: "model",
      className: "bpmn-icon-user-task",
      title: "用户任务",
      action: {
        dragstart: appendUserTask,
        click: append
      }
    };

    // 添加一个与edit一组的按钮
    actions["enhancement-op-1"] = {
      group: "edit",
      className: "enhancement-op",
      title: "扩展操作1",
      action: {
        // @ts-ignore
        click: function (e: Event) {
          alert("点击 扩展操作1");
        }
      }
    };

    // 添加一个新分组的自定义按钮
    actions["enhancement-op"] = {
      group: "enhancement",
      className: "enhancement-op",
      title: "扩展操作2",
      action: {
        // @ts-ignore
        click: function (e: Event) {
          alert("点击 扩展操作2");
        }
      }
    };

    return actions;
  },

  //自定义重写contextPad
  // @ts-ignore
  createRewriteContextPadActions(provider: any, element: Base) {
    const actions: Record<string, any> = {};

    // 添加一个与edit一组的按钮
    actions["enhancement-op-1"] = {
      group: "edit",
      className: "enhancement-op",
      title: "扩展操作1",
      action: {
        // @ts-ignore
        click: function (e: Event) {
          alert("点击 扩展操作1");
        }
      }
    };

    // 添加一个新分组的自定义按钮
    actions["enhancement-op"] = {
      group: "enhancement",
      className: "enhancement-op",
      title: "扩展操作2",
      action: {
        // @ts-ignore
        click: function (e: Event) {
          alert("点击 扩展操作2");
        }
      }
    };

    return actions;
  }
} as FsBpmnSetupOptions;

export default function (app: any, i18n: any) {
  fsBpmnOpts.i18n = i18n.global;
  app.use(FastBpmn, fsBpmnOpts);
}
