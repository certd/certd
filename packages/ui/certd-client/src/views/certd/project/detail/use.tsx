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
      title: "Approve Join Request",
      columns: {
        permission: {
          title: "Member Permission",
          type: "dict-select",
          dict: projectPermissionDict,
        },
        status: {
          title: "Approval Result",
          type: "dict-radio",
          dict: dict({
            data: [
              {
                label: "Approve",
                value: "approved",
              },
              {
                label: "Reject",
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
      title: "Please Confirm",
      content: () => (
        <div>
          <p>Confirm migrating personal resource data to the current project?</p>
          <p class="text-red-500">Warning: this operation is irreversible. After migration, data cannot be restored to the personal user account.</p>
        </div>
      ),
      okText: "Confirm",
      okType: "primary",
      onOk: async () => {
        await api.TransferResources();
        message.success("Migration successful");
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
      title: "Migrate My Personal Resources to the Current Enterprise Project",
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
                <h3 class="text-lg font-bold">My Existing Personal Resource Counts</h3>
                <div class="mt-4">
                  <p>Pipelines: {selfResources.value.pipeline}</p>
                  <p>Pipeline History: {selfResources.value.history}</p>
                  <p>Pipeline History Logs: {selfResources.value.historyLog}</p>
                  <p>Pipeline Groups: {selfResources.value.pipelineGroup}</p>
                  <p>Storage: {selfResources.value.storage}</p>
                  <p>Certificates: {selfResources.value.certInfo}</p>
                  <p>Authorizations: {selfResources.value.access}</p>
                  <p>Site Monitoring: {selfResources.value.siteMonitor}</p>
                  <p>Notifications: {selfResources.value.notification}</p>
                  <p>Site Monitoring Groups: {selfResources.value.group}</p>

                  <p>Pipeline Templates: {selfResources.value.template}</p>
                  <p>Domains: {selfResources.value.domain}</p>
                  <p>Subdomain Hosting: {selfResources.value.subdomain}</p>
                  <p>CNAME Records: {selfResources.value.cnameRecord}</p>
                </div>
              </div>
              <div class="text-2xl font-bold">  Migrate to → </div>
              <div>Project: "{projectStore.currentProject?.name}"</div>
            </div>
            <div class="text-center m-4">
              <p class="text-red-500">Warning: this operation is irreversible. After migration, data cannot be restored to the personal user account.</p>
            </div>

            <div class="flex flex-row items-center justify-center w-full">
              <a-button type="primary" onClick={doTransfer}>
                Confirm Migration
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
