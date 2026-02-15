<template>
  <div class="test-case" :class="{ loading }">
    <div class="case-header">
      <span class="flex items-center">
        <fs-button size="small" type="text" icon="ion:play-circle" :loading="loading" :disabled="disabled" class="test-button" @click="runTest" />
        <a-tag color="blue" class="case-title">
          {{ title }}
        </a-tag>
        <span v-if="port" class="port-info">{{ port }}</span>
      </span>
      <span v-if="result && isNetTestResult" class="result-status flex-1" :style="{ color: isSuccess ? 'green' : 'red' }">
        <span>
          {{ isSuccess ? "✓" : "✗" }}
        </span>
        <span class="ml-2">
          {{ result.message }}
        </span>
      </span>
    </div>
    <div v-if="result" class="result-content">
      <div v-if="error" class="error-message">
        <span style="color: red">{{ error }}</span>
      </div>
      <div v-else-if="isNetTestResult">
        <div v-if="resultTestLog" class="test-log">
          <pre>{{ resultTestLog }}</pre>
        </div>
      </div>
      <div v-else-if="typeof result === 'object'" class="object-result">
        <pre>{{ JSON.stringify(result, null, 2) }}</pre>
      </div>
      <div v-else class="text-result">
        <pre>{{ result }}</pre>
      </div>
    </div>
    <div v-else class="no-result">
      <p>暂无结果</p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from "vue";
import { message } from "ant-design-vue";

// 组件属性
const props = defineProps<{
  title: string;
  port?: number | string;
  testMethod: () => Promise<any>;
  disabled?: boolean;
}>();

// 内部状态
const loading = ref(false);
const result = ref<any>(null);
const error = ref<string | null>(null);

// 运行测试
const runTest = async () => {
  loading.value = true;
  error.value = null;
  result.value = null;
  try {
    const testResult = await props.testMethod();
    // 如果结果有 data 属性，则使用 data，否则使用整个结果
    result.value = testResult.data || testResult;
  } catch (err: any) {
    result.value = null;
    error.value = err.message || "测试失败";
    message.error(`${props.title} 测试失败: ${error.value}`);
  } finally {
    loading.value = false;
  }
};

// 暴露方法给父组件
defineExpose({
  test: runTest,
  getResult: () => result.value,
});

// 辅助计算属性，用于模板中显示结果
const isNetTestResult = computed(() => {
  return typeof result.value === "object" && result.value !== null && "success" in result.value && "message" in result.value && "testLog" in result.value;
});

const isSuccess = computed(() => {
  return isNetTestResult.value && result.value.success;
});

const resultMessage = computed(() => {
  return isNetTestResult.value ? result.value.message : "";
});

const resultTestLog = computed(() => {
  return isNetTestResult.value ? result.value.testLog : "";
});

const resultError = computed(() => {
  return isNetTestResult.value ? result.value.error : "";
});
</script>

<style lang="less" scoped>
.test-case {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  position: relative;

  &:last-child {
    border-bottom: none;
  }

  &.loading {
    opacity: 0.7;
  }
}

.case-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;

  .result-status {
    font-size: 14px;
    color: #999;
    margin-right: 10px;
  }
}

.case-title {
  font-weight: 500;
  font-size: 14px;
}

.port-info {
  font-size: 12px;
  color: #999;
  padding: 2px 6px;
  border-radius: 3px;
  margin-right: 8px;
}

.test-button {
  color: #1890ff;
  font-size: 12px;
  margin-right: 5px;
}

.result-content {
  .error-message,
  .object-result,
  .text-result {
    padding: 8px 10px;
    border-radius: 3px;
    overflow-x: auto;
  }

  pre {
    margin: 0;
    font-size: 12px;
    line-height: 1.4;
    font-family: "Monaco", "Menlo", "Ubuntu Mono", monospace;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .test-log {
    padding: 8px 10px;
    border-radius: 3px;
    overflow-x: auto;
  }
}

.no-result {
  padding: 12px 0;
  text-align: center;
  color: #999;
  font-size: 12px;
}
</style>
