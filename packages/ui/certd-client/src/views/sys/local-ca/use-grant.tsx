import { compute, dict } from "@fast-crud/fast-crud";
import { notification } from "ant-design-vue";
import { ref } from "vue";
import { useFormDialog } from "/@/use/use-dialog";
import { request } from "/@/api/service";
import { useI18n } from "/src/locales";
import { localCaApi } from "./api";

type StepUpFn = (title: string, desc: string, action: () => Promise<void>) => Promise<boolean>;

type SelectOption = { label: string; value: number; disabled?: boolean };

function userText(user: any) {
  return user.nickName || user.username || (user.phoneCode ? `${user.phoneCode}${user.mobile || ""}` : user.mobile) || String(user.id);
}

export function useLocalCaGrantDialogs() {
  const { t } = useI18n();
  const { openFormDialog } = useFormDialog();
  const users = ref<SelectOption[]>([]);
  const projects = ref<SelectOption[]>([]);
  let optionsLoaded = false;

  async function loadUsers() {
    try {
      const list: any[] = await request({ url: "/sys/authority/user/getSimpleUsers", method: "POST", showErrorNotify: false });
      users.value = (list || []).map(user => ({ label: userText(user), value: Number(user.id) }));
    } catch {
      users.value = [];
    }
  }

  async function loadProjects() {
    try {
      const res: any = await request({ url: "/sys/enterprise/project/page", method: "post", data: { page: { current: 1, size: 1000 } }, showErrorNotify: false });
      projects.value = (res?.records || []).map((item: any) => ({ label: item.name, value: Number(item.id) }));
    } catch {
      projects.value = [];
    }
  }

  async function ensureOptions(force = false) {
    if (optionsLoaded && !force) {
      return;
    }
    await Promise.all([loadUsers(), loadProjects()]);
    optionsLoaded = true;
  }

  function userLabel(id: number) {
    return users.value.find(item => item.value === Number(id))?.label || `#${id}`;
  }

  function projectLabel(id: number) {
    return projects.value.find(item => item.value === Number(id))?.label || `#${id}`;
  }

  function buildOptions(list: SelectOption[], grantedIds: Set<number>) {
    return list.map(item => {
      const granted = grantedIds.has(Number(item.value));
      return {
        label: granted ? `${item.label}${t("certd.localCa.grantAlreadyGranted")}` : item.label,
        value: item.value,
        disabled: granted,
      };
    });
  }

  async function openAddGrant(req: { caId: number; caType?: string; runStepUp: StepUpFn; onDone?: () => void }) {
    if (req.caType !== "intermediate") {
      notification.warning({ message: t("certd.localCa.rootGrantHint") });
      return;
    }
    await ensureOptions();
    if (!users.value.length && !projects.value.length) {
      notification.warning({ message: t("certd.localCa.grantNoTargets") });
      return;
    }
    let grants: any[] = [];
    try {
      grants = (await localCaApi.ListGrants(req.caId)) || [];
    } catch (e: any) {
      notification.error({ message: String(e?.message || e) });
      return;
    }
    // 仅生效中的授权占用可选名额；停用/历史行不阻止重新授权
    const grantedUserIds = new Set(grants.filter(item => !item.disabled && Number(item.userId) > 0 && Number(item.projectId ?? 0) === 0).map(item => Number(item.userId)));
    const grantedProjectIds = new Set(grants.filter(item => !item.disabled && Number(item.userId ?? 0) === 0 && Number(item.projectId) > 0).map(item => Number(item.projectId)));
    const userOptions = buildOptions(users.value, grantedUserIds);
    const projectOptions = buildOptions(projects.value, grantedProjectIds);

    await openFormDialog({
      title: t("certd.localCa.grantAddTitle"),
      zIndex: 1200,
      wrapper: { width: 560 },
      body: () => <a-alert type="info" show-icon message={t("certd.localCa.grantHint")} class="mb-3" />,
      initialForm: { mode: "user", userId: undefined, projectId: undefined },
      columns: {
        mode: {
          title: t("certd.localCa.grantMode"),
          type: "dict-radio",
          dict: dict({
            data: [
              { label: t("certd.localCa.grantModeUser"), value: "user" },
              { label: t("certd.localCa.grantModeProject"), value: "project" },
            ],
          }),
          form: {
            col: { span: 24 },
            required: true,
            // 两种模式互斥，切换时清空另一侧已选对象
            valueChange({ form, value }: any) {
              if (value === "user") {
                form.projectId = undefined;
              } else {
                form.userId = undefined;
              }
            },
          },
        },
        userId: {
          title: t("certd.localCa.selectUser"),
          type: "dict-select",
          dict: dict({ data: userOptions }),
          form: {
            show: compute(({ form }) => form.mode !== "project"),
            col: { span: 24 },
            component: { showSearch: true, optionFilterProp: "label" },
          },
        },
        projectId: {
          title: t("certd.localCa.selectProject"),
          type: "dict-select",
          dict: dict({ data: projectOptions }),
          form: {
            show: compute(({ form }) => form.mode === "project"),
            col: { span: 24 },
            component: { showSearch: true, optionFilterProp: "label" },
          },
        },
      },
      async onSubmit(form: any) {
        const userMode = form.mode !== "project";
        const options = userMode ? userOptions : projectOptions;
        const targetId = Number(userMode ? form.userId : form.projectId);
        if (!targetId) {
          notification.warning({ message: userMode ? t("certd.localCa.selectUser") : t("certd.localCa.selectProject") });
          return false;
        }
        const option = options.find(item => Number(item.value) === targetId);
        if (!option || option.disabled) {
          notification.warning({ message: t("certd.localCa.grantAlreadyGranted") });
          return false;
        }
        const verified = await req.runStepUp(t("certd.localCa.grantStepUpTitle"), t("certd.localCa.grantStepUpDesc"), async () => {
          const payload = userMode ? { id: req.caId, grantUserId: targetId } : { id: req.caId, grantProjectId: targetId };
          await localCaApi.AddGrant(payload);
        });
        if (!verified) {
          return false;
        }
        notification.success({ message: t("certd.localCa.accessSaved") });
        req.onDone?.();
      },
    });
  }

  async function openRemoveGrant(req: { caId: number; record: any; label: string; runStepUp: StepUpFn; onDone?: () => void }) {
    await openFormDialog({
      title: t("certd.localCa.grantRemoveTitle"),
      zIndex: 1200,
      wrapper: { width: 520 },
      body: () => <div class="mb-3">{t("certd.localCa.grantRemoveContent", { user: req.label })}</div>,
      initialForm: { disableAccounts: true },
      columns: {
        disableAccounts: {
          title: t("certd.localCa.grantRemoveDisableAccounts"),
          type: "dict-switch",
          dict: dict({
            data: [
              { label: t("common.yes"), value: true },
              { label: t("common.no"), value: false },
            ],
          }),
          form: {
            col: { span: 24 },
            helper: t("certd.localCa.grantRemoveDisableAccountsHelper"),
          },
        },
      },
      async onSubmit(form: any) {
        const verified = await req.runStepUp(t("certd.localCa.grantStepUpTitle"), t("certd.localCa.grantStepUpDesc"), async () => {
          await localCaApi.RemoveGrant(req.caId, req.record.id, form.disableAccounts === true);
        });
        if (!verified) {
          return false;
        }
        notification.success({ message: t("certd.localCa.accessRemoved") });
        req.onDone?.();
      },
    });
  }

  return {
    ensureOptions,
    userLabel,
    projectLabel,
    openAddGrant,
    openRemoveGrant,
  };
}
