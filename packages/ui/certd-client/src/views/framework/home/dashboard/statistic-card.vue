<template>
  <div class="statistic-card">
    <a-card>
      <div class="data-item">
        <div class="header">
          <div class="title">
            <fs-icon :icon="icon" class="statistic-icon"></fs-icon>
            {{ title }}
          </div>
          <div class="more"></div>
        </div>
        <div class="content">
          <div v-if="!slots.default" class="statistic">
            <div v-if="count !== 0" class="value flex items-center w-full">
              <div class="total flex-center flex-1 flex-col pointer" @click="goDetail(link)">
                <span>{{ count }}</span>
                <span class="sub-title">{{ title }}</span>
              </div>
              <a-divider type="vertical h-10"></a-divider>
              <div class="sub flex-1 flex-col h-[80%] flex-evenly pl-1 2xl:pl-4">
                <div v-for="item in subCounts" :key="item.name" class="sub-item flex justify-center w-full pointer" :title="item.title" @click="goDetail(item.link)">
                  <div class="flex items-center w-[60%] ellipsis overflow-hidden">
                    <div class="status-indicator" :class="`bg-${item.color}`"></div>
                    {{ item.name }}：
                  </div>
                  <div class="w-[40%] flex items-center justify-center relative">
                    <span class="icon-text">{{ item.value }}</span>
                    <div v-if="item.value !== 0 && item.checkIcon" class="ml-2 flex items-center absolute right-0">
                      <fs-icon :icon="item.checkIcon" class="fs-icon"></fs-icon>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <a-empty v-else></a-empty>
          </div>
          <slot></slot>
        </div>
        <div v-if="slots.footer" class="footer">
          <slot name="footer"></slot>
        </div>
      </div>
    </a-card>
  </div>
</template>
<script setup lang="ts">
import { FsIcon } from "@fast-crud/fast-crud";
import { useRouter } from "vue-router";
const props = defineProps<{
  icon: string;
  title: string;
  count?: number;
  link?: any;
  subCounts?: {
    name: string;
    value: number;
    color: string;
    checkIcon?: string;
    title?: string;
    link?: any;
  }[];
}>();
const slots = defineSlots();
const router = useRouter();
function goDetail(link: any) {
  if (!link) {
    return;
  }
  if (typeof link === "string") {
    router.push({ path: link });
  } else {
    router.push(link);
  }
}
</script>
<style lang="less">
.dark {
  .data-item {
    .header {
      color: rgba(242, 242, 242, 0.85) !important;
    }
  }
}
.statistic-card {
  margin-bottom: 10px;
  .icon-text {
    display: inline-flex;
    justify-content: left;
    align-items: center;

    .fs-icon {
      margin-right: 5px;
      font-size: 14px;
    }
  }

  .data-item {
    display: flex;
    flex-direction: column;
    height: 200px;

    .header {
      display: flex;
      justify-content: space-between;
      margin-top: 6px;
      margin-bottom: 6px;
      color: #494949;
      align-items: center;

      .title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-weight: 600;
        font-size: 16px;
      }

      .more {
        display: flex;
        align-items: center;
      }

      .statistic-icon {
        font-size: 28px;
        margin-right: 5px;
      }
    }

    .content {
      display: flex;
      flex-direction: column;
      flex: 1;

      .statistic {
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;

        .value {
          font-size: 50px;
          font-weight: 700;
          .total {
            color: hsl(var(--primary));
            .sub-title {
              font-size: 12px;
              font-weight: 400;
              color: #626262;
            }
          }

          .sub-item {
            font-size: 14px;

            .status-indicator {
              width: 10px;
              height: 10px;
              border-radius: 50%;
              margin-right: 12px;
              flex-shrink: 0;
            }

            .bg-green {
              background: linear-gradient(90deg, #4caf50, #8bc34a);
            }

            .bg-red {
              background: linear-gradient(90deg, #f44336, #e57373);
            }

            .bg-yellow {
              background: linear-gradient(90deg, #ff9800, #ffc107);
            }
            .bg-blue {
              background: linear-gradient(90deg, #2196f3, #64b5f6);
            }
            .bg-gray {
              background: linear-gradient(90deg, #9e9e9e, #bdbdbd);
            }
          }
        }
      }
    }

    .footer {
      color: #8077a4;
      font-size: 12px;
      text-align: right;
      display: flex;
      justify-content: right;
      align-items: center;
      border-color: #e8e8e8;
      border-style: dashed;
      border-width: 1px 0 0;
      padding-top: 15px;

      > * {
        cursor: pointer;
      }
    }
  }
}
</style>
