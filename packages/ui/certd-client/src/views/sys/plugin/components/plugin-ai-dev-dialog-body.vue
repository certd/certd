<template>
  <div class="plugin-ai-dev">
    <a-steps :current="step" size="small" class="plugin-ai-dev__steps"><a-step title="确认插件" /><a-step title="编写提示词" /><a-step title="测试验证" /></a-steps>
    <div class="plugin-ai-dev__content">
      <template v-if="step === 0"
        ><a-alert message="先确认本次开发的目标" type="info" show-icon /><a-radio-group v-model:value="mode" class="plugin-ai-dev__mode"
          ><a-radio-button value="new">开发新插件</a-radio-button><a-radio-button value="edit">修改已有插件</a-radio-button></a-radio-group
        >
        <div v-if="mode === 'new'" class="plugin-ai-dev__field plugin-ai-dev__type-field">
          <label>插件类型</label>
          <a-radio-group v-model:value="pluginType" class="plugin-ai-dev__type-grid">
            <a-radio-button v-for="item in pluginTypeOptions" :key="item.value" :value="item.value" class="plugin-ai-dev__type-card">
              <span class="plugin-ai-dev__type-title">{{ item.label }}</span>
              <span class="plugin-ai-dev__type-desc">{{ item.desc }}</span>
            </a-radio-button>
          </a-radio-group>
        </div>
        <div v-else class="plugin-ai-dev__field">
          <label>选择插件</label>
          <DependPluginsInput v-model="pluginPath" single editable-only value-mode="id" />
        </div>
      </template>
      <template v-else-if="step === 1"
        ><label class="plugin-ai-dev__label">开发需求</label><a-textarea v-model:value="requirement" :rows="6" /><a-button
          class="plugin-ai-dev__generate"
          type="primary"
          :loading="creating"
          :disabled="!requirement.trim()"
          @click="createPrompt"
          >生成启动提示词</a-button
        >
        <div class="plugin-ai-dev__prompt-head"><span>AI启动提示词</span></div>
        <a-textarea class="plugin-ai-dev__prompt" :value="prompt" readonly :rows="10" placeholder="点击上方按钮生成提示词" />
        <a-button class="plugin-ai-dev__copy" type="primary" :disabled="!prompt" @click="copyPrompt">复制提示词</a-button>
        <div class="plugin-ai-dev__warning">将提示词复制到 Codex / Trae / WorkBuddy 等AI开发工具中，即可开始开发插件，开发完成后会自动推送到Certd平台，然后就可以配置到流水线中进行测试。</div>
        <div class="plugin-ai-dev__warning">注意：要建一个空项目来做工作目录，开发过程中会拉取Certd源码</div>
      </template>
      <template v-else
        ><a-alert message="等待 Codex / Trae 完成开发并提交插件版本后，再选择流水线测试。" type="warning" show-icon />
        <div v-if="mode === 'new' || recentPluginsLoading || recentPlugins.length" class="plugin-ai-dev__recent">
          <div class="plugin-ai-dev__section-title mb-4">
            <span>
              <span>1、等待插件开发完成</span>
              <span class="ml-2 plugin-ai-dev__hint">您可以在此查看和手动编辑它</span>
            </span>
            <a-button type="text" size="small" :loading="recentPluginsLoading" title="刷新插件" @click="loadRecentPlugins(true)">
              <template #icon><fs-icon icon="ant-design:reload-outlined" /></template>
            </a-button>
          </div>
          <div v-if="recentPlugins.length" class="plugin-ai-dev__recent-list">
            <div v-for="plugin in displayPlugins" :key="plugin.fullName || plugin.id" class="plugin-ai-dev__recent-item" @click="openPluginEditor(plugin)">
              <div class="plugin-ai-dev__recent-main gap-2">
                <strong>{{ plugin.title || plugin.name || plugin.fullName }}</strong>
                <span>{{ plugin.fullName || plugin.name }}</span>
                <small> | {{ formatTime(plugin.updateTime || plugin.syncTime) }}</small>
              </div>
              <fs-icon icon="ant-design:edit-outlined" />
            </div>
          </div>
          <div v-else class="flex-center">
            <a-button type="primary" size="small" :loading="recentPluginsLoading" title="刷新插件" @click="loadRecentPlugins(true)"> 刷新插件 </a-button>
          </div>
        </div>
        <div class="plugin-ai-dev__pipeline-label">
          <label class="plugin-ai-dev__label">2、测试验证 <span class="plugin-ai-dev__hint ml-2">请将开发的插件配置到流水线中，进行测试</span></label>
        </div>
        <div class="plugin-ai-dev__pipeline-row">
          <span>选择测试流水线：</span>
          <fs-table-select
            v-model:model-value="pipelineId"
            :dict="pipelineDict"
            :create-crud-options="createPipelineCrudOptions"
            :crud-options-override="{ search: { show: false }, rowHandle: { show: false } }"
            :show-current="false"
            :show-select="false"
            :dialog="{ width: 900 }"
            height="400px"
            class="plugin-ai-dev__pipeline"
          >
          </fs-table-select>
          <a-button class="mr-2" type="primary" :disabled="!pipelineId" @click="pipelineEditVisible = true">将插件配置到测试流水线</a-button>
        </div>
        <div class="plugin-ai-dev__test-actions">
          <a-button type="primary" :loading="testing" :disabled="!pipelineId" @click="runTest">运行流水线测试</a-button>
          <a-tooltip title="配置好测试流水线后，可以让 AI 自动测试并完善插件；UI 选择相关功能无法自动完善，需要您手动测试。">
            <a-button type="primary" ghost :disabled="!pipelineId" @click="openAiTestDialog">AI 自动测试</a-button>
          </a-tooltip>
        </div>
        <div v-if="testLogs.length" class="plugin-ai-dev__logs">
          <div class="plugin-ai-dev__section-title">本次测试日志</div>
          <pre>{{ testLogs.join("\n") }}</pre>
        </div>
        <a-empty v-if="testStarted && !testing && !testLogs.length" description="暂未获取到匹配的插件日志" />
      </template>
    </div>
    <a-modal v-model:open="aiTestVisible" title="AI 自动测试提示词" width="720px" :footer="null">
      <a-textarea class="plugin-ai-dev__prompt plugin-ai-dev__ai-test-prompt" :value="aiTestPrompt" readonly :rows="12" @click="copyAiTestPrompt" />
      <a-button class="plugin-ai-dev__copy" type="primary" :disabled="!aiTestPrompt" @click="copyAiTestPrompt">复制测试提示词</a-button>
    </a-modal>
    <PipelineEditDialog v-model:open="pipelineEditVisible" :pipeline-id="pipelineId" />
    <div class="plugin-ai-dev__footer">
      <a-button :disabled="step === 0" @click="step--">上一步</a-button><a-button v-if="step === 0" type="primary" :disabled="!canNext" @click="nextStep">下一步</a-button
      ><a-button
        v-if="step === 1"
        type="primary"
        @click="
          step = 2;
          loadPipelines();
        "
        >进入测试验证</a-button
      >
    </div>
  </div>
