<template>

  <div class="page-detail">

    <div class="flow">
      <div class="flow-group flow-cert">
        <h3 class="group-head">
          证书申请
        </h3>
        <a-divider></a-divider>
        <div class="cert-display">
          <a-button class="cert-edit-btn" type="link" @click="certFormOpen">
            编辑
          </a-button>

          <div class="label-list">
            <div class="title">证书</div>
            <div class="label-item">
              <label>域名:</label>
              <div class="value">
                <a-tag type="primary" v-for="item of options.cert.domains " :key="item">
                  {{ item }}
                </a-tag>
              </div>
            </div>

            <div class="label-item">
              <label>邮箱:</label>
              <div>
                {{ options.cert.email }}
              </div>
            </div>
            <div class="label-item">
              <label>dns校验:</label>
              <div>
                <span v-if="options.cert?.dnsProvider">
                  {{ options.cert.dnsProvider?.type }}-
                {{options.accessProviders[options.cert.dnsProvider.accessProvider]?.label}}
                </span>

              </div>
            </div>
            <div class="label-item">
              <label>CA:</label>
              <div>
                {{ options.cert.ca }}
              </div>
            </div>

            <br/>
            <div class="title">
              CSR
            <span>必须全英文</span>
            </div>
            <div class="label-item">
              <label>国家:</label>
              <div>
                {{ options.cert.csr.country }}
              </div>
            </div>
            <div class="label-item">
              <label>省份:</label>
              <div>
                {{ options.cert.csr.state }}
              </div>
            </div>
            <div class="label-item">
              <label>市区:</label>
              <div>
                {{ options.cert.csr.locality }}
              </div>
            </div>
            <div class="label-item">
              <label>组织:</label>
              <div>
                {{ options.cert.csr.organization }}
              </div>
            </div>
            <div class="label-item">
              <label>部门:</label>
              <div>
                {{ options.cert.csr.organizationUnit }}
              </div>
            </div>
            <div class="label-item">
              <label>邮箱:</label>
              <div>
                {{ options.cert.csr.emailAddress }}
              </div>
            </div>
          </div>

        </div>

      </div>

      <div class="flow-group flow-deploy">
        <h3 class="group-head">
          部署流程
          <PlusCircleOutlined title="添加部署流程" class="add-icon" @click="deployAdd"/>
        </h3>
        <a-divider></a-divider>

        <div class="deploy-list">

          <a-card class="deploy-item" v-for="(deploy,index) of options.deploy" :key="index">
            <template #title>
              <div class="deploy-name">
                <template v-if="deploy._isEdit">
                  <a-input v-model:value="deploy.deployName"
                           :validateStatus="deploy.deployName?'':'error'"
                           placeholder="请输入流程名称"
                           @keyup.enter="deployCloseEditMode(deploy)"
                  >
                    <template #suffix>
                      <CheckOutlined @click="deployCloseEditMode(deploy)" style="color: rgba(0,0,0,.45)"/>
                    </template>
                  </a-input>
                </template>
                <template v-else>
                  <span @click="deployNameEdit"> <NodeIndexOutlined/> {{ deploy.deployName }}</span>
                  <EditOutlined class="ml-10 edit-icon" @click="deployOpenEditMode(deploy)"/>
                </template>
              </div>

            </template>

            <div class="task-list">
              <div class="task-item-wrapper" v-for="(task,iindex) of deploy.tasks" :key="iindex">
                <a-button class="task-item" shape="round" @click="taskEdit(deploy,task,index)">
                  <ThunderboltOutlined/>
                  {{ task.taskName }}
                </a-button>
                <ArrowRightOutlined class="task-next-icon"/>
              </div>
              <div class="task-item-wrapper">
                <a-button type="primary" class="task-item" shape="round" @click="taskAdd(deploy)">
                  <PlusOutlined/>
                  添加新任务
                </a-button>
              </div>
            </div>

          </a-card>
        </div>
      </div>

      <div class="flow-group flow-export">
        <h3 class="group-head">
          导出
        </h3>
        <a-divider></a-divider>

        <div class="export">

          <div><a-button @click="exportsToZip">导出可执行项目</a-button></div>
          <br/>
          <div> <a-button>仅导出配置</a-button></div>
        </div>
      </div>
    </div>

    <cert-form ref="certFormRef" v-model:cert="options.cert" v-model:access-providers="options.accessProviders"></cert-form>

    <task-form ref="taskFormRef" ></task-form>

  </div>
</template>
<script>
import { message } from 'ant-design-vue'
// eslint-disable-next-line no-unused-vars
import { reactive, ref, toRef, toRefs, provide, readonly } from 'vue'
// eslint-disable-next-line no-unused-vars
import { useRoute } from 'vue-router'
import CertForm from '@/views/detail/components/cert-form'
import TaskForm from './components/task-form'
import exportsApi from '@/api/api.exports'
import _ from 'lodash-es'

