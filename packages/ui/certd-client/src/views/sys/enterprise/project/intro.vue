<template>
  <div v-if="open" class="admin-mode-intro" :style="fixed ? 'position: fixed;' : 'position: absolute;'" @click="close()">
    <div class="mask">
      <div class="intro-content">
        <h2 class="intro-title text-xl font-bold">{{ title || "管理模式介绍" }}</h2>
        <div class="mt-8 image-block">
          <div class="flex gap-8">
            <div class="intro-desc flex-1">SaaS模式：每个用户管理自己的流水线和授权资源，独立使用。</div>
            <div class="intro-desc flex-1">企业模式：企业内部员工使用，通过项目合作管理流水线证书和授权资源。</div>
          </div>
          <div class="image-intro">
            <img :src="src" alt="" />
          </div>
        </div>
        <div class="action">
          <a-button type="primary" html-type="button" @click="goSwitchMode">立即前往切换模式</a-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="tsx">
import { ref } from "vue";
import { useRouter } from "vue-router";
defineOptions({
  name: "AdminModeIntro",
});

const props = defineProps<{
  title?: string;
  open?: boolean;
  fixed?: boolean;
}>();

const emit = defineEmits(["update:open"]);

function close() {
  emit("update:open", false);
}

const src = ref("static/images/ent/admin_mode.png");

const router = useRouter();
function goSwitchMode() {
  router.push("/sys/settings?tab=mode");
}
</script>

<style lang="less">
.admin-mode-intro {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;

  .mask {
    padding: 20px;
    border-radius: 10px;
  }

  .intro-content {
    background-color: #fff;
    padding: 20px;
    border-radius: 10px;
    text-align: center;
  }

  .image-block {
    text-align: center;
    .image-intro {
      width: 100%;
      img {
        margin: 0 auto;
        max-width: 100%;
      }
    }
  }
}
</style>
