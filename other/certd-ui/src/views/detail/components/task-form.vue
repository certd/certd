<template>
  <a-drawer
    title="编辑任务"
    placement="right"
    :closable="true"
    width="600px"
    v-model:visible="taskDrawerVisible"
    :after-visible-change="taskDrawerOnAfterVisibleChange"
  >

    <template v-if="currentTask">
      <d-container v-if="currentTask._isAdd" class="task-edit-form">
        <a-row :gutter="10">
          <a-col v-for="(item,index) of taskPluginDefineList" :key="index" class="task-plugin" :span="12">
            <a-card hoverable :class="{'current':item.name === currentTask.type}"
                    @click="taskTypeSelected(item)"  @dblclick="taskTypeSelected(item);taskTypeSave()">
              <a-card-meta>
                <template #title>
                  <a-avatar :src="item.icon||'/images/plugin.png'"/>
                  <span class="title">{{ item.label }}</span>
                </template>
                <template #description>
                  <span :title="item.desc">{{ item.desc }}</span>
                </template>
              </a-card-meta>
            </a-card>
          </a-col>
        </a-row>
        <a-button type="primary" @click="taskTypeSave">
          确定
        </a-button>
      </d-container>
      <d-container v-else class="d-container" >
        <a-form  class="task-form" :label-col="labelCol" :wrapper-col="wrapperCol">
          <a-form-item label="任务名称">
            <a-input
              placeholder="请输入任务名称"
              v-model:value="currentTask.taskName"
            ></a-input>
          </a-form-item>

          <a-form-item v-for="(item,key) in currentPlugin.input" :key="key" :label="item.label">
            <component-render v-model:value="currentTask[key]" v-bind="item.component || {}"></component-render>
          </a-form-item>

        </a-form>

        <template #footer>

          <a-form-item :wrapper-col="{ span: 14, offset: 4 }">
            <a-button type="primary" @click="taskSave">
              确定
            </a-button>
          </a-form-item>
        </template>
      </d-container>

    </template>
  </a-drawer>
</template>

<script>
import { message } from 'ant-design-vue'
import pluginsApi from '@/api/api.plugins'
import { ref } from 'vue'
// eslint-disable-next-line no-unused-vars
import _ from 'lodash-es'
/**
 *  task drawer
 * @returns
 */
function useTaskForm (context) {
  const taskPluginDefineList = ref([])
  const onCreated = async () => {
    const plugins = await pluginsApi.list()
    taskPluginDefineList.value = plugins
  }

  onCreated()

  const currentTask = ref()
  const currentTaskIndex = ref()
  const currentDeploy = ref()
  const currentPlugin = ref(null)
  const taskFormRef = ref(null)
  const taskDrawerVisible = ref(false)

  const taskAdd = (deploy) => {
    const task = { taskName: '新任务', type: undefined, _isAdd: true }
    currentDeploy.value = deploy
    currentDeploy.value.tasks.push(task)
    currentTask.value = deploy.tasks[deploy.tasks.length - 1]
    taskDrawerShow()
  }

  const taskTypeSelected = (item) => {
    currentTask.value.type = item.name
    currentTask.value.taskName = item.label
  }

  const taskTypeSave = () => {
    currentTask.value._isAdd = false
    if (currentTask.value.type == null) {
      message.warn('请先选择类型')
      return
    }
    changeCurrentPlugin(currentTask.value)
  }

  const taskDrawerShow = () => {
    taskDrawerVisible.value = true
  }
  const taskDrawerClose = () => {
    taskDrawerVisible.value = false
  }

  const taskDrawerOnAfterVisibleChange = (val) => {
    console.log('taskDrawerOnAfterVisibleChange', val)
  }

  const taskEdit = (deploy, task, index) => {
    if (task) {
      currentTask.value = task
      currentTaskIndex.value = index
    }
    currentDeploy.value = deploy
    changeCurrentPlugin(currentTask.value)

    taskDrawerShow()
  }

  const changeCurrentPlugin = (task) => {
    const taskType = task.type
    const currentPlugins = taskPluginDefineList.value.filter(p => {
      return p.name === taskType
    })
    if (currentPlugins.length <= 0) {
      task.type = undefined
      task._isAdd = true
      throw new Error('未知插件：' + taskType)
    }
    currentPlugin.value = currentPlugins[0]
  }

  const taskSave = () => {
    console.log('currentTask', currentTask)
    // context.emit('update', currentTask.value)
    taskDrawerClose()
  }

  return {
    taskTypeSelected,
    taskTypeSave,
    taskPluginDefineList,
    taskFormRef,
    taskAdd,
    taskEdit,
    taskDrawerShow,
    taskDrawerVisible,
    taskDrawerOnAfterVisibleChange,
    currentTask,
    currentTaskIndex,
    currentPlugin,
    taskSave
  }
}

function useProviderManager () {
  const providerManager = ref(null)
  const providerManagerOpen = () => {
    providerManager.value.open()
  }
  return { providerManager, providerManagerOpen }
}
export default {
  name: 'task-form',
  emits: ['update'],
  props: {
    options: {}
  },
  setup (props, context) {
    return {
      ...useTaskForm(context),
      ...useProviderManager(),
      labelCol: { span: 6 },
      wrapperCol: { span: 16 }
    }
  }
}
</script>

<style lang="less">
 .task-edit-form{
    .body{
      padding:10px;
      .ant-card {
        margin-bottom: 10px;

        &.current {
          border-color: #00B7FF;
        }

        .ant-card-meta-title {
          display: flex;
          flex-direction: row;
          justify-content: flex-start;
        }

        .ant-avatar {
          width: 24px;
          height: 24px;
          flex-shrink: 0;
        }

        .title {
          margin-left: 5px;
          white-space: nowrap;
          flex: 1;
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      }

      .ant-card-body {
        padding: 14px;
        height: 100px;

        overflow-y: hidden;

        .ant-card-meta-description {
          font-size: 10px;
          line-height: 20px;
          height: 40px;
        }
      }
    }

 }
</style>