</template>
<script lang="tsx" setup>
import { computed, ref, watch } from "vue";
import { dict } from "@fast-crud/fast-crud";
import { notification } from "ant-design-vue";
import * as api from "../api";
import * as pipelineApi from "/@/views/certd/pipeline/api";
import * as historyApi from "/@/views/certd/pipeline/api.history";
import DependPluginsInput from "./depend-plugins-input.vue";
import PluginEditDialogBody from "./plugin-edit-dialog-body.vue";
import PipelineEditDialog from "/@/views/certd/pipeline/components/pipeline-edit-dialog.vue";
import { useFormDialog } from "/@/use/use-dialog";
import { useSettingStore } from "/src/store/settings";
import dayjs from "dayjs";
const props = defineProps<{ pluginId?: number | string; pluginName?: string }>();
const settingStore = useSettingStore();
const step = ref(0);
const mode = ref<"new" | "edit">(props.pluginId ? "edit" : "new");
const pluginType = ref<string>();
const pluginTypeOptions = [
  { value: "access", label: "授权插件", desc: "接入云厂商或第三方服务凭据" },
  { value: "dnsProvider", label: "DNS Provider", desc: "管理 DNS 记录并完成域名验证" },
  { value: "deploy", label: "部署插件", desc: "将证书部署到服务器或云服务" },
  { value: "notification", label: "通知插件", desc: "通过消息、邮件等方式发送通知" },
  // { value: "addon", label: "Addon", desc: "扩展流水线的通用辅助能力" },
];
const requirement = ref(
  "例如：开发一个部署证书到阿里云DCDN的插件\nAPI接口请参考：https://help.aliyun.com/zh/edge-security-acceleration/dcdn/developer-reference/api-dcdn-2018-01-15-overview。\n要求： \n1、能够引用上传到阿里云CAS步骤输出的证书。\n2、支持在UI上选择账户下某区域下的DCDN的域名列表。\n3、支持一次性选择多个域名进行部署"
);
const pluginPath = ref<string[]>(props.pluginId ? [String(props.pluginId)] : []);
const creating = ref(false);
const prompt = ref("");
const accessToken = ref("");
const pipelineOptions = ref<any[]>([]);
const pipelineId = ref<number>();
const testing = ref(false);
const testStarted = ref(false);
const recentPlugins = ref<any[]>([]);
const recentPluginsLoading = ref(false);
const aiTestVisible = ref(false);
const pipelineEditVisible = ref(false);
const testLogs = ref<string[]>([]);
const pluginTaskId = ref("");
const pipelineDict = dict({
  value: "id",
  label: "title",
  async getNodesByValues(values: any[]) {
    return await pipelineApi.GetSimpleByIds(values);
  },
  async getData() {
    if (!pipelineOptions.value.length) {
      await loadPipelines();
    }
    return pipelineOptions.value;
  },
});
const canNext = computed(() => (step.value === 0 ? (mode.value === "new" ? !!pluginType.value : pluginPath.value.length > 0) : !!requirement.value.trim()));
const displayPlugins = computed(() => (mode.value === "edit" ? recentPlugins.value.slice(0, 1) : recentPlugins.value));
const { openFormDialog } = useFormDialog();
const selectedPluginReference = computed(() => recentPlugins.value[0]?.fullName || recentPlugins.value[0]?.name || props.pluginName || "");
const aiTestPrompt = computed(() => {
  if (!pipelineId.value || !accessToken.value) return "";
  const plugin = selectedPluginReference.value;
  return `请使用 Certd AI 测试接口验证插件。\n1. POST ${window.location.origin}/api/scoped/sys/ai/plugin/pipeline/trigger，JSON：{"pipelineId":${pipelineId.value},"taskId":"${pluginTaskId.value || ""}"}，Authorization: Bearer ${accessToken.value}。保存响应中的 historyId。\n2. 每 2 秒 POST ${window.location.origin}/api/scoped/sys/ai/plugin/pipeline/status，JSON：{"pipelineId":${pipelineId.value},"historyId":"上一步返回的historyId","plugin":"${plugin}"}。\n3. 根据返回的 pipelineStatus、currentTask、pluginTask 和 logs 判断流水线及当前开发插件是否成功；测试结束后给出结论和关键日志。`;
});
function nextStep() {
  if (canNext.value) step.value++;
}
async function createPrompt() {
  if (!requirement.value.trim()) return;
  creating.value = true;
  try {
    const token = await api.GetScopedAccessToken(["sys/ai"]);
    accessToken.value = token.token;
    prompt.value = `你是 Certd 在线插件开发 Agent。\n\n开发模式：${mode.value === "new" ? "开发新插件" : "修改已有插件"}\n插件类型：${pluginType.value || "按已有插件类型"}\n插件 ID：${pluginPath.value.at(-1) || "无"}\n用户需求：\n${requirement.value.trim()}\n\n如果用户需求描述与他选择的插件类型有冲突，你需要跟用户确认是否选错插件类型。 \nCertd 地址：${window.location.origin}\n受限 AccessToken（6小时有效）：${token.token}\n\n请先读取 .trae/skills/certd-online-plugin-dev/SKILL.md，按插件类型开发并提交版本。仅调用 /scoped/sys/ai/plugin/ 前缀接口，完成后报告提交结果，不自动发布。\n如果当前工作目录不是 Certd 项目，或缺少 certd-online-plugin-dev Skill，先拉取 Certd 仓库代码并切换到仓库内工作(git clone https://atomgit.com/certd/certd --depth 1 )`;
    notification.success({ message: "启动提示词已生成" });
  } finally {
    creating.value = false;
  }
}
async function copyPrompt() {
  await navigator.clipboard.writeText(prompt.value);
  notification.success({ message: "已复制启动提示词" });
}
async function copyAiTestPrompt() {
  if (!aiTestPrompt.value) return;
  await navigator.clipboard.writeText(aiTestPrompt.value);
  notification.success({ message: "已复制测试提示词" });
}
async function openAiTestDialog() {
  if (!pipelineId.value) return;
  pluginTaskId.value = await findPluginTaskId(pipelineId.value);
  if (!accessToken.value) {
    const token = await api.GetScopedAccessToken(["sys/ai"]);
    accessToken.value = token.token;
  }
  aiTestVisible.value = true;
}
async function loadPipelines() {
  if (pipelineOptions.value.length) return;
  const res: any = await pipelineApi.GetList({ page: { offset: 0, limit: 100 }, query: { type: "cert" } });
  const rows = res?.records || res?.data || [];
  pipelineOptions.value = rows
    .filter((p: any) => p.lastVars?.certExpiresTime || p.certExpiresTime)
    .map((p: any) => ({
      ...p,
      id: p.id,
      title: `${p.title || "未命名流水线"}（已有证书）`,
    }));
}
function createPipelineCrudOptions() {
  return {
    crudOptions: {
      request: {
        async pageRequest(query: any) {
          const res: any = await pipelineApi.GetList({ ...query, query: { ...(query.query || {}), type: "cert" } });
          const records = (res?.records || []).filter((item: any) => item.lastVars?.certExpiresTime || item.certExpiresTime);
          return { ...res, records, total: records.length };
        },
      },
      columns: {
        title: { title: "流水线名称", type: "text", column: { width: 420 } },
        "lastVars.certExpiresTime": { title: "证书过期时间", type: "datetime", column: { width: 180 } },
      },
      table: { scroll: { x: 650 } },
    },
  };
}
async function loadRecentPlugins(force = false) {
  if (!force && (recentPlugins.value.length || recentPluginsLoading.value)) return;
  recentPluginsLoading.value = true;
  try {
    if (mode.value === "edit") {
      await loadSelectedPlugin();
      return;
    }
    const result: any = await api.GetList({
      page: { offset: 0, limit: 1 },
      sort: { prop: "updateTime", asc: false },
      query: { type: "store" },
    });
    const list: any[] = result?.records || [];
    const bindUserId = Number(settingStore.installInfo?.bindUserId || 0);
    recentPlugins.value = list
      .filter(item => {
        const developerId = Number(item.developerId || 0);
        return !developerId || (!!bindUserId && developerId === bindUserId);
      })
      .slice(0, 3);
  } finally {
    recentPluginsLoading.value = false;
  }
}
async function loadSelectedPlugin() {
  const selectedValue = pluginPath.value.at(-1);
  if (!selectedValue) {
    recentPlugins.value = [];
    return;
  }
  if (props.pluginId && selectedValue === String(props.pluginId)) {
    const selected = await api.GetObj(props.pluginId);
    recentPlugins.value = selected ? [selected] : [];
    return;
  }
  let selected = await api.GetObj(selectedValue);
  if (selected) {
    recentPlugins.value = [selected];
    return;
  }
  const fullName = selectedValue.includes(":") ? selectedValue.slice(selectedValue.indexOf(":") + 1) : selectedValue;
  const result: any = await api.FindPlugins({ includeBuiltIn: true, includeStore: true, keyword: fullName });
  const records: any[] = Array.isArray(result) ? result : result?.records || [];
  selected = records.find(item => String(item.fullName || item.name) === fullName) || records[0];
  recentPlugins.value = selected ? [selected] : [];
}

