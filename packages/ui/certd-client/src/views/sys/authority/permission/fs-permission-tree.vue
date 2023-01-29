<template>
  <a-tree
    v-if="computedTree"
    ref="treeRef"
    class="fs-permission-tree"
    :class="{ 'is-editable': editable }"
    :selectable="false"
    show-line
    :show-icon="false"
    :default-expand-all="true"
    :tree-data="computedTree"
    @check="onChecked"
  >
    <template #title="scope">
      <div class="node-title-pane">
        <div class="node-title">{{ scope.title }}</div>
        <div v-if="editable === true" class="node-suffix">
          <fs-icon v-if="actions.add !== false" :icon="$fsui.icons.add" @click.stop="add(scope)" />
          <fs-icon
            v-if="actions.edit !== false && scope.id !== -1"
            :icon="$fsui.icons.edit"
            @click.stop="edit(scope)"
          />
          <fs-icon
            v-if="actions.remove !== false && scope.id !== -1"
            :icon="$fsui.icons.remove"
            @click.stop="remove(scope)"
          />
        </div>
      </div>
    </template>
  </a-tree>
</template>

<script>
import _ from "lodash-es";
import getEachDeep from "deepdash-es/getEachDeep";
const eachDeep = getEachDeep(_);
import { defineComponent, ref, computed } from "vue";
export default defineComponent({
  name: "FsPermissionTree",
  props: {
    /**
     * 树形数据
     * */
    tree: {},
    /**
     * 是否可编辑
     */
    editable: {
      default: true
    },
    actions: {
      default: {}
    }
  },
  emits: ["add", "edit", "remove"],
  setup(props, ctx) {
    const treeRef = ref();
    const computedTree = computed(() => {
      if (props.tree == null) {
        return null;
      }
      const clone = _.cloneDeep(props.tree);
      eachDeep(clone, (value, key, pNode, context) => {
        if (value == null) {
          return;
        }
        if (!(value instanceof Object) || value instanceof Array) {
          return;
        }
        if (value.class === "is-leaf") {
          //处理过，无需再次处理
          return;
        }
        if (value.children != null && value.children.length > 0) {
          return;
        }
        const parents = context.parents;
        if (parents.length < 2) {
          return;
        }
        const parent = parents[parents.length - 2].value;
        //看parent下面的children，是否全部都没有children
        for (const child of parent.children) {
          if (child.children != null && child.children.length > 0) {
            //存在child有children
            return;
          }
        }
        // 所有的子节点都没有children
        parent.class = "is-twig"; // 连接叶子节点的末梢枝杈节点
        for (const child of parent.children) {
          child.class = "is-leaf";
        }
      });
      return [
        {
          title: "根节点",
          id: -1,
          children: clone
        }
      ];
    });
    function add(scope) {
      ctx.emit("add", scope.dataRef);
    }
    function edit(scope) {
      ctx.emit("edit", scope.dataRef);
    }
    function remove(scope) {
      ctx.emit("remove", scope.dataRef);
    }
    function onChecked(a, b, c) {
      console.log("chedcked", a, b, c);
    }
    function getChecked() {
      const checked = treeRef.value.checkedKeys;
      const halfChecked = treeRef.value.halfCheckedKeys;
      return {
        checked,
        halfChecked
      };
    }
    return {
      computedTree,
      add,
      edit,
      remove,
      treeRef,
      onChecked,
      getChecked
    };
  }
});
</script>

<style lang="less">
.fs-permission-tree {
  .is-twig ul {
    display: flex;
    flex-wrap: wrap;
    .is-leaf {
      border-bottom: 1px solid #ddd;
      padding: 5px;
      &::before {
        display: none;
      }
    }
  }
  .node-title-pane {
    display: flex;
    .node-title {
      width: 80px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  &.is-editable {
    .ant-tree-title {
      &:hover {
        .node-suffix {
          visibility: visible;
        }
      }
    }

    .node-suffix {
      visibility: hidden;
      > * {
        margin-left: 3px;
      }
    }
  }
}
</style>
