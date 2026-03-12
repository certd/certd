import { dict } from "@fast-crud/fast-crud";
import { useDicts } from "../../dicts";
import { useFormDialog } from "/@/use/use-dialog";
import * as api from "./api";
import { useProjectStore } from "/@/store/project";
import { message, Modal } from "ant-design-vue";
import { Ref, ref } from "vue";
export function useApprove() {
  const { openFormDialog } = useFormDialog();
  const { projectPermissionDict, projectMemberStatusDict, userDict } = useDicts();
  function openApproveDialog({ id, permission, onSubmit }: { id: any; permission: any; onSubmit: any }) {
    openFormDialog({
      title: "审批加入申请",
      columns: {
        permission: {
          title: "成员权限",
          type: "dict-select",
          dict: projectPermissionDict,
        },
        status: {
          title: "审批结果",
          type: "dict-radio",
          dict: dict({
            data: [
              {
                label: "通过",
                value: "approved",
              },
              {
                label: "拒绝",
                value: "rejected",
              },
            ],
          }),
        },
      },
      onSubmit: onSubmit,
      initialForm: {
        id: id,
        permission: permission,
        status: "approved",
      },
    });
  }

  return {
    openApproveDialog,
  };
}

export function useTransfer() {
  const { openFormDialog } = useFormDialog();

  async function doTransfer() {
    Modal.confirm({
      title: "请确认",
      content: () => (
        <div>
          <p>确认迁移个人资源数据到当前项目？</p>
          <p class="text-red-500">注意；此操作不可逆，一旦迁移，数据将无法还原回个人用户名下。</p>
        </div>
      ),
      okText: "确认",
      okType: "primary",
      onOk: async () => {
        await api.TransferResources();
        message.success("迁移成功");
        await loadMyResources();
      },
    });
  }

  const selfResources: Ref = ref({});

  const projectStore = useProjectStore();

  async function loadMyResources() {
    selfResources.value = await api.GetSelfResources();
  }
  async function openTransferDialog() {
    await loadMyResources();
    openFormDialog({
      title: "迁移我的个人资源到当前企业项目",
      wrapper: {
        buttons: {
          ok: {
            show: false,
          },
          reset: {
            show: false,
          },
        },
      },
      body() {
        return (
          <div class="p-8">
            <div class="flex flex-row items-center justify-evenly w-full">
              <div>
                <h3 class="text-lg font-bold">我原有的个人资源数量</h3>
                <div class="mt-4">
                  <p>流水线：{selfResources.value.pipeline}</p>
                  <p>流水线历史：{selfResources.value.history}</p>
                  <p>流水线历史日志：{selfResources.value.historyLog}</p>
                  <p>流水线分组：{selfResources.value.pipelineGroup}</p>
                  <p>存储：{selfResources.value.storage}</p>
                  <p>证书：{selfResources.value.certInfo}</p>
                  <p>授权：{selfResources.value.access}</p>
                  <p>站点监控：{selfResources.value.siteMonitor}</p>
                  <p>通知：{selfResources.value.notification}</p>
                  <p>站点监控分组：{selfResources.value.group}</p>

                  <p>流水线模版：{selfResources.value.template}</p>
                  <p>域名：{selfResources.value.domain}</p>
                  <p>子域名托管：{selfResources.value.subdomain}</p>
                  <p>cname记录：{selfResources.value.cnameRecord}</p>
                </div>
              </div>
              <div class="text-2xl font-bold"> 迁移到→ </div>
              <div>项目："{projectStore.currentProject?.name}"</div>
            </div>
            <div class="flex flex-row items-center justify-center w-full">
              <a-button type="primary" onClick={doTransfer}>
                确认迁移
              </a-button>
            </div>
          </div>
        );
      },
    });
  }
  return {
    openTransferDialog,
  };
}
