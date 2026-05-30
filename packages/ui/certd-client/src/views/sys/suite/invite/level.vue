<template>
  <fs-page class="page-sys-invite-level">
    <template #header>
      <div class="title">推广等级</div>
    </template>
    <fs-crud ref="crudRef" v-bind="crudBinding">
      <a-empty v-if="levelList.length === 0" class="level-empty" />
      <div v-else class="level-card-grid">
        <div v-for="(item, index) of levelList" :key="item.id" class="level-card" :class="{ disabled: item.disabled, exclusive: item.levelType === 'exclusive' }">
          <div class="level-card-actions">
            <a-tooltip title="编辑">
              <a-button type="text" size="small" @click="openEdit({ index, row: item })">
                <template #icon><fs-icon icon="ion:create-outline" /></template>
              </a-button>
            </a-tooltip>
            <a-tooltip :title="item.disabled ? '启用' : '禁用'">
              <a-button type="text" size="small" @click="toggleDisabled(item)">
                <template #icon><fs-icon :icon="item.disabled ? 'ion:play-outline' : 'ion:pause-outline'" /></template>
              </a-button>
            </a-tooltip>
            <a-tooltip title="删除">
              <a-button type="text" danger size="small" @click="confirmRemove({ index, row: item })">
                <template #icon><fs-icon icon="ion:trash-outline" /></template>
              </a-button>
            </a-tooltip>
          </div>
          <div class="level-name">
            <span class="level-medal">
              <fs-icon :icon="levelIcon(item)" />
            </span>
            {{ item.name }}
            <a-tag v-if="item.levelType === 'exclusive'" color="orange">专属</a-tag>
          </div>
          <div class="level-rate-label">佣金比例</div>
          <div class="level-rate">{{ item.commissionRate || 0 }}%</div>
          <div v-if="item.levelType === 'exclusive'" class="level-threshold exclusive-threshold">平台指定专属等级</div>
          <div v-else class="level-threshold">累计推广 ≥ {{ amountToYuan(item.minAmount) }} 元</div>
          <div class="level-meta">
            <a-tag :color="item.disabled ? 'default' : 'success'">{{ item.disabled ? "已禁用" : "已启用" }}</a-tag>
            <span>排序 {{ item.sort || 0 }}</span>
          </div>
        </div>
      </div>
    </fs-crud>
  </fs-page>
</template>

<script lang="ts" setup>
import { computed, onActivated, onMounted } from "vue";
import { Modal, notification } from "ant-design-vue";
import { useFs } from "@fast-crud/fast-crud";
import createCrudOptions from "./crud-level";
import * as api from "./api";
import { util } from "/@/utils";

defineOptions({ name: "SysInviteLevel" });

const { crudBinding, crudRef, crudExpose } = useFs({ createCrudOptions });
const levelList = computed(() => crudBinding.value?.data || []);

function amountToYuan(amount: number) {
  return util.amount.toYuan(amount || 0);
}

function levelIcon(level: any) {
  return level?.icon || "ion:ribbon-outline";
}

function openEdit(opts: any) {
  crudExpose.openEdit(opts);
}

async function toggleDisabled(row: any) {
  await api.UpdateLevel({
    ...row,
    disabled: !row.disabled,
  });
  notification.success({ message: row.disabled ? "已启用" : "已禁用" });
  await crudExpose.doRefresh();
}

function confirmRemove(opts: any) {
  Modal.confirm({
    title: "确认删除推广等级？",
    content: "删除后不可恢复。如果该等级已被用户使用，可能会出现异常，请确认已完成数据处理。",
    okText: "确认删除",
    okType: "danger",
    onOk: async () => {
      await api.DeleteLevel(opts.row.id);
      notification.success({ message: "已删除" });
      await crudExpose.doRefresh();
    },
  });
}

onMounted(() => {
  crudExpose.doRefresh();
});
onActivated(() => {
  crudExpose.doRefresh();
});
</script>

<style lang="less">
.page-sys-invite-level {
  .fs-crud-container {
    padding-top: 14px;
  }

  .fs-crud-table {
    display: none;
  }

  .level-card-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 16px;
    padding: 4px 8px;
  }

  .level-empty {
    padding: 64px 0;
  }

  .level-card {
    position: relative;
    min-height: 156px;
    padding: 16px;
    overflow: hidden;
    border: 1px solid rgba(148, 163, 184, 0.28);
    border-radius: 8px;
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.92), rgba(248, 250, 252, 0.78)), linear-gradient(135deg, rgba(52, 120, 246, 0.14), rgba(197, 138, 53, 0.12));
    box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
    transition:
      transform 0.18s ease,
      box-shadow 0.18s ease,
      border-color 0.2s,
      background-color 0.2s;
  }

  .level-card::before {
    position: absolute;
    inset: 12px;
    border: 1px solid rgba(255, 255, 255, 0.68);
    border-radius: 6px;
    content: "";
    pointer-events: none;
  }

  .level-card:hover {
    border-color: rgba(52, 120, 246, 0.42);
    box-shadow: 0 16px 38px rgba(15, 23, 42, 0.14);
    transform: translateY(-3px);
  }

  .level-card.exclusive {
    border-color: rgba(147, 51, 234, 0.34);
    background: linear-gradient(145deg, rgba(255, 255, 255, 0.92), rgba(250, 245, 255, 0.86)), linear-gradient(135deg, rgba(147, 51, 234, 0.24), rgba(245, 158, 11, 0.2));
    box-shadow: 0 12px 32px rgba(88, 28, 135, 0.14);
  }

  .level-card.exclusive:hover {
    border-color: rgba(147, 51, 234, 0.52);
    box-shadow: 0 18px 42px rgba(88, 28, 135, 0.2);
  }

  .level-card.disabled {
    opacity: 0.66;
  }

  .level-card-actions {
    position: absolute;
    top: 8px;
    right: 8px;
    display: flex;
    gap: 2px;

    .ant-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border: 1px solid rgba(148, 163, 184, 0.2);
      background: rgba(255, 255, 255, 0.72);
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
      backdrop-filter: blur(8px);
    }

    .ant-btn:hover {
      background: #fff;
      transform: translateY(-1px);
    }

    .fs-icon {
      font-size: 16px;
    }
  }

  .level-name {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 26px;
    padding: 0 72px;
    gap: 6px;
    color: hsl(var(--foreground));
    font-weight: 700;
    text-align: center;
  }

  .level-medal {
    display: inline-flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    color: #8a5a16;
    font-size: 20px;
    filter: drop-shadow(0 4px 8px rgba(197, 138, 53, 0.22));
  }

  .level-rate-label {
    margin-top: 12px;
    color: hsl(var(--muted-foreground));
    font-size: 12px;
    text-align: center;
  }

  .level-rate {
    margin-top: 2px;
    color: #c58a35;
    font-size: 28px;
    font-weight: 700;
    line-height: 34px;
    text-align: center;
  }

  .level-threshold {
    margin-top: 6px;
    color: hsl(var(--muted-foreground));
    font-size: 12px;
    text-align: center;
  }

  .exclusive-threshold {
    color: #8a5a16;
  }

  .level-meta {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 10px;
    color: hsl(var(--muted-foreground));
    font-size: 12px;
  }
}

@media (max-width: 1200px) {
  .page-sys-invite-level {
    .level-card-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
}

@media (max-width: 900px) {
  .page-sys-invite-level {
    .level-card-grid {
      grid-template-columns: 1fr;
    }
  }
}
</style>
