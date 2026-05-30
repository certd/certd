import { compute, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { Modal, message, notification } from "ant-design-vue";
import { Ref, ref } from "vue";
import * as api from "./api";
import { useFormDialog } from "/@/use/use-dialog";
import createCrudOptionsUser from "/@/views/sys/authority/user/crud";
import { downloadFileFromBlobPart } from "/@/vben/shared/utils/download";

export default function ({ crudExpose, context }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const { openFormDialog } = useFormDialog();
  const selectedRowKeys: Ref<any[]> = ref([]);
  context.selectedRowKeys = selectedRowKeys;

  const productDict = dict({
    url: "/sys/suite/product/list",
    value: "id",
    label: "title",
  });

  const statusDict = dict({
    data: [
      { label: "未使用", value: "unused", color: "success" },
      { label: "已使用", value: "used", color: "processing" },
      { label: "已禁用", value: "disabled", color: "default" },
    ],
  });
  const userDict = dict({
    async getNodesByValues(ids: number[]) {
      return await api.GetSimpleUserByIds(ids);
    },
    value: "id",
    label: "nickName",
  });

  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetList(query);
  };

  const delRequest = async ({ row }: DelReq) => {
    return await api.DeleteObj(row.id);
  };

  async function openGenerate() {
    const durationOptions = ref<{ label: string; value: number }[]>([]);
    async function loadDurationOptions(productId: number) {
      if (!productId) {
        durationOptions.value = [];
        return;
      }
      const product = await api.GetProductDetail(productId);
      const prices = JSON.parse(product.durationPrices || "[]");
      durationOptions.value = prices.map((item: any) => ({
        label: item.duration === -1 ? "永久" : `${item.duration} 天`,
        value: item.duration,
      }));
    }

    await openFormDialog({
      title: "批量生成激活码",
      wrapper: { width: 560 },
      initialForm: {
        productId: null,
        duration: null,
        count: 10,
        expireTime: null,
        exported: true,
        remark: "",
      },
      columns: {
        productId: {
          title: "选择套餐",
          type: "dict-select",
          dict: productDict,
          form: {
            col: { span: 24 },
            rules: [{ required: true, message: "请选择套餐" }],
            valueChange({ form, value }: any) {
              form.duration = null;
              loadDurationOptions(value);
            },
          },
        },
        duration: {
          title: "时长（天）",
          type: "text",
          form: {
            col: { span: 24 },
            rules: [{ required: true, message: "请输入时长" }],
            helper: "请先选择套餐，再选择该套餐已配置的时长",
            component: {
              name: "a-select",
              vModel: "value",
              options: durationOptions,
              placeholder: "请选择时长",
            },
          },
        },
        count: {
          title: "生成数量",
          type: "number",
          form: {
            col: { span: 24 },
            rules: [{ required: true, message: "请输入生成数量" }],
            helper: "单次最多生成 1000 个",
            component: { min: 1, max: 1000 },
          },
        },
        expireTime: {
          title: "过期时间",
          type: "datetime",
          form: {
            col: { span: 24 },
            helper: "选填，留空则长期有效",
          },
        },
        exported: {
          title: "生成后立即导出",
          type: "dict-switch",
          dict: dict({
            data: [
              { label: "导出", value: true, color: "success" },
              { label: "不导出", value: false, color: "default" },
            ],
          }),
          form: {
            col: { span: 24 },
            helper: "开启后生成完成会自动下载 CSV，并把激活码标记为已导出",
          },
        },
        remark: {
          title: "备注",
          type: "text",
          form: {
            col: { span: 24 },
            helper: "选填",
          },
        },
      },
      async onSubmit(form: any) {
        if (form.expireTime) {
          form.expireTime = form.expireTime.valueOf ? form.expireTime.valueOf() : new Date(form.expireTime).getTime();
        }
        const res = await api.Generate(form);
        if (form.exported) {
          downloadCodes(res.codes || [], "activation-codes-generated");
        }
        await crudExpose.doRefresh();
        notification.success({
          message: `激活码已生成，批次号：${res.batchNo}，数量：${res.count}`,
        });
      },
    });
  }

  async function doDisable(row: any) {
    Modal.confirm({
      title: "确认禁用激活码？",
      content: `禁用后用户将不能兑换该激活码：${row.code}`,
      async onOk() {
        await api.Disable(row.id);
        notification.success({ message: "激活码已禁用" });
        await crudExpose.doRefresh();
      },
    });
  }

  async function doEnable(row: any) {
    Modal.confirm({
      title: "确认启用激活码？",
      content: `启用后用户可以继续兑换该激活码：${row.code}`,
      async onOk() {
        await api.Enable(row.id);
        notification.success({ message: "激活码已启用" });
        await crudExpose.doRefresh();
      },
    });
  }

  function buildCsv(list: any[]) {
    const headers = ["ID", "激活码", "套餐ID", "时长", "批次号", "状态", "过期时间", "备注"];
    const rows = list.map(item => [item.id, item.code, item.productId, item.duration, item.batchNo, item.status, item.expireTime || "", item.remark || ""]);
    const escapeCsv = (value: any) => {
      const text = String(value ?? "");
      return `"${text.replaceAll('"', '""')}"`;
    };
    return [headers, ...rows].map(row => row.map(escapeCsv).join(",")).join("\n");
  }

  function downloadCodes(list: any[], prefix = "activation-codes") {
    downloadFileFromBlobPart({
      fileName: `${prefix}-${Date.now()}.csv`,
      source: "\uFEFF" + buildCsv(list),
    });
  }

  async function doExport() {
    if (selectedRowKeys.value.length === 0) {
      message.warning("请先勾选要导出的激活码");
      return;
    }
    Modal.confirm({
      title: "确认导出激活码？",
      content: `将导出已勾选的 ${selectedRowKeys.value.length} 个激活码，并标记导出时间。已使用和已禁用的激活码会自动跳过。`,
      async onOk() {
        const list = await api.ExportCodes({ ids: selectedRowKeys.value });
        downloadCodes(list);
        selectedRowKeys.value = [];
        notification.success({ message: `已导出 ${list.length} 个激活码` });
        await crudExpose.doRefresh();
      },
    });
  }

  return {
    crudOptions: {
      settings: {
        plugins: {
          rowSelection: {
            enabled: true,
            order: -2,
            before: true,
            props: {
              multiple: true,
              crossPage: true,
              selectedRowKeys,
            },
          },
        },
      },
      request: { pageRequest, delRequest },
      actionbar: {
        buttons: {
          add: { show: false },
          generate: {
            text: "批量生成激活码",
            type: "primary",
            click: openGenerate,
          },
          export: {
            text: "导出激活码",
            click: doExport,
          },
        },
      },
      rowHandle: {
        width: 210,
        fixed: "right",
        buttons: {
          view: { show: false },
          edit: { show: false },
          copy: { show: false },
          disable: {
            text: "禁用",
            type: "link",
            show: compute(({ row }) => row.status === "unused" || row.status === "exported"),
            click: ({ row }) => doDisable(row),
          },
          enable: {
            text: "启用",
            type: "link",
            show: compute(({ row }) => row.status === "disabled"),
            click: ({ row }) => doEnable(row),
          },
          remove: {
            show: compute(({ row }) => row.status !== "used"),
          },
        },
      },
      columns: {
        id: {
          title: "ID",
          type: "number",
          column: { width: 80 },
          form: { show: false },
        },
        code: {
          title: "激活码",
          type: "copyable",
          search: { show: true },
          column: { width: 300 },
        },
        productId: {
          title: "绑定套餐",
          type: "dict-select",
          dict: productDict,
          search: { show: true },
          column: { width: 150 },
        },
        duration: {
          title: "时长（天）",
          type: "number",
          column: { width: 100, align: "center" },
        },
        batchNo: {
          title: "批次号",
          type: "text",
          search: { show: true },
          column: { width: 180 },
        },
        status: {
          title: "状态",
          type: "dict-select",
          dict: statusDict,
          search: { show: true },
          column: { width: 100, align: "center" },
        },
        usedUserId: {
          title: "使用用户",
          type: "table-select",
          dict: userDict,
          search: { show: true },
          column: { width: 140 },
          form: {
            show: false,
            component: {
              crossPage: true,
              multiple: false,
              select: {
                placeholder: "点击选择用户",
              },
              createCrudOptions: createCrudOptionsUser,
            },
          },
        },
        usedTime: {
          title: "使用时间",
          type: "datetime",
          column: { width: 170 },
        },
        exported: {
          title: "是否已导出",
          type: "dict-switch",
          dict: dict({
            data: [
              { label: "未导出", value: false, color: "default" },
              { label: "已导出", value: true, color: "warning" },
            ],
          }),
          search: { show: true },
          column: { width: 110, align: "center" },
        },
        exportTime: {
          title: "导出时间",
          type: "datetime",
          column: { width: 170 },
        },
        expireTime: {
          title: "过期时间",
          type: "datetime",
          search: { show: false },
          column: { width: 170 },
        },
        disabledTime: {
          title: "禁用时间",
          type: "datetime",
          column: { width: 170, show: false },
        },
        remark: {
          title: "备注",
          type: "text",
          column: { width: 150 },
        },
        createTime: {
          title: "创建时间",
          type: "datetime",
          form: { show: false },
          column: { sorter: true, width: 170 },
        },
        updateTime: {
          title: "更新时间",
          type: "datetime",
          form: { show: false },
          column: { width: 170 },
        },
      },
    },
  };
}
