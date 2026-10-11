import * as api from "./api";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import SuiteValue from "./suite-value.vue";
import SuiteValueEdit from "./suite-value-edit.vue";
import PriceEdit from "./price-edit.vue";
import DurationPriceValue from "/@/views/sys/suite/product/duration-price-value.vue";
import { useI18n } from "/src/locales";

export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const { t } = useI18n();
  const emit = context.emit;
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetList(query);
  };
  const editRequest = async ({ form, row }: EditReq) => {
    form.id = row.id;
    const res = await api.UpdateObj(form);
    return res;
  };
  const delRequest = async ({ row }: DelReq) => {
    return await api.DelObj(row.id);
  };

  const addRequest = async ({ form }: AddReq) => {
    const res = await api.AddObj(form);
    return res;
  };

  return {
    crudOptions: {
      table: {
        onRefreshed: () => {
          emit("refreshed");
        },
      },
      search: {
        show: false,
      },
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest,
      },
      pagination: {
        show: false,
        pageSize: 999999,
      },
      rowHandle: {
        minWidth: 200,
        fixed: "right",
      },
      form: {
        group: {
          groups: {
            base: {
              header: t("certd.common.basicInfo"),
              columns: ["title", "type", "disabled", "order", "supportBuy", "intro"],
            },
            content: {
              header: t("certd.suite.packageContent"),
              columns: ["content.maxDomainCount", "content.maxWildcardDomainCount", "content.maxPipelineCount", "content.maxDeployCount", "content.maxMonitorCount"],
            },
            price: {
              header: t("certd.suite.price"),
              columns: ["durationPrices"],
            },
          },
        },
      },
      columns: {
        // id: {
        //   title: "ID",
        //   key: "id",
        //   type: "number",
        //   column: {
        //     width: 100
        //   },
        //   form: {
        //     show: false
        //   }
        // },
        title: {
          title: t("certd.suite.packageName"),
          type: "text",
          search: {
            show: true,
          },
          form: {
            rules: [{ required: true, message: t("certd.common.requiredField") }],
          },
          column: {
            width: 200,
          },
        },
        type: {
          title: t("certd.common.type"),
          type: "dict-select",
          editForm: {
            component: {
              disabled: true,
            },
          },
          dict: dict({
            data: [
              { label: t("certd.suite"), value: "suite" },
              { label: t("certd.addon"), value: "addon" },
            ],
          }),
          form: {
            value: "suite",
            rules: [{ required: true, message: t("certd.common.requiredField") }],
            helper: t("certd.suite.typeHelper"),
          },
          column: {
            width: 80,
            align: "center",
          },
          valueBuilder: ({ row }) => {
            if (row.content) {
              row.content = JSON.parse(row.content);
            }
            if (row.durationPrices) {
              row.durationPrices = JSON.parse(row.durationPrices);
            }
          },
          valueResolve: ({ form }) => {
            if (form.content) {
              form.content = JSON.stringify(form.content);
            }
            if (form.durationPrices) {
              form.durationPrices = JSON.stringify(form.durationPrices);
            }
          },
        },
        "content.maxDomainCount": {
          title: t("certd.common.domainCount"),
          type: "text",
          form: {
            key: ["content", "maxDomainCount"],
            component: {
              name: SuiteValueEdit,
              vModel: "modelValue",
              unit: t("certd.suite.unitCount"),
            },
            rules: [{ required: true, message: t("certd.common.requiredField") }],
          },
          column: {
            width: 100,
            component: {
              name: SuiteValue,
              vModel: "modelValue",
              unit: t("certd.suite.unitCount"),
            },
          },
        },
        "content.maxWildcardDomainCount": {
          title: t("certd.suite.wildcardDomainCountPart"),
          type: "text",
          form: {
            key: ["content", "maxWildcardDomainCount"],
            helper: t("certd.suite.wildcardDomainCountHelper"),
            component: {
              name: SuiteValueEdit,
              vModel: "modelValue",
              unit: t("certd.suite.unitCount"),
            },
            rules: [{ required: true, message: t("certd.common.requiredField") }],
          },
          column: {
            width: 120,
            component: {
              name: SuiteValue,
              vModel: "modelValue",
              unit: t("certd.suite.unitCount"),
            },
          },
        },
        "content.maxPipelineCount": {
          title: t("certd.suite.pipelineCount"),
          type: "text",
          form: {
            key: ["content", "maxPipelineCount"],
            component: {
              name: SuiteValueEdit,
              vModel: "modelValue",
              unit: t("certd.suite.unitPipeline"),
            },
            rules: [{ required: true, message: t("certd.common.requiredField") }],
          },
          column: {
            width: 100,
            component: {
              name: SuiteValue,
              vModel: "modelValue",
              unit: t("certd.suite.unitPipeline"),
            },
          },
        },
        "content.maxDeployCount": {
          title: t("certd.suite.deployCount"),
          type: "text",
          form: {
            key: ["content", "maxDeployCount"],
            component: {
              name: SuiteValueEdit,
              vModel: "modelValue",
              unit: t("certd.suite.unitDeploy"),
            },
            rules: [{ required: true, message: t("certd.common.requiredField") }],
          },
          column: {
            width: 100,
            component: {
              name: SuiteValue,
              vModel: "modelValue",
              unit: t("certd.suite.unitDeploy"),
            },
          },
        },
        "content.maxMonitorCount": {
          title: t("certd.suite.monitorCount"),
          type: "text",
          form: {
            key: ["content", "maxMonitorCount"],
            component: {
              name: SuiteValueEdit,
              vModel: "modelValue",
              unit: t("certd.suite.unitCount"),
            },
            rules: [{ required: true, message: t("certd.common.requiredField") }],
          },
          column: {
            width: 120,
            component: {
              name: SuiteValue,
              vModel: "modelValue",
              unit: t("certd.suite.unitCount"),
            },
          },
        },
        durationPrices: {
          title: t("certd.suite.durationPriceTitle"),
          type: "text",
          form: {
            title: t("certd.suite.selectDuration"),
            component: {
              name: PriceEdit,
              vModel: "modelValue",
              edit: true,
              style: {
                minHeight: "120px",
              },
            },
            col: {
              span: 24,
            },
            rules: [{ required: true, message: t("certd.common.requiredField") }],
          },
          column: {
            component: {
              name: DurationPriceValue,
              vModel: "modelValue",
            },
            width: 350,
          },
        },
        supportBuy: {
          title: t("certd.suite.supportBuy"),
          type: "dict-switch",
          dict: dict({
            data: [
              { label: t("certd.suite.supportPurchase"), value: true, color: "success" },
              { label: t("certd.suite.cannotPurchase"), value: false, color: "gray" },
            ],
          }),
          form: {
            value: true,
          },
          column: {
            width: 120,
          },
        },
        disabled: {
          title: t("certd.suite.shelfStatus"),
          type: "dict-radio",
          dict: dict({
            data: [
              { value: false, label: t("certd.suite.onShelf"), color: "green" },
              { value: true, label: t("certd.suite.offShelf"), color: "gray" },
            ],
          }),
          form: {
            value: false,
          },
          column: {
            width: 100,
          },
        },
        order: {
          title: t("certd.suite.ordera"),
          type: "number",
          form: {
            helper: t("certd.suite.orderHelper"),
            value: 0,
          },
          column: {
            width: 100,
          },
        },
        intro: {
          title: t("certd.common.description"),
          type: "textarea",
          column: {
            width: 200,
          },
        },
        createTime: {
          title: t("certd.common.createTime"),
          type: "datetime",
          form: {
            show: false,
          },
          column: {
            sorter: true,
            width: 160,
            align: "center",
          },
        },
        updateTime: {
          title: t("certd.common.updateTime"),
          type: "datetime",
          form: {
            show: false,
          },
          column: {
            show: true,
            width: 160,
          },
        },
      },
    },
  };
}
