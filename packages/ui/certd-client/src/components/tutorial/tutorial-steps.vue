<template>
  <div class="flex-col h-100 tutorial-steps">
    <a-steps v-model:current="current" class="mt-10" :percent="percent" size="small" :items="steps" @change="stepChanged"></a-steps>

    <div class="step-item overflow-hidden">
      <div class="text">
        <h3 class="title">{{ number }} {{ currentStepItem.title }}</h3>
        <div class="description mt-5">
          <div v-for="(desc, index) of currentStepItem.descriptions" :key="index">{{ desc }}</div>
        </div>
        <div v-if="currentStepItem.body">
          <fs-render :render-func="currentStepItem.body" />
        </div>
      </div>
      <template v-if="currentStepItem.image">
        <div class="image-box">
          <a-image :src="currentStepItem.image" :preview-mask="previewMask" />
        </div>
      </template>
    </div>

    <div class="flex-center actions">
      <fs-button class="m-10" icon="ion:arrow-back-outline" @click="prev()">{{ t("guide.buttons.prev") }}</fs-button>
      <fs-button class="m-10" type="primary" icon-right="ion:arrow-forward-outline" @click="next()">{{ t("guide.buttons.next") }}</fs-button>
    </div>
  </div>
</template>

<script setup lang="tsx">
import { FsRender } from "@fast-crud/fast-crud";
import { useI18n } from "vue-i18n";
import SimpleSteps from "./simple-steps.vue";

const props = defineProps<{
  mode?: string;
}>();
const { t } = useI18n();
type Step = {
  title: string;
  subTitle?: string;
  description?: string;
  items: StepItems[];
};
type StepItems = {
  image?: string;
  title: string;
  descriptions?: string[];
  body?: () => JSX.Element;
};

import { computed, nextTick, ref } from "vue";

const steps = ref<Step[]>([
  {
    title: t("guide.createCertPipeline.title"),
    description: t("guide.createCertPipeline.description"),
    items: [
      {
        title: t("guide.createCertPipeline.items.tutorialTitle"),
        descriptions: [t("guide.createCertPipeline.items.tutorialDesc1"), t("guide.createCertPipeline.items.tutorialDesc2")],
        body: () => {
          return <SimpleSteps></SimpleSteps>;
        },
      },
      {
        image: "/static/doc/images/1-add.png",
        title: t("guide.createCertPipeline.items.createTitle"),
        descriptions: [t("guide.createCertPipeline.items.createDesc")],
      },
      {
        image: "/static/doc/images/3-add-success.png",
        title: t("guide.createCertPipeline.items.successTitle"),
        descriptions: [t("guide.createCertPipeline.items.successDesc")],
      },
      // {
      //   title: t("guide.createCertPipeline.items.nextTitle"),
      //   descriptions: [t("guide.createCertPipeline.items.nextDesc")],
      // },
    ],
  },
  {
    title: t("guide.addDeployTask.title"),
    description: t("guide.addDeployTask.description"),
    items: [
      {
        image: "/static/doc/images/5-1-add-host.png",
        title: t("guide.addDeployTask.items.addTaskTitle"),
        descriptions: [t("guide.addDeployTask.items.addTaskDesc1"), t("guide.addDeployTask.items.addTaskDesc2")],
      },
      {
        image: "/static/doc/images/5-2-add-host.png",
        title: t("guide.addDeployTask.items.fillParamsTitle"),
        descriptions: [t("guide.addDeployTask.items.fillParamsDesc1"), t("guide.addDeployTask.items.fillParamsDesc2")],
      },
      {
        image: "/static/doc/images/5-3-add-host.png",
        title: t("guide.addDeployTask.items.activateCertTitle"),
        descriptions: [t("guide.addDeployTask.items.activateCertDesc1"), t("guide.addDeployTask.items.activateCertDesc2")],
      },
      {
        image: "/static/doc/images/5-4-add-host.png",
        title: t("guide.addDeployTask.items.taskSuccessTitle"),
        descriptions: [t("guide.addDeployTask.items.taskSuccessDesc")],
      },
      {
        image: "/static/doc/images/5-5-plugin-list.png",
        title: t("guide.addDeployTask.items.pluginsTitle"),
        descriptions: [t("guide.addDeployTask.items.pluginsDesc")],
      },
    ],
  },
  {
    title: t("guide.runAndTestTask.runAndTestTitle"),
    description: t("guide.runAndTestTask.runAndTestDescription"),
    items: [
      {
        image: "/static/doc/images/9-start.png",
        title: t("guide.runAndTestTask.runTestOnce"),
        descriptions: [t("guide.runAndTestTask.clickManualTriggerToTest")],
      },
      {
        image: "/static/doc/images/10-1-log.png",
        title: t("guide.runAndTestTask.viewLogs"),
        descriptions: [t("guide.runAndTestTask.clickTaskToViewStatusAndLogs")],
      },
      {
        image: "/static/doc/images/11-1-error.png",
        title: t("guide.runAndTestTask.howToTroubleshootFailure"),
        descriptions: [t("guide.runAndTestTask.viewErrorLogs")],
      },
      {
        image: "/static/doc/images/11-2-error.png",
        title: t("guide.runAndTestTask.howToTroubleshootFailure"),
        descriptions: [t("guide.runAndTestTask.viewErrorLogs"), t("guide.runAndTestTask.nginxContainerNotExistFix")],
      },
      {
        image: "/static/doc/images/12-1-log-success.png",
        title: t("guide.runAndTestTask.executionSuccess"),
        descriptions: [t("guide.runAndTestTask.retryAfterFix")],
      },
      {
        image: "/static/doc/images/12-2-skip-log.png",
        title: t("guide.runAndTestTask.autoSkipAfterSuccess"),
        descriptions: [t("guide.runAndTestTask.successSkipExplanation")],
      },
      {
        image: "/static/doc/images/13-1-result.png",
        title: t("guide.runAndTestTask.viewCertDeploymentSuccess"),
        descriptions: [t("guide.runAndTestTask.visitNginxToSeeCert")],
      },
      {
        image: "/static/doc/images/13-3-download.png",
        title: t("guide.runAndTestTask.downloadCertManualDeploy"),
        descriptions: [t("guide.runAndTestTask.downloadIfNoAutoDeployPlugin")],
      },
    ],
  },
  {
    title: t("guide.scheduleAndEmailTask.title"),
    description: t("guide.scheduleAndEmailTask.description"),
    items: [
      {
        image: "/static/doc/images/14-timer.png",
        title: t("guide.scheduleAndEmailTask.setSchedule"),
        descriptions: [t("guide.scheduleAndEmailTask.pipelineSuccessThenSchedule"), t("guide.scheduleAndEmailTask.recommendDailyRun")],
      },
      {
        image: "/static/doc/images/15-1-email.png",
        title: t("guide.scheduleAndEmailTask.setEmailNotification"),
        descriptions: [t("guide.scheduleAndEmailTask.suggestErrorAndRecoveryEmails")],
      },
      {
        title: t("guide.scheduleAndEmailTask.tutorialEndTitle"),
        descriptions: [t("guide.scheduleAndEmailTask.thanksForWatching")],
      },
    ],
  },
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

  .description {
    text-align: center;
  }
}
</style>