function useDeploy (options) {
  const deployAdd = () => {
    options.deploy.push({
      deployName: `D${options.deploy.length + 1}-新部署流程`,
      _isEdit: false,
      tasks: []
    })
  }

  const deployCloseEditMode = (deploy) => {
    if (!deploy.deployName) {
      message.error('请输入流程名称')
      return
    }
    deploy._isEdit = false
    console.log('options', options)
  }

  const deployOpenEditMode = (deploy) => {
    deploy._isEdit = true
  }
  return {
    deployAdd, deployCloseEditMode, deployOpenEditMode
  }
}

function useProvideAccessProviders (options) {
  provide('get:accessProviders', () => {
    return options.accessProviders
  })
  provide('update:accessProviders', (providers) => {
    options.accessProviders = providers
  })
}

function useExports (options) {
  return {
    async exportsToZip () {
      await exportsApi.exportsToZip(options)
    }
  }
}

export default {
  components: { CertForm, TaskForm },
  setup () {
    const route = useRoute()
    console.log('route', route)
    const optionParams = route.params.options ? JSON.parse(route.params.options) : {}
    const optionsDefault = {
      cert: {
        csr: {
          country: 'CN',
          state: 'GuangDong',
          locality: 'ShengZhen',
          organization: 'CertD Org.',
          organizationUnit: 'IT Department'
        }
      },
      accessProviders: [{ key: 'aliyun', type: 'aliyun', name: 'aliyun' }],
      deploy: []
    }
    _.merge(optionsDefault, optionParams)
    // optionsDefault.accessProviders = reactive(optionsDefault.accessProviders)
    const options = reactive(optionsDefault)

    const certFormChanged = (value) => {
      console.log('certFormChanged', value)
      options.cert = value
    }

    const certFormRef = ref(null)
    const certFormOpen = () => {
      certFormRef.value.open()
    }

    const taskFormRef = ref(null)
    const taskAdd = (deploy) => {
      taskFormRef.value.taskAdd(deploy)
    }
    const taskEdit = (deploy, task, index) => {
      taskFormRef.value.taskEdit(deploy, task, index)
    }

    useProvideAccessProviders(options)

    return {
      options,
      certFormChanged,
      certFormRef,
      certFormOpen,
      ...useDeploy(options),
      taskFormRef,
      taskAdd,
      taskEdit,
      ...useExports(options)
    }
  }
}
</script>
<style lang="less">
.page-detail {
  height: 100%;
  overflow-y: auto;
  position: relative;
  width: 100%;
  background-color: #fff;

  .label-list {
    .title{
      font-weight: 500;
      font-size: 16px;
      color:#555;
      span{
        font-weight: 200;
        margin-left:5px;
        font-size: 12px;
        color:#888;
      }
    }
    .label-item {
      display: flex;
      flex-direction: row;
      justify-content: flex-start;
      align-items: baseline;
      padding: 8px 0px;

      label {
        width: 70px;
        flex-shrink: 0;
        color: rgba(0, 0, 0, 0.85);
        font-weight: normal;
        font-size: 14px;
        line-height: 1.5715;
        text-align: end;
        padding-right: 10px;
      }

      .value {
        flex: 1;
      }
    }
  }

  .flow {
    height: 100%;

    h3 {
      text-align: center;
    }

    display: flex;
    flex-direction: row;

    .flow-group {
      min-width: 300px;
      height: 100%;
      border-right: 1px #eee solid;
      padding: 20px;

      .group-head {
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;

        .add-icon {
          margin-left: 20px;
          font-size: 24px;
          color: #737070;
        }
      }
    }

    .flow-cert {
      max-width: 400px;

      .cert-display {
        position: relative;

        .cert-edit-btn {
          position: absolute;
          right: 0px;
          top: 0px;
        }
      }
    }

    .add-icon {
      font-size: 26px;
    }

    .flow-deploy {
      flex-shrink: 0;
      flex: 1;
      display: flex;
      flex-direction: column;

      .deploy-list {
        flex: 1;
        overflow-y: auto;

        .deploy-item {
          margin-bottom: 10px;
        }
      }

      // min-width:70%;
      .deploy-name {
        max-width: 300px;

        .edit-icon {
          color: #737070;
        }
      }
    }

    .flow-export{
      max-width: 300px;
    }

  }

}

.ant-form.task-form {
  padding: 10px 24px;
}

.task-list {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  justify-content: flex-start;
  align-items: center;

  > * {
    margin-bottom: 10px;
  }

  .task-item-wrapper {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    justify-content: flex-start;
    align-items: center;
  }

  .task-item {
    //border: 1px solid #eee;
    //padding: 10px 20px;
    //border-radius: 20px;
  }

  .task-add-icon {
    font-size: 24px;
    margin-right: 10px;
  }

  .task-next-icon {
    margin-left: 10px;
    margin-right: 10px;
  }
}

.task-type-selector {

}

.task-form {
  .task-plugin-list {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;

    > * {
      margin-right: 8px;
    }

    .task-plugin {
      margin-bottom: 10px;
    }

  }
}

</style>
