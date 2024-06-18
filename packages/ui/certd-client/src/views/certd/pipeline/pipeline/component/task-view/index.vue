<template>
  <a-modal v-model:open="taskModal.open" class="pi-task-view" title="任务日志" style="width: 80%" v-bind="taskModal">
    <a-tabs v-model:activeKey="activeKey" tab-position="left" animated>
      <a-tab-pane v-for="item of detail.nodes" :key="item.node.id">
        <template #tab>
          <div class="tab-title" :title="item.node.title">
            <span class="tab-title-text">【{{ item.type }}】 {{ item.node.title }}</span>
            <pi-status-show :status="item.node.status?.result" type="icon"></pi-status-show>
          </div>
        </template>
        <pre class="pi-task-view-logs" style="overflow: auto;"><template v-for="(text, index) of item.logs" :key="index">{{ text }}</template></pre>
      </a-tab-pane>
    </a-tabs>
  </a-modal>
</template>

<script lang="ts">
import { computed, inject, Ref, ref } from "vue";
import { RunHistory } from "../../type";
import PiStatusShow from "/@/views/certd/pipeline/pipeline/component/status-show.vue";

export default {
  name: "PiTaskView",
  components: { PiStatusShow },
  props: {},
  setup(props: any, ctx: any) {
    const taskModal = ref({
      open: false,
      onOk() {
        taskViewClose();
      },
      cancelText: "关闭"
    });

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
          logs: []
        });
      }
      for (let node of nodes) {
        if (currentHistory?.value?.logs != null) {
          node.logs = computed(() => {
            if(currentHistory?.value?.logs && currentHistory.value?.logs[node.node.id]!= null){
                  return currentHistory.value?.logs[node.node.id];
            }
            return [];
          });
        }
      }

      if (task.steps.length > 0) {
        activeKey.value = task.steps[0].id;
      }

      detail.value = { nodes };

      console.log("nodes", nodes);
    };

    const taskViewClose = () => {
      taskModal.value.open = false;
    };

    return {
      detail,
      taskModal,
      activeKey,
      taskViewOpen,
      taskViewClose
    };
  }
};
</script>

<style lang="less">
.pi-task-view {
  .tab-title {
    display: flex;
    .tab-title-text {
      display: inline-block;
      width: 150px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .pi-task-view-logs {
    background-color: #000c17;
    color: #fafafa;
    min-height: 300px;
    max-height: 580px;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
}
</style>
