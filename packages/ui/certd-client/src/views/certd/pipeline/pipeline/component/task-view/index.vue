<template>
  <a-modal v-model:open="taskModal.open" class="pi-task-view" title="任务日志" style="width: 80%" v-bind="taskModal">
    <a-tabs v-model:active-key="activeKey" :tab-position="tabPosition" animated>
      <a-tab-pane v-for="item of detail.nodes" :key="item.node.id">
        <template #tab>
          <div class="tab-title flex-between" :title="item.node.title">
            <span class="tab-title-text flex items-center md:w-48">
              <pi-status-show class="mr-1" :status="item.node.status?.result" type="icon"></pi-status-show>
              <!--              <fs-icon icon="ion:chevron-forward-circle" class="text-md mr-1"></fs-icon>-->
              <span class="flex-1 ellipsis">{{ item.node.title }}</span>

              <a-tooltip title="强制重新执行此步骤">
                <fs-icon class="pointer color-blue ml-1" style="font-size: 16px" title="强制重新执行此步骤" icon="icon-park-outline:replay-music" @click="triggerRun(item.node.id)"></fs-icon>
              </a-tooltip>
            </span>
          </div>
        </template>
        <div class="pi-task-view-logs" :class="'id-' + item.node.id" style="overflow: auto">
          <template v-for="(logItem, index) of item.logs" :key="index">
            <span :class="logItem.color"> {{ logItem.time }}</span> <span>{{ logItem.content }}</span>
          </template>
        </div>
      </a-tab-pane>
    </a-tabs>
    <template #footer>
      <fs-button v-if="settingsStore.sysPublic.aiChatEnabled !== false" key="aiChat" :tooltip="{ title: 'AI分析异常' }" type="primary" icon="ion:color-wand-outline" @click="taskModal.onAiChat">AI分析</fs-button>
      <!-- <fs-button v-if="!settingsStore.isComm && currentStatus === 'error'" key="1v1" :tooltip="{ title: '升级专业版，获得一对一分析服务，为您排忧解难' }" class="isPlus" icon="imingcute:vip-1-line" @click="callService">
        呼叫专家
      </fs-button> -->
      <fs-button key="rerun" type="primary" :tooltip="{ title: '强制重新执行此步骤' }" text="重新运行" icon="icon-park-outline:replay-music" @click="triggerRun(activeKey)"></fs-button>
      <fs-button key="downloadLogs" type="primary" :tooltip="{ title: '当前任务日志下载' }" icon="ion:arrow-down-circle-outline" @click="taskModal.onDownloadLogs">下载日志</fs-button>
      <fs-button key="cancel" :tooltip="{ title: '关闭窗口' }" icon="ion:close-circle-outline" @click="taskModal.onOk">关闭</fs-button>
      <!--      <fs-button key="submit" :tooltip="{ title: '关闭窗口' }" icon="ion:checkmark-circle-outline" type="primary" @click="taskModal.onOk">确定</fs-button>-->
    </template>
  </a-modal>
</template>

