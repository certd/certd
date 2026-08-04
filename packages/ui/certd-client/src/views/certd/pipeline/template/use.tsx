import { compute, dict, useFormWrapper } from "@fast-crud/fast-crud";
import { checkPipelineLimit, eachSteps } from "/@/views/certd/pipeline/utils";
import { templateApi } from "/@/views/certd/pipeline/template/api";
import TemplateForm from "./form.vue";
import NotificationSelector from "/@/views/certd/notification/notification-selector/index.vue";
import GroupSelector from "/@/views/certd/pipeline/group/group-selector.vue";
import { ref } from "vue";
import { fillPipelineByDefaultForm } from "/@/views/certd/pipeline/certd-form/use";
import { cloneDeep } from "lodash-es";
import { $t } from "/@/locales";

export function createExtraColumns() {
  const groupDictRef = dict({
    url: "/pi/pipeline/group/all",
    value: "id",
    label: "name",
  });
  const t = $t;
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
    //     helper: "点击上面的按钮，选择每天几点定时执行。\n建议设置为每天触发一times，证书未到期之前任务会跳过，不会重复执行",
    //     order: 100,
    //   },
    // },

    random: {
      title: "Schedule Type",
      form: {
        order: 100,
        value: true,
        helper: "Whether to assign a random time to the pipeline",
        show: compute(({ form }) => {
          return form.clear !== true;
        }),
        col: {
          span: 24,
        },
        component: {
          name: "fs-dict-radio",
          vModel: "value",
          dict: dict({
            data: [
              {
                label: "Random Time",
                value: true,
              },
              {
                label: "Fixed Time",
                value: false,
              },
            ],
          }),
        },
      },
    },
    randomRange: {
      title: "Random Time Range",
      form: {
        order: 100,
        value: ["00:00:00", "08:00:00"],
        helper: "Random time range, in seconds",
        component: {
          //  <a-time-range-picker :bordered="false" />
          name: "a-time-range-picker",
          vModel: "value",
          valueFormat: "HH:mm:ss",
        },
        show: compute(({ form }) => {
          return form.clear !== true && form.random === true;
        }),
        rules: [{ required: true, message: "Please select the random time range" }],
      },
    },
    triggerCron: {
      title: t("certd.schedule"),
      form: {
        order: 100,
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
    blank2: {
      form: {
        blank: true,
        order: 100,
      },
    },
    notification: {
      title: "Failure Notification",
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
        helper: "Real-time alerts for task execution failures",
      },
    },
    groupId: {
      title: "Pipeline groups",
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
    keepHistoryCount: keepHistoryCount ?? 100,
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
      throw new Error("Template does not exist");
    }
    if (!detail.template?.pipelineId) {
      throw new Error("No template pipeline is bound yet");
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
          title: `Create Pipeline from Template <${detail.template.title}>`,
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
          title: "Pipeline Title",
          type: "text",
          form: {
            component: {
              placeholder: "Please enter the pipeline title",
            },
            rules: [{ required: true, message: "Please enter the pipeline title" }],
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
