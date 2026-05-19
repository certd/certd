import { compute, CreateCrudOptionsProps, CreateCrudOptionsRet, dict, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { notification } from "ant-design-vue";
import * as api from "./api";
import PriceInput from "/@/views/sys/suite/product/price-input.vue";
import { useFormDialog } from "/@/use/use-dialog";

export default function ({ crudExpose }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const { openFormDialog } = useFormDialog();
  const levelDict = dict({
    url: "/sys/invite/level/list",
    value: "id",
    label: "name",
  });

  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetUserLevels(query);
  };

  async function openSetLevel(row: any) {
    await openFormDialog({
      title: "指定推广等级",
      wrapper: { width: 560 },
      initialForm: {
        userId: row.userId,
        levelId: row.levelId,
        levelLocked: row.levelLocked === true,
      },
      columns: {
        levelId: {
          title: "推广等级",
          type: "dict-select",
          dict: levelDict,
          form: {
            col: { span: 24 },
            rules: [{ required: true, message: "请选择推广等级" }],
          },
        },
        levelLocked: {
          title: "锁定等级",
          type: "dict-switch",
          dict: dict({
            data: [
              { label: "自动升级", value: false, color: "success" },
              { label: "锁定", value: true, color: "warning" },
            ],
          }),
          form: {
            col: { span: 24 },
            helper: "隐藏等级会自动锁定，不参与自动升级。",
          },
        },
      },
      async onSubmit(form: any) {
        await api.SetUserLevel(form);
        await crudExpose.doRefresh();
        notification.success({ message: "推广等级已更新" });
      },
    });
  }

  return {
    crudOptions: {
      request: { pageRequest },
      actionbar: { show: false },
      toolbar: { show: false },
      rowHandle: {
        width: 130,
        fixed: "right",
        buttons: {
          view: { show: false },
          edit: { show: false },
          copy: { show: false },
          remove: { show: false },
          setLevel: {
            text: "指定等级",
            type: "link",
            click: ({ row }) => openSetLevel(row),
          },
        },
      },
      columns: {
        userId: { title: "用户ID", type: "number", search: { show: true }, column: { width: 100 } },
        username: { title: "用户名", type: "text", search: { show: true }, column: { width: 160 } },
        userDisplay: { title: "显示名称", type: "text", column: { width: 160 } },
        enabled: {
          title: "开通状态",
          type: "dict-switch",
          dict: dict({
            data: [
              { label: "未开通", value: false, color: "default" },
              { label: "已开通", value: true, color: "success" },
            ],
          }),
          column: { width: 110, align: "center" },
        },
        levelId: {
          title: "当前等级",
          type: "dict-select",
          dict: levelDict,
          search: { show: true },
          column: { width: 130 },
        },
        levelLocked: {
          title: "升级方式",
          type: "dict-switch",
          dict: dict({
            data: [
              { label: "自动升级", value: false, color: "success" },
              { label: "锁定", value: true, color: "warning" },
            ],
          }),
          column: { width: 110, align: "center" },
        },
        isHidden: {
          title: "隐藏等级",
          type: "dict-switch",
          dict: dict({
            data: [
              { label: "否", value: false, color: "default" },
              { label: "是", value: true, color: "warning" },
            ],
          }),
          column: { width: 100, align: "center", show: compute(({ row }) => row.levelId) },
        },
        commissionRate: { title: "佣金比例", type: "number", column: { width: 110, align: "center", cellRender: ({ value }) => (value == null ? "-" : `${value}%`) } },
        promotionAmount: {
          title: "累计推广金额",
          type: "number",
          column: { width: 140, component: { name: PriceInput, vModel: "modelValue", edit: false } },
        },
        createTime: { title: "开通时间", type: "datetime", column: { width: 170 } },
        updateTime: { title: "更新时间", type: "datetime", column: { width: 170 } },
      },
    },
  };
}
