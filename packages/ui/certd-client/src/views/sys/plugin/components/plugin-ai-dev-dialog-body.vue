<template>
  <div class="plugin-ai-dev">
    <section class="plugin-ai-dev__setup">
      <div class="plugin-ai-dev__form">
        <div class="plugin-ai-dev__field">
          <label class="plugin-ai-dev__label">开发需求</label>
          <a-textarea v-model:value="requirement" :rows="8" placeholder="描述你想开发或优化的插件，例如：开发一个 Foo DNS Provider，支持创建和删除 TXT 记录。" />
        </div>
        <div class="plugin-ai-dev__field">
          <label class="plugin-ai-dev__label">选择现有插件</label>
          <a-select v-model:value="selectedPluginId" allow-clear show-search placeholder="不选择则开发新插件" :filter-option="filterPluginOption" :options="pluginOptions" :loading="pluginLoading" />
        </div>
        <div class="plugin-ai-dev__actions">
          <a-button type="primary" :loading="creating" @click="createPrompt">生成启动提示词</a-button>
          <a-button :disabled="!prompt" @click="copyPrompt">复制提示词</a-button>
        </div>
      </div>
      <div class="plugin-ai-dev__prompt">
        <div class="plugin-ai-dev__prompt-head">
          <span>Codex / Trae 启动提示词</span>
          <a-tag color="blue">API 模式</a-tag>
        </div>
        <a-textarea class="plugin-ai-dev__prompt-text" :value="prompt" readonly :rows="24" placeholder="生成后复制到 Codex 或 Trae 中运行。" />
      </div>
    </section>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from "vue";
import { message } from "ant-design-vue";
import * as api from "../api";
import { useUserStore } from "/@/store/user";
import { env } from "/src/utils/util.env";

defineOptions({
  name: "PluginAiDevDialogBody",
});

const props = defineProps<{
  pluginId?: number | string;
  pluginName?: string;
}>();

const userStore = useUserStore();
const requirement = ref("");
const selectedPluginId = ref<number | string | undefined>(props.pluginId);
const pluginOptions = ref<{ label: string; value: number | string }[]>([]);
const pluginLoading = ref(false);
const creating = ref(false);
const prompt = ref("");

function filterPluginOption(input: string, option: any) {
  return `${option?.label || ""}`.toLowerCase().includes(input.toLowerCase());
}

async function loadPluginOptions() {
  pluginLoading.value = true;
  try {
    const setting = await api.OnlinePluginSetting();
    const lastSyncTime = Number(setting?.lastSyncTime || 0);
    const syncExpired = !lastSyncTime || Date.now() - lastSyncTime > 3 * 24 * 60 * 60 * 1000;
    if (syncExpired) {
      await api.OnlinePluginSync();
    }
    const records = await api.FindPlugins({
      keyword: "",
      includeBuiltIn: true,
      includeStore: true,
    });
    pluginOptions.value = (records || []).map((item: any) => {
      return {
        label: item.fullName || (item.author ? `${item.author}/${item.name}` : item.name) || item.title,
        value: item.id,
      };
    });
    if (props.pluginId && props.pluginName && !pluginOptions.value.some(item => item.value === props.pluginId)) {
      pluginOptions.value.unshift({
        label: props.pluginName,
        value: props.pluginId,
      });
    }
  } finally {
    pluginLoading.value = false;
  }
}

async function createPrompt() {
  if (!requirement.value.trim()) {
    message.warning("请先填写插件开发需求");
    return;
  }
  creating.value = true;
  try {
    prompt.value = buildPrompt();
    message.success("启动提示词已生成");
  } finally {
    creating.value = false;
  }
}

function buildPrompt() {
  const pluginLabel = props.pluginName || selectedPluginId.value;
  const pluginText = pluginLabel ? `当前插件：${pluginLabel}` : "当前为新插件开发";
  const token = userStore.getToken || "";
  const certdUrl = window.location.origin;
  const apiBase = new URL(env.API || "/api", certdUrl).toString().replace(/\/$/, "");
  return `你是 Certd 在线插件开发 Agent。

用户需求：
${requirement.value.trim()}

${pluginText}

Certd 地址：
${certdUrl}

Certd API 地址：
${apiBase}

当前用户 Token：
${token}

开发流程：
1. 开始开发前，先检查当前工作目录是否已经是 certd 项目：应能看到 package.json、packages/ui/certd-server/src/plugins/、.trae/skills/ 等特征。
2. 检查 .trae/skills/ 下是否已经有 certd-online-plugin-dev 技能。
3. 如果当前目录不是 certd 项目，或缺少该技能，则先拉取 certd 仓库代码：优先 https://atomgit.com/certd/certd/，如果 AtomGit 拉取失败，再使用 https://github.com/certd/certd。
4. 加载 .trae/skills/certd-online-plugin-dev/SKILL.md，并按插件类型加载对应子 Skill。
5. 参考 certd 项目下已有内置插件 packages/ui/certd-server/src/plugins/ 的实现方式进行开发。
6. 使用当前 Token 调用 Certd API，通过 /sys/plugin/find 查询插件和 Access。
7. 开发 Task 或 DNS 插件前，先查询对应 Access，优先复用 Access 提供的 API/SDK 能力。
8. 如果没有 Access，先创建 Access 插件；如果 Access 的 editable 为 true 且缺少能力，可以先修改 Access。
9. 在当前工作区创建并使用 tmp-online-plugin-dev 作为本次插件开发临时目录，历史记录、临时 YAML、脚本草稿和调试记录都放在该目录下。
10. 修改任何插件前，先在 tmp-online-plugin-dev/history 下保存完整 YAML 历史记录，便于恢复。
11. 通过 Certd API 读取和保存完整插件 YAML，不使用 WebSocket，不依赖浏览器草稿。
12. 保存完成后向用户报告 API 操作结果，不自动发布。

认证请求要求：
- 请求头使用 Authorization: ${token}
- 所有请求使用 JSON。
- 不要把 Token、证书、私钥、API 密钥或授权配置写入日志和历史摘要。

当前插件 ID：
${selectedPluginId.value || "无"}

开始前先读取 Skill 和当前插件信息。`;
}

async function copyPrompt() {
  if (!prompt.value) {
    return;
  }
  await navigator.clipboard.writeText(prompt.value);
  message.success("已复制启动提示词");
}

onMounted(loadPluginOptions);
</script>

<style lang="less">
.plugin-ai-dev {
  display: flex;
  min-height: 600px;
  flex-direction: column;

  &__setup {
    display: grid;
    min-height: 0;
    flex: 1;
    grid-template-columns: minmax(320px, 0.8fr) minmax(480px, 1.2fr);
    gap: 16px;
  }

  &__form,
  &__prompt {
    display: flex;
    min-width: 0;
    min-height: 0;
    flex-direction: column;
    border: 1px solid #e5eaf1;
    border-radius: 8px;
    background: #fff;
    padding: 14px;
  }

  &__field {
    margin-bottom: 16px;
  }

  &__label {
    display: block;
    margin-bottom: 6px;
    color: #334155;
    font-size: 13px;
    font-weight: 600;
    line-height: 20px;
  }

  &__actions {
    display: flex;
    gap: 8px;
    margin-top: auto;
  }

  &__prompt-head {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 10px;
    color: #1f2937;
    font-size: 14px;
    font-weight: 600;
  }

  &__prompt-text {
    flex: 1;
    min-height: 0;
    font-family: Consolas, "Courier New", monospace;
    font-size: 12px;
  }
}
</style>
