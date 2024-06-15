<template>
  <fs-page>
    <template #header>
      <div class="title">独立使用组件</div>
      <div class="more"></div>
    </template>
    <div style="padding: 20px; width: 50%">
      <a-form ref="formRef" :model="form" :label-col="{ style: { width: '150px' } }">
        <a-form-item label="上传">
          <fs-file-uploader v-model="form.upload" :uploader="uploader" />
        </a-form-item>
        <a-form-item label="裁剪">
          <fs-cropper-uploader v-model="form.avatar" v-bind="cropperUploader" />
        </a-form-item>
        <a-form-item label="可复制">
          <fs-copyable v-model="form.copyable" />
        </a-form-item>
        <a-form-item label="人性化时间">
          <fs-time-humanize v-model="form.humanizeTime" />
          = {{ form.humanizeTime.format("YYYY-MM-DD HH:mm:ss") }}
        </a-form-item>
        <a-form-item label="dict-select">
          <fs-dict-select v-model="form.select" :dict="dictRef" />
        </a-form-item>
        <a-form-item label="使用上传方法">
          <input type="file" @change="fileUploaderChange" />
          <a v-if="signedUrl" :href="signedUrl" target="_blank">下载</a>
        </a-form-item>
        <a-form-item label="表格选择">
          <fs-table-select v-model="form.tableSelect" v-bind="tableSelectBinding" />
          <fs-label label="切换value">
            <a-radio-group v-model:value="form.tableSelect">
              <a-radio :value="1">王小虎</a-radio>
              <a-radio :value="2">id为2的记录</a-radio>
            </a-radio-group>
          </fs-label>
        </a-form-item>
        <a-form-item>
          <a-button @click="submit">提交</a-button>
        </a-form-item>
      </a-form>
    </div>
  </fs-page>
</template>

<script lang="ts" setup>
import { reactive, ref } from "vue";
import { message } from "ant-design-vue";
import {dict, useUi, utils} from "@fast-crud/fast-crud";
import dayjs from "dayjs";
import { FsUploaderS3, loadUploader, useUploader } from "@fast-crud/fast-extends";
import createCrudOptionsText from "/@/views/crud/component/text/crud";
import * as textTableApi from "/@/views/crud/component/text/api";

defineOptions({
  name: "ComponentIndependent"
});
const form = reactive({
  upload: [],
  avatar: undefined,
  copyable: "可复制的内容",
  select: 1,
  humanizeTime: dayjs(new Date().getTime() - 100000),
  tableSelect: null
});

const uploader = ref({
  type: "cos",
  keepName: true
});

const cropperUploader = ref({
  uploader: {
    type: "cos",
    keepName: true
  },
  cropper: {
    viewMode: 1
  },
  async onReady(context: any) {
    utils.logger.info("onReady", context);
    context.zoom(-0.1);
    context.zoom(-0.1);
    context.zoom(-0.1);
  }
});

const dictRef = dict({
  data: [
    { label: "选项1", value: 1 },
    { label: "选项2", value: 2 },
    { label: "选项3", value: 3 }
  ]
});

const tableSelectBinding = ref({
  dict: dict({
    value: "id",
    label: "name",
    getNodesByValues: async (values: any[]) => {
      return await textTableApi.GetByIds(values);
    }
  }),
  crossPage: true,
  valuesFormat: {
    labelFormatter: (item: any) => {
      return `${item.id}.${item.name}`;
    }
  },
  select: {
    placeholder: "点击选择"
  },
  createCrudOptions: createCrudOptionsText
});

const signedUrl = ref();
async function fileUploaderChange(event: any) {
  const file = event.target.files[0];
  //异步加载上传组件
  const s3Uploader = await loadUploader<FsUploaderS3>("s3");
  const res = await s3Uploader.upload({
    file,
    fileName: file.name,
    onProgress(progress: any) {
      utils.logger.info("progress:" + progress.percent + "%");
    }
  });
  const { ui } = useUi();
  ui.message.info("upload success；" + JSON.stringify(res));
  //构建下载地址
  const { getConfig } = useUploader();
  const s3Config = getConfig("s3");
  const url = await s3Uploader.buildSignedUrl(s3Config, res.key, "get");
  signedUrl.value = url;
}

function submit() {
  message.info("submit:" + JSON.stringify(form));
  utils.logger.info("submit:", form);
}
</script>