function formatTime(value: any) {
  return value ? dayjs(value).format("YYYY-MM-DD HH:mm:ss") : "更新时间未知";
}
async function openPluginEditor(plugin: any) {
  const id = plugin.localPluginId || plugin.id;
  if (!id) return;
  const bodyRef = ref();
  await openFormDialog({
    title: `编辑插件 ${plugin.title || plugin.name || plugin.fullName}`,
    columns: {},
    noneForm: true,
    className: "plugin-edit-dialog",
    wrapper: { width: 1480, destroyOnClose: true, maskClosable: false, okText: "保存", cancelText: "关闭" },
    body: () => <PluginEditDialogBody ref={bodyRef} pluginId={id} />,
    async onSubmit() {
      await bodyRef.value?.save?.();
    },
  });
}
function collectPluginLogKeys(detail: any) {
  const selectedRaw = String(pluginPath.value.at(-1) || props.pluginName || "").toLowerCase();
  const selected = selectedRaw.split(":").at(-1) || selectedRaw;
  if (!selected) return Object.keys(detail.logs || {});
  const ids: string[] = [];
  const visit = (value: any) => {
    if (!value || typeof value !== "object") return;
    if (
      value.id &&
      [value.type, value.pluginName, value.name, value.fullName].some(item =>
        String(item || "")
          .toLowerCase()
          .includes(selected)
      )
    ) {
      ids.push(String(value.id));
    }
    Object.values(value).forEach(visit);
  };
  visit(detail.pipeline?.stages || detail.pipeline);
  const keys = Object.keys(detail.logs || {}).filter(key => ids.includes(key) || key.toLowerCase().includes(selected));
  if (keys.length) return keys;
  return Object.keys(detail.logs || {}).filter(key => ids.includes(key));
}
async function loadTestLogs(pipeline: number) {
  const before: any[] = await historyApi.GetList({ pipelineId: pipeline });
  const beforeIds = new Set(before.map(item => String(item.id)));
  for (let attempt = 0; attempt < 8; attempt++) {
    const histories: any[] = await historyApi.GetList({ pipelineId: pipeline });
    const latest = histories?.find(item => !beforeIds.has(String(item.id))) || histories?.[0];
    if (latest?.id) {
      const detail: any = await historyApi.GetDetail({ id: latest.id });
      const keys = collectPluginLogKeys(detail);
      testLogs.value = keys.flatMap(key => (detail.logs?.[key] || []).map((line: string) => String(line).trim()).filter(Boolean));
      if (testLogs.value.length) return;
    }
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
}
async function runTest() {
  if (!pipelineId.value) return;
  testing.value = true;
  try {
    pluginTaskId.value = await findPluginTaskId(pipelineId.value);
    await pipelineApi.Trigger(pipelineId.value, pluginTaskId.value || undefined);
    testStarted.value = true;
    testLogs.value = [];
    await loadTestLogs(pipelineId.value);
  } finally {
    testing.value = false;
  }
}
async function findPluginTaskId(pipeline: number) {
  const detail: any = await pipelineApi.GetDetail(pipeline);
  const content = typeof detail?.pipeline?.content === "string" ? JSON.parse(detail.pipeline.content) : detail?.pipeline || {};
  const reference = selectedPluginReference.value.toLowerCase();
  let taskId = "";
  const visit = (value: any) => {
    if (!value || typeof value !== "object" || taskId) return;
    if (value.id && value.runnableType === "task" && JSON.stringify(value).toLowerCase().includes(reference)) {
      taskId = String(value.id);
      return;
    }
    Object.values(value).forEach(visit);
  };
  visit(content);
  return taskId;
}
if (mode.value === "edit") {
  loadRecentPlugins();
}
watch(
  () => pluginPath.value.at(-1),
  value => {
    if (mode.value === "edit" && value) {
      void loadSelectedPlugin();
    }
  }
);
watch(mode, value => {
  if (value === "edit" && pluginPath.value.length) {
    void loadSelectedPlugin();
  }
});
</script>
<style lang="less">
.plugin-ai-dev {
  display: flex;
  height: 60vh;
  flex-direction: column;
  gap: 20px;

  &__steps {
    flex: none;
  }

  &__content {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 18px;
    padding: 8px 20px;
    overflow-y: auto;
  }

  &__hint {
    color: #94a3b8;
    font-size: 12px;
    font-weight: 400;
  }

  &__mode {
    margin: 18px 0;
  }

  &__field {
    max-width: 620px;
  }

  &__type-field {
    width: 100%;
    max-width: none;
  }

  &__type-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  &__type-card {
    display: flex;
    width: 100%;
    height: auto;
    min-height: 74px;
    align-items: flex-start;
    justify-content: flex-start;
    padding: 12px 14px;
    border: 1px solid #d9d9d9 !important;
    border-radius: 6px !important;
    text-align: left;
    white-space: normal;

    &:not(:first-child)::before {
      display: none;
    }

    &.ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled) {
      z-index: 1;
      border-color: #1677ff !important;
      background: #e6f4ff;
      color: #0958d9;
    }
  }

  &__type-title,
  &__type-desc {
    display: block;
  }

  &__type-title {
    margin-bottom: 4px;
    color: #1f2937;
    font-size: 14px;
    font-weight: 600;
  }

  &__type-desc {
    color: #64748b;
    font-size: 12px;
    line-height: 18px;
  }

  &__field label,
  &__label {
    display: block;
    margin-bottom: 8px;
    color: #334155;
    font-weight: 600;
  }

  &__cascader,
  &__pipeline {
    width: 100%;
    max-width: none;
  }

  &__pipeline-label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  &__pipeline-row {
    display: flex;
    align-items: center;
    width: 100%;
    gap: 8px;
    .fs-table-select {
      width: auto;
    }
  }

  &__prompt {
    flex: 1;
    font-family: Consolas, monospace;
    font-size: 12px;
  }

  &__generate,
  &__copy {
    align-self: flex-start;
  }

  &__generate {
    margin-top: -8px;
  }

  &__copy {
    margin-top: 10px;
  }

  &__prompt-head {
    display: flex;
    justify-content: space-between;
    font-weight: 600;
  }

  &__warning {
    color: #d4380d;
    font-size: 12px;
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    border-top: 1px solid #edf0f4;
    padding: 16px 20px 0;
  }
}

