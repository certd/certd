<template>
  <div class="flex-col h-100 tutorial-steps">
    <a-steps v-model:current="current" class="mt-10" :percent="percent" size="small" :items="steps" @change="stepChanged"></a-steps>

    <div class="step-item overflow-hidden">
      <div class="text">
        <h3 class="title">{{ number }} {{ currentStepItem.title }}</h3>
        <div class="description mt-5">
          <div v-for="desc of currentStepItem.descriptions">{{ desc }}</div>
        </div>
      </div>

      <div class="image-box">
        <a-image :src="currentStepItem.image" :preview-mask="previewMask" />
      </div>
    </div>

    <div class="flex-center actions">
      <fs-button class="m-10" icon="mingcute:arrow-left-fill" @click="prev()">上一步</fs-button>
      <fs-button class="m-10" icon-right="mingcute:arrow-right-fill" @click="next()">下一步</fs-button>
    </div>
  </div>
</template>

<script setup lang="tsx">
type Step = {
  title: string;
  subTitle?: string;
  description?: string;
  items: StepItems[];
};
type StepItems = {
  image: string;
  title: string;
  descriptions?: string[];
};

import { computed, nextTick, ref } from "vue";

const steps = ref<Step[]>([
  {
    title: "创建证书申请流水线",
    description: "演示证书申请任务如何配置",
    items: [
      {
        image: "/static/doc/images/1-add.png",
        title: "创建证书流水线",
        descriptions: ["点击添加流水线，选择证书申请"]
      },
      {
        image: "/static/doc/images/2-access-provider.png",
        title: "DNS授权",
        descriptions: ["证书申请需要给域名添加TXT解析记录来验证域名所有权"]
      },
      {
        image: "/static/doc/images/3-add-access.png",
        title: "第一次使用，需要添加DNS授权",
        descriptions: ["选择DNS授权，确认创建"]
      },
      // {
      //   image: "/static/doc/images/3-add-access.png",
      //   title: "确定创建流水线",
      //   descriptions: ["选择DNS授权，信息填写无误，确认创建"]
      // },
      {
        image: "/static/doc/images/4-add-success.png",
        title: "流水线创建成功",
        descriptions: ["此时证书申请任务已经建好，点击手动触发即可测试证书申请", "接下来演示如何添加部署任务"]
      }
    ]
  },
  {
    title: "添加部署证书任务",
    description: "演示部署到阿里云CDN和Nginx",
    items: [
      {
        image: "/static/doc/images/6-1-add-task.png",
        title: "添加部署任务",
        descriptions: ["演示第一个部署任务，部署到阿里云CDN"]
      },
      {
        image: "/static/doc/images/6-2-add-task.png",
        title: "选择任务插件",
        descriptions: ["可以搜索插件，这里选择阿里云CDN插件"]
      },
      {
        image: "/static/doc/images/6-3-add-task.png",
        title: "配置任务参数",
        descriptions: ["填写CDN的域名和证书ID", "任务保存之后，阿里云CDN的部署任务就配置好了"]
      },
      {
        image: "/static/doc/images/7-1-add-host-task.png",
        title: "添加主机部署任务",
        descriptions: ["接下来演示配置第二个部署任务，部署到主机", "部署到主机分两步: 1. 上传证书到主机 2. 运行主机命令"]
      },
      {
        image: "/static/doc/images/7-2-add-host-task.png",
        title: "配置上传到主机任务",
        descriptions: ["填写上传到主机任务参数", "比如证书保存路径"]
      },
      {
        image: "/static/doc/images/7-3-add-host-task.png",
        title: "添加主机ssh登录授权",
        descriptions: ["填写主机ip、用户名、密码，授权只需添加一次，后续其他任务可以复用"]
      },
      {
        image: "/static/doc/images/8-1-add-host-task.png",
        title: "上传到主机任务配置完成",
        descriptions: ["接下来配置主机执行脚本，去部署证书"]
      },
      {
        image: "/static/doc/images/8-2-add-host-task.png",
        title: "选择添加主机远程命令任务",
        descriptions: ["选择主机远程命令任务"]
      },
      {
        image: "/static/doc/images/8-4-add-host-task.png",
        title: "填写证书部署脚本",
        descriptions: ["选择主机授权，编写部署脚本，这里演示部署到nginx，需要重启nginx，让证书生效"]
      },
      {
        image: "/static/doc/images/8-5-add-host-task.png",
        title: "上传到主机任务的两个步骤配置完成",
        descriptions: ["接下来测试运行"]
      }
    ]
  },
  {
    title: "运行与测试",
    description: "演示流水线运行,查看日志，成功后跳过等",
    items: [
      {
        image: "/static/doc/images/9-start.png",
        title: "运行测试一下",
        descriptions: ["之前是把证书上传到主机，接下来要运行命令，去部署证书"]
      },
      {
        image: "/static/doc/images/10-1-log.png",
        title: "查看日志",
        descriptions: ["点击任务可以查看状态和日志"]
      },
      {
        image: "/static/doc/images/11-1-error.png",
        title: "执行失败如何排查",
        descriptions: ["查看错误日志"]
      },
      {
        image: "/static/doc/images/11-2-error.png",
        title: "执行失败如何排查",
        descriptions: ["查看错误日志,这里报的是nginx容器不存在，修改命令改成正确的nginx容器名称"]
      },
      {
        image: "/static/doc/images/12-1-log-success.png",
        title: "执行成功",
        descriptions: ["修改正确后，重新点击手动触发，重新运行一次，执行成功"]
      },
      {
        image: "/static/doc/images/12-2-skip-log.png",
        title: "成功后自动跳过",
        descriptions: ["可以看到成功过的将会自动跳过，不会重复执行，只有当参数变更或者证书更新了，才会重新运行"]
      },
      {
        image: "/static/doc/images/13-1-result.png",
        title: "查看证书部署成功",
        descriptions: ["访问nginx上的网站，可以看到证书已经部署成功"]
      },
      {
        image: "/static/doc/images/13-2-result.png",
        title: "阿里云CDN也部署成功",
        descriptions: ["阿里云CDN上已经更新证书，证书名称已certd开头"]
      },
      {
        image: "/static/doc/images/13-3-download.png",
        title: "还可以下载证书，手动部署",
        descriptions: ["如果还没有好用的部署插件，没办法自动部署，你还可以下载证书，手动部署"]
      }
    ]
  },
  {
    title: "设置定时执行和邮件通知",
    description: "自动运行",
    items: [
      {
        image: "/static/doc/images/14-timer.png",
        title: "设置定时执行",
        descriptions: [
          "流水线测试成功，接下来配置定时触发，以后每天定时执行就不用管了",
          "推荐配置每天运行一次，在到期前20天才会重新申请新证书并部署，没到期前会自动跳过，不会重复申请。"
        ]
      },
      {
        image: "/static/doc/images/15-1-email.png",
        title: "设置邮件通知",
        descriptions: ["建议选择监听'错误时'和'错误转成功'两种即可，在意外失败时可以尽快去排查问题，（免费版需要配置邮件服务器）"]
      }
    ]
  }
]);

