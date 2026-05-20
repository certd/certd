import { AddReq, compute, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { sysUserSuiteApi } from "./api";
import SuiteValueEdit from "/@/views/sys/suite/product/suite-value-edit.vue";
import SuiteValue from "/@/views/sys/suite/product/suite-value.vue";
import DurationValue from "/@/views/sys/suite/product/duration-value.vue";
import createCrudOptionsUser from "/@/views/sys/authority/user/crud";
import UserSuiteStatus from "/@/views/certd/suite/mine/user-suite-status.vue";
import SuiteDurationSelector from "../setting/suite-duration-selector.vue";
import dayjs from "dayjs";
import { useI18n } from "/src/locales";

export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const { t } = useI18n();
  const api = sysUserSuiteApi;
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetList(query);
  };
  const editRequest = async (req: EditReq) => {
    const { form, row } = req;
    form.id = row.id;
    const res = await api.UpdateObj(form);
    return res;
  };
  const delRequest = async (req: DelReq) => {
    const { row } = req;
    return await api.DelObj(row.id);
  };

  const addRequest = async (req: AddReq) => {
    const { form } = req;
    const res = await api.PresentSuite(form);
    return res;
  };

  return {
    crudOptions: {
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest,
      },
      form: {
        labelCol: {
          //固定label宽度
          span: null,
          style: {
            width: "100px",
          },
        },
        col: {
          span: 22,
        },
        wrapper: {
          width: 600,
        },
      },
      actionbar: {
        buttons: {
          add: { text: t("certd.gift_package") },
        },
      },

      toolbar: { show: false },
      rowHandle: {
        width: 200,
        fixed: "right",
        buttons: {
          view: { show: true },
          copy: { show: false },
          edit: { show: true },
          remove: { show: true },
          // continue:{
          //   text:"续期",
          //   type:"link",
          //   click(){
          //     console.log("续期");
          //   }
          // }
        },
      },
      columns: {
        id: {
          title: "ID",
          key: "id",
          type: "number",
          search: {
            show: false,
          },
          column: {
            width: 100,
            editable: {
              disabled: true,
            },
          },
          form: {
            show: false,
          },
        },
        title: {
          title: t("certd.package_name"),
          type: "text",
          search: {
            show: true,
          },
          form: {
            rules: [{ required: true, message: t("certd.field_required") }],
          },
          column: {
            width: 200,
          },
        },
        userId: {
          title: t("certd.usera"),
          type: "table-select",
          search: {
            show: true,
          },
          dict: dict({
            async getNodesByValues(ids: number[]) {
              return await api.GetSimpleUserByIds(ids);
            },
            value: "id",
            label: "nickName",
          }),
          editForm: {
            component: {
              disabled: true,
            },
          },
          form: {
            show: true,
            component: {
              disabled: false,
              crossPage: true,
              multiple: false,
              select: {
                placeholder: t("certd.click_to_select"),
              },
              createCrudOptions: createCrudOptionsUser,
              // crudOptionsOverride: crudOptionsOverride
            },
          },
        },
        //赠送
        presentSuiteId: {
          title: t("certd.gift_package"),
          type: "dict-select",
          column: { show: false },
          addForm: {
            show: true,
            component: {
              name: SuiteDurationSelector,
              vModel: "modelValue",
            },
            rules: [
              {
                validator: async (rule, value) => {
                  if (value && value.productId) {
                    return true;
                  }
                  throw new Error(t("certd.please_select_package"));
                },
              },
            ],
          },
          valueResolve({ form, value }) {
            if (value && value.productId) {
              form.productId = value.productId;
              form.duration = value.duration;
            }
          },
          form: { show: false },
        },
        productType: {
          title: t("certd.type"),
          type: "dict-select",
          editForm: {
            component: {
              disabled: true,
            },
          },
          dict: dict({
            data: [
              { label: t("certd.package"), value: "suite", color: "green" },
              { label: t("certd.addon_package"), value: "addon", color: "blue" },
            ],
          }),
          form: {
            show: true,
          },
          column: {
            width: 80,
            align: "center",
          },
          valueBuilder: ({ row }) => {
            if (row.content) {
              row.content = JSON.parse(row.content);
            }
          },
          valueResolve: ({ form }) => {
            if (form.content) {
              form.content = JSON.stringify(form.content);
            }
          },
        },
        "content.maxDomainCount": {
          title: t("certd.domain_count"),
          type: "text",
          form: {
            key: ["content", "maxDomainCount"],
            component: {
              name: SuiteValueEdit,
              vModel: "modelValue",
              unit: t("certd.unit_count"),
            },
            rules: [{ required: true, message: t("certd.field_required") }],
          },
          column: {
            width: 100,
            component: {
              name: SuiteValue,
              vModel: "modelValue",
              unit: t("certd.unit_count"),
            },
            align: "center",
          },
        },
        "content.maxWildcardDomainCount": {
          title: t("certd.wildcardDomainCountPart"),
          type: "text",
          form: {
            key: ["content", "maxWildcardDomainCount"],
            component: {
              name: SuiteValueEdit,
              vModel: "modelValue",
              unit: t("certd.unit_count"),
            },
            rules: [{ required: true, message: t("certd.field_required") }],
          },
          column: {
            width: 120,
            component: {
              name: SuiteValue,
              vModel: "modelValue",
              unit: t("certd.unit_count"),
            },
            align: "center",
          },
        },
        "content.maxPipelineCount": {
          title: t("certd.pipeline_count"),
          type: "text",
          form: {
            key: ["content", "maxPipelineCount"],
            component: {
              name: SuiteValueEdit,
              vModel: "modelValue",
              unit: t("certd.unit_item"),
            },
            rules: [{ required: true, message: t("certd.field_required") }],
          },
          column: {
            width: 100,
            component: {
              name: SuiteValue,
              vModel: "modelValue",
              unit: t("certd.unit_item"),
            },
            align: "center",
          },
        },
        "content.maxDeployCount": {
          title: t("certd.deploy_count"),
          type: "text",
          form: {
            key: ["content", "maxDeployCount"],
            component: {
              name: SuiteValueEdit,
              vModel: "modelValue",
              unit: t("certd.unit_times"),
            },
            rules: [{ required: true, message: t("certd.field_required") }],
          },
          column: {
            width: 100,
            component: {
              name: SuiteValue,
              vModel: "modelValue",
              unit: t("certd.unit_times"),
              used: compute(({ row }) => {
                return row.deployCountUsed;
              }),
            },
            align: "center",
          },
        },
        "content.maxMonitorCount": {
          title: t("certd.monitor_count"),
          type: "text",
          form: {
            key: ["content", "maxMonitorCount"],
            component: {
              name: SuiteValueEdit,
              vModel: "modelValue",
              unit: t("certd.unit_count"),
            },
            rules: [{ required: true, message: t("certd.field_required") }],
          },
          column: {
            width: 120,
            component: {
              name: SuiteValue,
              vModel: "modelValue",
              unit: t("certd.unit_count"),
            },
            align: "center",
          },
        },
        duration: {
          title: t("certd.duration"),
          type: "text",
          form: {
            rules: [{ required: true, message: t("certd.field_required") }],
          },
          column: {
            component: {
              name: DurationValue,
              vModel: "modelValue",
            },
            width: 100,
            align: "center",
          },
        },
        status: {
          title: t("certd.status"),
          type: "text",
          form: { show: false },
          column: {
            width: 100,
            align: "center",
            component: {
              name: UserSuiteStatus,
              userSuite: compute(({ row }) => {
                return row;
              }),
            },
            conditionalRender: {
              match() {
                return false;
              },
            },
          },
        },
        activeTime: {
          title: t("certd.active_time"),
          type: "date",
          column: {
            width: 150,
          },
          form: {
            show: false,
          },
        },
        expiresTime: {
          title: t("certd.expires_time"),
          type: "date",
          form: {
            valueBuilder: ({ value }) => {
              return dayjs(value);
            },
            valueResolve: ({ value }) => {
              //今天的最后一秒
              return dayjs(value).endOf("day").valueOf();
            },
          },
          column: {
            width: 150,
            component: {
              name: "expires-time-text",
              vModel: "value",
              mode: "tag",
              title: compute(({ value }) => {
                return dayjs(value).format("YYYY-MM-DD HH:mm:ss");
              }),
            },
          },
        },
        isPresent: {
          title: t("certd.is_present"),
          type: "dict-switch",
          dict: dict({
            data: [
              { label: t("certd.is_present_yes"), value: true, color: "success" },
              { label: t("certd.is_present_no"), value: false, color: "blue" },
            ],
          }),
          form: {
            value: true,
          },
          column: {
            width: 100,
            align: "center",
          },
        },
        deployCountUsed: {
          title: t("certd.deploy_count_used"),
          type: "number",
          form: {
            value: 0,
            rules: [{ required: true, message: t("certd.field_required") }],
          },
          column: {
            show: false,
          },
        },
        disabled: {
          title: t("certd.disabled"),
          type: "dict-switch",
          dict: dict({
            data: [
              { label: t("certd.enabledLabel"), value: false, color: "success" },
              { label: t("certd.disabledLabel"), value: true, color: "error" },
            ],
          }),
          form: {
            value: false,
          },
          column: {
            width: 100,
            align: "center",
          },
        },
        isEmpty: {
          title: t("certd.status"),
          type: "dict-switch",
          dict: dict({
            data: [
              { label: t("certd.normal"), value: false, color: "success" },
              { label: t("certd.used_up"), value: true, color: "gray" },
            ],
          }),
          form: {
            value: false,
          },
          column: {
            show: false,
          },
        },
        createTime: {
          title: t("certd.createTime"),
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
          title: t("certd.updateTime"),
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
