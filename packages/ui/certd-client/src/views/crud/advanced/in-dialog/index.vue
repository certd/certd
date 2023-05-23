<template>
  <fs-page>
    <template #header>
      <div class="title">对话框中显示crud</div>
    </template>
    <div style="padding: 50px">
      <a-button type="primary" @click="openDialog">打开对话框</a-button>
    </div>

    <a-modal v-model:visible="dialogShow" width="80%" title="fs-crud in dialog">
      <div style="height: 400px; position: relative">
        <!-- 在此处显示fs-crud页面 -->
        <fs-in-dialog></fs-in-dialog>
      </div>
    </a-modal>
  </fs-page>
</template>

<script lang="ts">
import { defineComponent, ref } from "vue";
//将fs-crud做成的页面在此处引入
import FsInDialog from "./crud/index.vue";
export default defineComponent({
  name: "InDialog",
  components: { FsInDialog },
  setup() {
    const dialogShow = ref(false);
    function openDialog() {
      dialogShow.value = true;
    }
    return {
      dialogShow,
      openDialog
    };
  }
});
</script>
