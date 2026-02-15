<template>
  <div class="domain-test-card">
    <div class="card-header flex flex-wrap justify-start">
      <div v-if="title">{{ title }}</div>
      <a-form v-if="editing" layout="inline" :model="formData">
        <a-form-item label="域名">
          <a-input v-model:value="formData.domain" placeholder="请输入要测试的域名或IP" style="width: 240px" />
        </a-form-item>
        <a-form-item label="端口">
          <a-input-number v-model:value="formData.port" placeholder="请输入端口" :min="1" :max="65535" style="width: 120px" />
        </a-form-item>
      </a-form>

      <div v-else class="domain-info">
        <span>域名: {{ formData.domain }}</span>
        <span>端口: {{ formData.port }}</span>
      </div>

      <a-button :disabled="!formData.domain" size="small" type="primary" :loading="loading" @click="runAllTests"> 开始测试 </a-button>
    </div>

    <div class="card-content">
      <div class="test-results">
        <!-- 域名解析结果 -->
        <test-case ref="domainResolveRef" title="域名解析" :test-method="() => createDomainResolveMethod()" :disabled="!getCurrentDomain()" />

        <!-- Ping测试结果 -->
        <test-case ref="pingTestRef" title="Ping测试" :test-method="() => createPingTestMethod()" :disabled="!getCurrentDomain()" />

        <!-- Telnet测试结果 -->
        <test-case ref="telnetTestRef" title="Telnet测试" :port="getCurrentPort()" :test-method="() => createTelnetTestMethod()" :disabled="!getCurrentDomain() || !getCurrentPort()" />
      </div>

      <div class="summary">
        <a-alert :message="testSummary.title" :type="testSummary.status === 'success' ? 'success' : testSummary.status === 'failed' ? 'error' : 'warning'" show-icon :closable="false">
          <template v-if="testSummary.text" #description>
            <pre class="summary-text pre">{{ testSummary.text }}</pre>
          </template>
        </a-alert>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, computed, onMounted, watch } from "vue";
import { message } from "ant-design-vue";
import { DomainResolve, PingTest, TelnetTest } from "./api";
import TestCase from "./TestCase.vue";

// 组件属性
const props = defineProps<{
  title?: string;
  domain?: string;
  port?: number;
  autoStart?: boolean;
}>();

const editing = ref(!props.domain);

// 测试组件的引用
const domainResolveRef = ref();
const pingTestRef = ref();
const telnetTestRef = ref();

// 表单数据
const formData = reactive({
  domain: props.domain || "",
  port: props.port || 443,
});

// 加载状态
const loading = ref(false);

// 创建域名解析测试方法
const createDomainResolveMethod = async () => {
  const domain = getCurrentDomain();
  return DomainResolve(domain);
};

// 创建Ping测试方法
const createPingTestMethod = async () => {
  const domain = getCurrentDomain();
  return PingTest(domain);
};

// 创建Telnet测试方法
const createTelnetTestMethod = async () => {
  const domain = getCurrentDomain();
  const port = getCurrentPort();

  return TelnetTest(domain, port);
};

// 获取当前使用的域名
const getCurrentDomain = () => {
  return formData.domain;
};

// 获取当前使用的端口
const getCurrentPort = () => {
  return formData.port;
};

// 获取各测试用例的状态
const getTestStatus = (testRef: any) => {
  const result = testRef?.getResult();
  if (!result) {
    return null;
  }

  const isNetTestResult = typeof result === "object" && result !== null && "success" in result && "message" in result;

  return {
    success: isNetTestResult ? result.success : false,
    message: isNetTestResult ? result.message : "测试失败",
  };
};