.plugin-ai-dev {
  :deep(.ant-select-selector),
  :deep(.ant-cascader-picker),
  :deep(.ant-radio-button-wrapper) {
    border-radius: 6px;
  }

  &__section-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: #334155;
    font-weight: 600;
  }

  &__recent {
    margin-bottom: 8px;
  }

  &__ai-test-prompt {
    min-height: 280px;
  }

  &__logs {
    display: flex;
    min-height: 200px;
    flex: 1;
    flex-direction: column;
  }

  &__logs pre {
    min-height: 200px;
    flex: 1;
  }

  &__test-actions {
    display: flex;
    gap: 8px;
  }

  &__recent-list {
    display: flex;
    min-width: 0;
    gap: 8px;
  }

  &__recent-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-width: 0;
    flex: 1;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    cursor: pointer;
    padding: 6px 8px;
    background: #fff;

    &.is-selected {
      border-color: #1677ff;
      background: #e6f4ff;
    }
  }

  &__recent-main {
    display: flex;
    align-items: center;
    gap: 2px;
    min-width: 0;

    span,
    small {
      overflow: hidden;
      color: #64748b;
      font-size: 12px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    span {
      margin-left: 6px;
    }

    small {
      margin-left: auto;
    }
  }

  &__logs pre,
  &__source {
    max-height: 300px;
    margin: 0;
    overflow: auto;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 12px;
    background: #0f172a;
    color: #e2e8f0;
    font:
      12px/1.6 Consolas,
      monospace;
    white-space: pre-wrap;
    word-break: break-word;
  }
}

@media (max-width: 640px) {
  .plugin-ai-dev__type-grid {
    grid-template-columns: 1fr;
  }
}
</style>