<script lang="ts">
import { computed, inject, nextTick, Ref, ref, watch } from "vue";
import { RunHistory } from "../../type";
import PiStatusShow from "/@/views/certd/pipeline/pipeline/component/status-show.vue";
import { usePreferences } from "/@/vben/preferences";
import { useSettingStore } from "/@/store/settings/index";
import { notification } from "ant-design-vue";
import { mitter } from "/@/utils/util.mitt";
export default {
  name: "PiTaskView",
  components: { PiStatusShow },
  props: {},
  emits: ["run"],
  setup(props: any, ctx: any) {
    const openAiChat: any = inject("fn:ai.open", (q: string) => {});
    const taskModal = ref({
      open: false,
      onOk() {
        taskViewClose();
      },
      onAiChat() {
        onAiChat();
      },
      onDownloadLogs() {
        const logs = currentHistory.value?.logs[activeKey.value];
        if (!logs || logs.length === 0) {
          notification.warning({
            message: "没有日志",
          });
          return;
        }
        const logText = logs.join("");
        const blob = new Blob([logText], { type: "text/plain;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "certd-task-log.txt";
        a.click();
        URL.revokeObjectURL(a.href);
      },
      cancelText: "关闭",
    });
    const { isMobile } = usePreferences();
    const tabPosition = computed(() => {
      if (isMobile.value) {
        return "top";
      }
      return "left";
    });

    function onAiChat() {
      const logs = currentHistory.value?.logs[activeKey.value];
      if (!logs || logs.length === 0) {
        return;
      }
      let logText = "";
      for (let log of logs) {
        logText += log + "\n";
      }
      const maxLength = 2500;
      if (logText.length > maxLength) {
        logText = logText.substring(logText.length - maxLength);
      }
      if (openAiChat) {
        openAiChat(logText);
      }
    }

    const detail = ref({ nodes: [] });
    const activeKey = ref();
    const currentHistory: Ref<RunHistory> | undefined = inject("currentHistory");
    const taskViewOpen = (task: any) => {
      taskModal.value.open = true;
      const nodes: any = [];
      // nodes.push({
      //   node: task,
      //   type: "任务",
      //   tab: 0,
      //   logs: [],
      //   result: {}
      // });
      for (let step of task.steps) {
        nodes.push({
          node: step,
          type: "步骤",
          tab: 2,
          logs: [],
        });
      }

      async function scrollBottom(node: any, force = false) {
        let el = document.querySelector(`.pi-task-view-logs.id-${node.node.id}`);
        if (!el) {
          return;
        }
        //判断当前是否在底部
        let isBottom = true;
        if (el) {
          isBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 5;
        }
        if (force) {
          isBottom = true;
        }
        await nextTick();
        el = document.querySelector(`.pi-task-view-logs.id-${node.node.id}`);
        //如果在底部则滚动到底部
        if (isBottom && el) {
          el?.scrollTo({
            top: el.scrollHeight,
            behavior: "smooth",
          });
        }
      }

      for (let node of nodes) {
        if (currentHistory?.value?.logs != null) {
          node.logs = computed(() => {
            if (currentHistory?.value?.logs && currentHistory.value?.logs[node.node.id] != null) {
              const logs = currentHistory.value?.logs[node.node.id];
              const list = [];
              for (let log of logs) {
                const index = log.indexOf("]", 27) + 1;
                const time = log.substring(0, index);
                const content = log.substring(index);
                const color = time.includes("ERROR") ? "red" : time.includes("WARN") ? "yellow" : "green";
                list.push({
                  time,
                  content,
                  color,
                });
              }
              return list;
            }
            return [];
          });

          watch(
            () => {
              return node.logs.value.length;
            },
            async () => {
              await scrollBottom(node);
            }
          );
          nextTick(() => {
            scrollBottom(node, true);
          });
        }
      }

      if (task.steps.length > 0) {
        activeKey.value = task.steps[0].id;
      }

      detail.value = { nodes };
    };

    const taskViewClose = () => {
      taskModal.value.open = false;
    };

    function triggerRun(id: string) {
      ctx.emit("run", id);
      taskModal.value.open = false;
    }

    const currentNode = computed(() => {
      return detail.value?.nodes?.find(item => item.node.id === activeKey.value);
    });
    const currentStatus = computed(() => {
      return currentNode.value?.node?.status?.result || "";
    });

    function callService() {
      if (!settingsStore.isPlus) {
        mitter.emit("openVipModal");
      }
    }

    const settingsStore = useSettingStore();
    return {
      detail,
      taskModal,
      activeKey,
      taskViewOpen,
      taskViewClose,
      tabPosition,
      triggerRun,
      settingsStore,
      currentNode,
      currentStatus,
      callService,
    };
  },
};
</script>

<style lang="less">
.pi-task-view {
  .tab-title {
    display: flex;

    .tab-title-text {
      display: flex;
      //max-width: 180px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      text-align: left;
    }
  }

  .pi-task-view-logs {
    background-color: #000c17;
    color: #e9e9e9;
    font-family: monospace;
    padding: 5px;
    min-height: 300px;
    max-height: 580px;
    white-space: pre-wrap;
    word-wrap: break-word;
    > div {
      padding: 0;
      margin: 0;
    }
    .green {
      color: rgba(0, 255, 0, 0.8);
    }
    .yellow {
      color: yellow;
    }
    .red {
      color: red;
    }
  }
}
</style>