const current = ref(0);
const currentItem = ref(0);

const number = computed(() => {
  return `${current.value + 1}-${currentItem.value + 1}. `;
});
const currentStep = computed(() => {
  return steps.value[current.value];
});
const currentStepItem = computed(() => {
  return currentStep.value.items[currentItem.value];
});

const percent = computed(() => {
  return ((currentItem.value + 1) / currentStep.value.items.length) * 100;
});

function stepNext() {
  if (current.value < steps.value.length - 1) {
    current.value++;
    return true;
  }
  return false;
}

function stepPrev() {
  if (current.value > 0) {
    current.value--;
    return true;
  } else {
    return false;
  }
}

function next() {
  if (currentItem.value < currentStep.value.items.length - 1) {
    currentItem.value++;
  } else {
    if (stepNext()) {
      currentItem.value = 0;
    }
  }
}
function prev() {
  if (currentItem.value > 0) {
    currentItem.value--;
  } else {
    if (stepPrev()) {
      nextTick(() => {
        currentItem.value = currentStep.value.items.length - 1;
      });
    }
  }
}

function stepChanged(index: number) {
  current.value = index;
  currentItem.value = 0;
}
function previewMask() {
  return (
    <div title="点击放大" class="h-100 w-100">
      {" "}
    </div>
  );
}
</script>

<style lang="less">
.tutorial-steps {
  .step-item {
    display: flex !important;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    flex: 1;
    padding: 20px;
    .text {
      width: 350px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .image-box {
      overflow: hidden;
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: #eee;
      width: 100%;
      height: 100%;
      .ant-image-mask {
        background: rgba(255, 255, 255, 0);
      }
      .ant-image {
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
      }
    }
    .desc {
      margin-top: 10px;
      font-size: 16px;
      font-weight: bold;
    }
  }

  .actions {
    .fs-icon {
      margin-left: 5px;
      margin-right: 5px;
    }
  }

  .ant-steps .ant-steps-item-description {
    font-size: 12px !important;
    color: #999 !important;
  }
}
</style>
