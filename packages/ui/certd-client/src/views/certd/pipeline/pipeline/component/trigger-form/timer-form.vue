<template>
  <div>
    <fs-form-item
      v-model="trigger.props.cron"
      :item="{
        title: t('certd.pipeline.cronForm.title'),
        key: 'props.cron',
        component: {
          disabled: !editMode,
          name: 'cron-editor',
          vModel: 'modelValue',
        },
        helper: t('certd.pipeline.cronForm.helper'),
        rules: [{ required: true, message: t('certd.pipeline.cronForm.required') }],
      }"
    />
  </div>
</template>

<script lang="tsx" setup>
import { inject } from "vue";
import { useI18n } from "vue-i18n";

defineOptions({
  name: "TimerForm",
});

const props = defineProps<{
  editMode: boolean;
}>();
const { t } = useI18n();
const triggerGetter: any = inject("trigger:get");
const trigger = triggerGetter();
</script>
