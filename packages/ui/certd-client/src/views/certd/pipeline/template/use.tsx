import { compute, dict, useFormWrapper } from "@fast-crud/fast-crud";
import { checkPipelineLimit, eachSteps } from "/@/views/certd/pipeline/utils";
import { templateApi } from "/@/views/certd/pipeline/template/api";
import TemplateForm from "./form.vue";
import NotificationSelector from "/@/views/certd/notification/notification-selector/index.vue";
import GroupSelector from "/@/views/certd/pipeline/group/group-selector.vue";
import { ref } from "vue";
import { fillPipelineByDefaultForm } from "/@/views/certd/pipeline/certd-form/use";
import { cloneDeep } from "lodash-es";
import { useI18n } from "vue-i18n";

export function createExtraColumns() {
  const groupDictRef = dict({
    url: "/pi/pipeline/group/all",
    value: "id",
    label: "name",
  });
  const { t } = useI18n();
  const randomHour = Math.floor(Math.random() * 6);
  const randomMin = Math.floor(Math.random() * 60);
  return {
    // triggerCron: {
    //   title: "定时触发",
    //   type: "text",
    //   form: {
    //     value: `0 ${randomMin} ${randomHour} * * *`,
    //     component: {
    //       name: "cron-editor",
    //       vModel: "modelValue",
    //       placeholder: "0 0 4 * * *",
    //     },
    //     col: {
    //       span: 24,
    //     },
    //     helper: "点击上面的按钮，选择每天几点定时执行。\n建议设置为每天触发一次，证书未到期之前任务会跳过，不会重复执行",
    //     order: 100,
    //   },
    // },

    random: {
      title: "定时类型",
      form: {
        value: true,
        helper: "是否给流水线随机设置一个时间",
        show: compute(({ form }) => {
          return form.clear !== true;
        }),
        component: {
          name: "fs-dict-switch",
          vModel: "checked",
          dict: dict({
            data: [
              {
                label: "随机时间",
                value: true,
              },
              {
                label: "固定时间",
                value: false,
              },
            ],
          }),
        },
      },
    },
    randomRange: {
      title: "随机时间范围",
      form: {
        value: ["00:00:00", "08:00:00"],
        helper: "随机时间范围，单位秒",
        component: {
          //  <a-time-range-picker :bordered="false" />
          name: "a-time-range-picker",
          vModel: "value",
          valueFormat: "HH:mm:ss",
        },
        show: compute(({ form }) => {
          return form.clear !== true && form.random === true;
        }),
        rules: [{ required: true, message: "请选择随机时间范围" }],
      },
    },
    triggerCron: {
      title: t("certd.schedule"),
      form: {
        component: {
          name: "cron-editor",
          vModel: "modelValue",
        },
        show: compute(({ form }) => {
          return form.clear !== true && form?.random !== true;
        }),
        rules: [{ required: true, message: t("certd.selectCron") }],
      },
    },
    notification: {
      title: "失败通知",
      type: "text",
      form: {
        value: 0,
        component: {
          name: NotificationSelector,
          vModel: "modelValue",
          on: {
            selectedChange(opts: any) {
              opts.form.notificationTarget = opts.$event;
            },
          },
        },
        order: 101,
        helper: "任务执行失败实时提醒",
      },
    },
    groupId: {
      title: "流水线分组",
      type: "dict-select",
      dict: groupDictRef,
      form: {
        component: {
          name: GroupSelector,
          vModel: "modelValue",
        },
        order: 999,
      },
    },
  };
}

export async function createPipelineByTemplate(opts: { templateId: number; title: string; groupId?: string; pipeline: any; templateForm: any; keepHistoryCount?: number }) {
  const { title, groupId, pipeline, templateForm, keepHistoryCount, templateId } = opts;
  //填充模版参数
  const steps: any = {};
  eachSteps(pipeline, (step: any) => {
    steps[step.id] = step;
  });

  for (const stepId in templateForm) {
    const step = steps[stepId];
    const tempStep = templateForm[stepId];
    if (step) {
      for (const key in tempStep) {
        step.input[key] = tempStep[key];
      }
    }
  }

  pipeline.title = title;
  return await templateApi.CreatePipelineByTemplate({
    title,
    content: JSON.stringify(pipeline),
    keepHistoryCount: keepHistoryCount ?? 30,
    groupId,
    templateId,
  });
}

export function useTemplate() {
  const { openCrudFormDialog } = useFormWrapper();

  async function openCreateFromTemplateDialog(req: { templateId?: number; onCreated?: (ctx: any) => void }) {
    //检查是否流水线数量超出限制
    await checkPipelineLimit();
    const detail = await templateApi.GetDetail(req.templateId);
    if (!detail) {
      throw new Error("模板不存在");
    }
    if (!detail.template?.pipelineId) {
      throw new Error("还未绑定模版流水线");
    }
    const templateProps = JSON.parse(detail.template.content || "{}");
    const pipeline = detail.pipeline;

    const wrapperRef = ref();
    function getFormData() {
      if (!wrapperRef.value) {
        return null;
      }
      return wrapperRef.value.getFormData();
    }

    const templateFormRef = ref();

    async function doSubmit(opts: { form: any }) {
      const form = opts.form;
      await templateFormRef.value.validate();

      const tempInputs = templateFormRef.value.getForm();

      let newPipeline = cloneDeep(pipeline);
      newPipeline = fillPipelineByDefaultForm(newPipeline, form);
      //填充模版参数
      const { id } = await createPipelineByTemplate({
        templateId: detail.template.id,
        templateForm: tempInputs,
        pipeline: newPipeline,
        title: form.title,
        groupId: form.groupId,
      });
      if (req.onCreated) {
        req.onCreated({ id });
      }
    }

    const crudOptions = {
      form: {
        doSubmit,
        wrapper: {
          title: `从模版<${detail.template.title}>创建流水线`,
          width: 1100,
          slots: {
            "form-body-top": () => {
              return (
                <div class={"w-full flex"}>
                  <TemplateForm ref={templateFormRef} input={templateProps.input} pipeline={pipeline} />
                </div>
              );
            },
          },
        },
      },
      columns: {
        title: {
          title: "流水线标题",
          type: "text",
          form: {
            component: {
              placeholder: "请输入流水线标题",
            },
            rules: [{ required: true, message: "请输入流水线标题" }],
          },
        },
        ...createExtraColumns(),
      },
    };

    const wrapper = await openCrudFormDialog({ crudOptions });
    wrapperRef.value = wrapper;
  }

  return {
    openCreateFromTemplateDialog,
  };
}
