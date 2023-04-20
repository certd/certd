<template>
  <component :is="ui.collapseItem.name" name="element-user-assign">
    <template #header>
      <collapse-title :title="$t('panel.userAssign')">
        <lucide-icon name="FileText" />
      </collapse-title>
    </template>
    <edit-item :label="$t('panel.userType')" :label-width="120">
      <component
        :is="ui.select.name"
        class="w-full"
        v-bind="
          ui.select.builder({
            props: {
              options: userTypeOptions
            },
            vModel: vModeler('userType')
          }).props
        "
      />
    </edit-item>
    <edit-item v-if="formData.userType === 'assignUser'" :label="$t('panel.assignUser')" :label-width="120">
      <component
        :is="ui.select.name"
        class="w-full"
        v-bind="
          ui.select.builder({
            multiple: false,
            options: userList,
            valueName: 'id',
            labelName: 'name',
            vModel: vModeler('assignUser')
          }).props
        "
      />
    </edit-item>

    <edit-item v-if="formData.userType === 'candidateUsers'" :label="$t('panel.candidateUsers')" :label-width="120">
      <component
        :is="ui.select.name"
        class="w-full"
        v-bind="
          ui.select.builder({
            multiple: true,
            options: userList,
            valueName: 'id',
            labelName: 'name',
            vModel: vModeler('candidateUsers')
          }).props
        "
      />
    </edit-item>
    <edit-item v-if="formData.userType === 'candidateGroups'" :label="$t('panel.candidateGroups')" :label-width="120">
      <component
        :is="ui.select.name"
        class="w-full"
        v-bind="
          ui.select.builder({
            multiple: true,
            options: groupList,
            valueName: 'id',
            labelName: 'name',
            vModel: vModeler('candidateGroups')
          }).props
        "
      />
    </edit-item>
  </component>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, onUnmounted, Ref, ref } from "vue";
import { useUi } from "@fast-crud/ui-interface";
import { useModelerStore, Base } from "@fast-crud/fast-bpmn";

export default defineComponent({
  name: "ElementUserAssign",
  setup() {
    const { ui } = useUi();
    const userTypeOptions = ref([
      { value: "assignUser", label: "直接指派" },
      { value: "candidateUsers", label: "候选人" },
      { value: "candidateGroups", label: "候选组" }
    ]);
    const userList = ref([
      { id: "1", username: "admin", name: "管理员" },
      { id: "2", username: "zhangsan", name: "张三" },
      { id: "3", username: "lisi", name: "李四" }
    ]);
    const groupList = ref([
      { id: "1", name: "总经办" },
      { id: "2", name: "研发部" },
      { id: "3", name: "测试部" }
    ]);

    const { injectModelerStore } = useModelerStore();
    const modelerStore = injectModelerStore();

    const getActive = computed(() => modelerStore!.getActive!);
    const helper = modelerStore.helper;

    const formData: Ref = ref({});

    function reload() {
      let element = getActive.value as Base;
      formData.value = {
        userType: helper.getElementProperty(element, "userType"),
        assignUser: helper.getElementProperty(element, "assignUser"),
        candidateUsers: helper.getElementProperty(element, "candidateUsers"),
        candidateGroups: helper.getElementProperty(element, "candidateGroups")
      };
    }

    modelerStore.onElementUpdate(reload);

    function vModeler(key: string) {
      const valueKey = key ? "value." + key : "value";
      return {
        ref: formData,
        key: valueKey,
        onChange: (value: any) => {
          helper.setElementProperty(getActive.value as Base, key, value);
        }
      };
    }

    return { ui, userTypeOptions, vModeler, formData, userList, groupList };
  }
});
</script>
