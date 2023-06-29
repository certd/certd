import _ from "lodash-es";
export async function getPcasData() {
  const pcasData = () => import("china-division/dist/pcas-code.json");
  const ret = await pcasData();
  return ret.default;
}
export async function getPcaData() {
  const pcaData = () => import("china-division/dist/pca-code.json");
  const ret = await pcaData();
  return ret.default;
}
export const TreeNodesLazyLoader = {
  getNodesByValues(values) {
    console.log("getNodesByValues", values);
    if (!(values instanceof Array)) {
      values = [values];
    }
    return getPcasData().then((data) => {
      const nodes = [];
      for (const value of values) {
        const found = this.getNode(data, value);
        if (found) {
          const target = _.cloneDeep(found);
          delete target.children;
          nodes.push(target);
        }
      }
      return nodes;
    });
  },
  getNode(list, value) {
    for (const item of list) {
      if (item.code === value) {
        return item;
      }
      if (item.children && item.children.length > 0) {
        const found = this.getNode(item.children, value);
        if (found) {
          return found;
        }
      }
    }
  },
  getChildren(parent) {
    return getPcasData().then((data) => {
      const list = this.getChildrenByParent(parent, data);
      if (list == null) {
        return [];
      }
      return this.cloneAndDeleteChildren(list);
    });
  },
  getChildrenByParent(parentId, tree) {
    if (!parentId) {
      // 取第一级
      return tree;
    } else {
      for (const node of tree) {
        if (node.code === parentId) {
          return node.children;
        }
        if (node.children && node.children.length > 0) {
          // 递归查找
          const list = this.getChildrenByParent(parentId, node.children);
          if (list) {
            return list;
          }
        }
      }
    }
  },
  cloneAndDeleteChildren(list) {
    const newList = [];
    for (const node of list) {
      const newNode = {};
      Object.assign(newNode, node);
      if (newNode.children == null || newNode.children.length === 0) {
        newNode.isLeaf = true;
        newNode.leaf = true;
      }
      delete newNode.children;
      newList.push(newNode);
    }
    console.log("found children:", newList);
    return newList;
  }
};
