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
          <DependPluginsInput v-model="pluginPath" single editable-only />
        </div>
      </template>
      <template v-else-if="step === 1"
        ><label class="plugin-ai-dev__label">开发需求</label
        ><a-textarea
          v-model:value="requirement"
          :rows="8"
          placeholder="例如：开发一个部署证书到阿里云DCDN的插件，API接口请参考：https://api.aliyuncs.com/https/xxxxxx/。要求： 1、能够引用上传到阿里云CAS步骤输出的证书。2、支持在UI上选择账户下某区域下的DCDN的域名列表。3、支持一次性选择多个域名进行部署"
        /><a-button class="plugin-ai-dev__generate" type="primary" :loading="creating" :disabled="!requirement.trim()" @click="createPrompt">生成启动提示词</a-button>
        <div class="plugin-ai-dev__prompt-head"><span>Codex / Trae 启动提示词</span><a-tag color="blue">API 模式</a-tag></div>
        <a-textarea class="plugin-ai-dev__prompt" :value="prompt" readonly :rows="10" placeholder="点击上方按钮生成提示词" />
        <a-button class="plugin-ai-dev__copy" type="primary" :disabled="!prompt" @click="copyPrompt">复制提示词</a-button>
        <div class="plugin-ai-dev__warning">将提示词复制到 Codex / Trae 等AI开发工具中，即可开始开发插件，开发完成后会自动推送到Certd平台，然后就可以配置到流水线中进行测试。</div>
      </template>
      <template v-else
        ><a-alert message="等待 Codex / Trae 完成开发并提交插件版本后，再选择流水线测试。" type="warning" show-icon /><label class="plugin-ai-dev__label">选择已有证书的流水线</label
        ><a-select v-model:value="pipelineId" show-search allow-clear :loading="pipelineLoading" :options="pipelineOptions" placeholder="选择流水线" class="plugin-ai-dev__pipeline" /><a-button
          type="primary"
          :loading="testing"
          :disabled="!pipelineId"
          @click="runTest"
          >运行流水线测试</a-button
        ><a-result v-if="testStarted" status="success" title="测试已启动" sub-title="可在流水线执行记录中查看结果"
      /></template>
    </div>
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
<script lang="ts" setup>
import { computed, ref } from "vue";
import { notification } from "ant-design-vue";
import * as api from "../api";
import * as pipelineApi from "/@/views/certd/pipeline/api";
import DependPluginsInput from "./depend-plugins-input.vue";
const props = defineProps<{ pluginId?: number | string; pluginName?: string }>();
const step = ref(0);
const mode = ref<"new" | "edit">(props.pluginId ? "edit" : "new");
const pluginType = ref<string>();
const pluginTypeOptions = [
  { value: "access", label: "授权插件", desc: "接入云厂商或第三方服务凭据" },
  { value: "dnsProvider", label: "DNS Provider", desc: "管理 DNS 记录并完成域名验证" },
  { value: "deploy", label: "部署插件", desc: "将证书部署到服务器或云服务" },
  { value: "notification", label: "通知插件", desc: "通过消息、邮件等方式发送通知" },
  { value: "addon", label: "Addon", desc: "扩展流水线的通用辅助能力" },
];
const requirement = ref("");
const pluginPath = ref<string[]>(props.pluginId ? [String(props.pluginId)] : []);
const creating = ref(false);
const prompt = ref("");
const pipelineOptions = ref<any[]>([]);
const pipelineLoading = ref(false);
const pipelineId = ref<number>();
const testing = ref(false);
const testStarted = ref(false);
const canNext = computed(() => (step.value === 0 ? (mode.value === "new" ? !!pluginType.value : pluginPath.value.length > 0) : !!requirement.value.trim()));
function nextStep() {
  if (canNext.value) step.value++;
}
async function createPrompt() {
  if (!requirement.value.trim()) return;
  creating.value = true;
  try {
    const token = await api.GetScopedAccessToken(["sys/ai"]);
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
async function loadPipelines() {
  if (pipelineOptions.value.length) return;
  pipelineLoading.value = true;
  try {
    const res: any = await pipelineApi.GetList({ page: { offset: 0, limit: 100 }, query: { type: "cert" } });
    const rows = res?.records || res?.data || [];
    pipelineOptions.value = rows.filter((p: any) => p.lastVars?.certExpiresTime || p.certExpiresTime).map((p: any) => ({ value: p.id, label: `${p.title || "未命名流水线"}（已有证书）` }));
  } finally {
    pipelineLoading.value = false;
  }
}
async function runTest() {
  if (!pipelineId.value) return;
  testing.value = true;
  try {
    await pipelineApi.Trigger(pipelineId.value);
    testStarted.value = true;
    notification.success({ message: "流水线测试已启动" });
  } finally {
    testing.value = false;
  }
}
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
    max-width: 620px;
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
    margin-top: -10px;
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
}

@media (max-width: 640px) {
  .plugin-ai-dev__type-grid {
    grid-template-columns: 1fr;
  }
}
</style>