// 生成测试总结
const testSummary = computed(() => {
  if (loading.value) {
    return { status: "waiting", title: "测试中，请稍后..." };
  }
  // 通过computed获取各测试结果
  const domainResolveResult = getTestStatus(domainResolveRef.value);
  const pingTestResult = getTestStatus(pingTestRef.value);
  const telnetTestResult = getTestStatus(telnetTestRef.value);

  // 检查是否有测试结果
  const testDone = domainResolveResult != null && pingTestResult != null && telnetTestResult != null;
  if (!testDone) {
    return { status: "waiting", title: '请点击"开始测试"按钮进行网络测试' };
  }

  // 详细分析不同的测试结果组合
  // 1. 三个测试都失败
  if (domainResolveResult?.success === false && pingTestResult?.success === false && telnetTestResult?.success === false) {
    return {
      status: "failed",
      title: "所有测试均未通过",
      text: `这表明应用容器内的网络可能完全不通。建议：\n1. 检查宿主机的网络连接状态\n2. 确认容器网络配置是否正确\n3. 检查防火墙设置是否阻止了网络访问`,
    };
  }

  // 2. 域名解析成功，但Ping不通
  if (domainResolveResult?.success === true && pingTestResult?.success === false) {
    return {
      status: "partial",
      title: "域名解析成功，但Ping不通",
      text: `可能原因：\n1. DNS被劫持，解析到了错误的IP地址\n2. 目标服务器禁止了Ping请求\n3. 目标服务器IP被墙\n4. 目标服务器网络不通或已下线`,
    };
  }

  // 3. 域名解析和Ping都成功，但Telnet连接失败
  if (domainResolveResult?.success === true && pingTestResult?.success === true && telnetTestResult?.success === false) {
    return {
      status: "partial",
      title: "域名解析和Ping测试均通过，但Telnet连接失败",
      text: `可能原因：\n1. 端口号输入错误，请确认目标服务使用的正确端口\n2. 目标服务器上该端口未开放或服务未启动\n3. 防火墙或安全组限制了该端口的访问\n4. 目标网站被墙`,
    };
  }

  // 4. 域名解析失败，但其他测试可能成功或未执行
  if (domainResolveResult?.success === false) {
    return {
      status: "partial",
      title: "域名解析失败",
      text: `可能原因：\n1. 域名输入错误或不存在\n2. DNS服务器配置问题\n3. 本地网络DNS解析故障\n4. 域名已过期或被注销`,
    };
  }

  // 5. 所有测试都成功
  if (domainResolveResult?.success === true && pingTestResult?.success === true && telnetTestResult?.success === true) {
    return {
      status: "success",
      title: "所有测试均通过",
      text: `域名${formData.domain}解析正常，能够正常Ping通，且端口${formData.port}可访问。`,
    };
  }

  // 6. 其他部分成功的情况
  return {
    status: "partial",
    title: "部分测试未通过",
    text: `请结合具体测试结果进行分析：\n- 域名解析：${domainResolveResult ? (domainResolveResult.success ? "成功" : "失败") : "未执行"}\n- Ping测试：${pingTestResult ? (pingTestResult.success ? "成功" : "失败") : "未执行"}\n- Telnet测试：${telnetTestResult ? (telnetTestResult.success ? "成功" : "失败") : "未执行"}`,
  };
});

// 运行全部测试
async function runAllTests() {
  const domain = getCurrentDomain();

  // 检查是否有域名
  if (!domain) {
    message.error("请输入域名");
    return;
  }

  loading.value = true;

  // 通过组件引用调用测试方法
  try {
    await Promise.allSettled([domainResolveRef.value?.test(), pingTestRef.value?.test(), telnetTestRef.value?.test()]);
  } catch (error) {
    message.error("部分测试执行失败，请查看详细结果");
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (props.autoStart) {
    runAllTests();
  }
});
</script>

<style lang="less">
.domain-test-card {
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  overflow: hidden;

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #e8e8e8;
  }

  .card-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
  }

  .card-content {
    padding: 16px;
  }

  .input-form {
    margin-bottom: 12px;
    padding: 12px;
    border-radius: 4px;
  }

  .domain-info {
    padding: 5.5px 12px;
    border-radius: 4px;
    display: flex;
    gap: 16px;
    font-size: 14px;
    color: #666;
  }

  .test-buttons {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }

  .test-results {
    margin-top: 0px;
  }

  .summary {
    margin-top: 16px;
    padding: 12px;
    border-radius: 4px;
    .summary-text {
    }
  }

  /* 调整按钮大小 */
  .ant-btn {
    font-size: 12px;
    padding: 2px 8px;
    height: 24px;
  }
}
</style>
