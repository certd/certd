<template>
  <a-card title="服务端信息" class="server-info-card">
    <template #extra>
      <a-button size="small" :loading="loading" @click="refreshServerInfo">
        <template #icon>
          <a-icon type="sync" :spin="loading" />
        </template>
        刷新
      </a-button>
    </template>
    <div v-if="loading" class="loading">
      <a-spin size="small" />
      <span style="margin-left: 8px">加载中...</span>
    </div>
    <div v-else-if="error" class="error">
      <a-alert message="获取服务器信息失败" :description="error" type="error" show-icon />
    </div>
    <div v-else class="server-info-grid">
      <!-- 本地IP -->
      <div class="info-item">
        <div class="info-label">本地IP:</div>
        <div v-if="serverInfo.localIP && serverInfo.localIP.length > 0" class="info-value">
          <a-tag v-for="ip in serverInfo.localIP" :key="ip" type="info" color="blue">{{ ip }}</a-tag>
        </div>
        <div v-else class="info-empty">暂无信息</div>
      </div>

      <!-- 外网IP -->
      <div class="info-item">
        <div class="info-label">外网IP:</div>
        <div v-if="serverInfo.publicIP && serverInfo.publicIP.length > 0" class="info-value">
          <a-tag v-for="ip in serverInfo.publicIP" :key="ip" type="info" color="green">{{ ip }}</a-tag>
        </div>
        <div v-else class="info-empty">暂无信息</div>
      </div>

      <!-- DNS服务器 -->
      <div class="info-item">
        <div class="info-label">DNS服务器:</div>
        <div v-if="serverInfo.dnsServers && serverInfo.dnsServers.length > 0" class="info-value">
          <a-tag v-for="dns in serverInfo.dnsServers" :key="dns" type="info" color="cyan">{{ dns }}</a-tag>
        </div>
        <div v-else class="info-empty">暂无信息</div>
      </div>
    </div>
  </a-card>
</template>

<script lang="ts" setup>
import { ref, onMounted } from "vue";
import { message } from "ant-design-vue";
import { GetServerInfo } from "./api";

// 服务器信息类型
interface ServerInfo {
  localIP?: string[];
  publicIP?: string[];
  dnsServers?: string[];
}

const loading = ref(false);
const error = ref<string | null>(null);
const serverInfo = ref<ServerInfo>({});

// 加载服务器信息
const loadServerInfo = async () => {
  loading.value = true;
  error.value = null;
  try {
    serverInfo.value = await GetServerInfo();
  } catch (e) {
    error.value = e instanceof Error ? e.message : String(e);
    message.error("获取服务器信息失败");
  } finally {
    loading.value = false;
  }
};

// 刷新服务器信息
const refreshServerInfo = () => {
  loadServerInfo();
};

// 组件挂载时加载数据
onMounted(() => {
  loadServerInfo();
});
</script>

<style lang="less">
.server-info-card {
  margin-bottom: 16px;

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    color: #666;
  }

  .error {
    margin: 0;
  }

  .server-info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 16px;
  }

  .info-item {
    border-radius: 4px;
    padding: 12px;

    .info-label {
      font-size: 14px;
      font-weight: 500;
      color: #666;
      margin-bottom: 8px;
    }

    .info-value {
      font-size: 14px;
      color: #333;

      .ant-list-item {
        padding: 4px 0;
      }
    }

    .info-empty {
      font-size: 14px;
      color: #999;
      font-style: italic;
    }
  }
}
</style>
