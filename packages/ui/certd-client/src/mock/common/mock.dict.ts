import cascaderData from "./cascader-data";
// @ts-ignore
import pcaDataLittle from "./pca-data-little";
// @ts-ignore
import { TreeNodesLazyLoader, getPcaData } from "./pcas-data";
import _ from "lodash-es";
const openStatus = [
  { value: "1", label: "打开", color: "success", icon: "ion:radio-button-on" },
  { value: "2", label: "停止", color: "cyan" },
  { value: "0", label: "关闭", color: "red", icon: "ion:radio-button-off" }
];

const moreOpenStatus = [
  { value: "1", label: "打开(open)", color: "success" },
  { value: "2", label: "停止(stop)", color: "cyan" },
  { value: "0", label: "关闭(close)", color: "red" }
];

const textStatus = [
  { id: "1", text: "打开", color: "success" },
  { id: "2", text: "停止", color: "cyan" },
  { id: "0", text: "关闭", color: "red" }
];

let manyStatus = [
  { value: "1", label: "打开", color: "success", icon: "ion:radio-button-on" },
  { value: "2", label: "停止", color: "cyan" },
  { value: "0", label: "关闭", color: "red", icon: "ion:radio-button-off" }
];
let tempManyStatus: any[] = [];
for (let i = 0; i < 100; i++) {
  tempManyStatus = tempManyStatus.concat(_.cloneDeep(manyStatus));
}
manyStatus = tempManyStatus;
let idIndex = 0;
for (const item of manyStatus) {
  idIndex++;
  item.value = idIndex + "";
}

export function GetTreeChildrenByParentId(parentId: any) {
  return TreeNodesLazyLoader.getChildren(parentId);
}

export function GetNodesByValues(values: any) {
  return TreeNodesLazyLoader.getNodesByValues(values);
}

export default [
  {
    path: "/mock/dicts/OpenStatusEnum",
    method: "get",
    handle() {
      return {
        code: 0,
        msg: "success",
        data: openStatus
      };
    }
  },
  {
    path: "/mock/dicts/_OpenStatusEnum2",
    method: "get",
    handle() {
      return {
        code: 0,
        msg: "success",
        data: textStatus
      };
    }
  },
  {
    path: "/mock/dicts/ManyOpenStatusEnum",
    method: "get",
    handle() {
      return {
        code: 0,
        msg: "success",
        data: manyStatus
      };
    }
  },
  {
    path: "/mock/dicts/moreOpenStatusEnum",
    method: "get",
    handle() {
      return {
        code: 0,
        msg: "success",
        data: moreOpenStatus
      };
    }
  },
  {
    path: "/mock/dicts/cascaderData",
    method: "get",
    handle() {
      return {
        code: 0,
        msg: "success",
        data: cascaderData
      };
    }
  },
  {
    path: "/mock/dicts/pca",
    method: "get",
    async handle() {
      const data = await getPcaData();
      return {
        code: 0,
        msg: "success",
        data: data
      };
    }
  },
  {
    path: "/mock/dicts/littlePca",
    method: "get",
    async handle() {
      return {
        code: 0,
        msg: "success",
        data: pcaDataLittle
      };
    }
  },
  {
    path: "/mock/tree/GetTreeChildrenByParentId",
    method: "get",
    async handle({ params }: any) {
      const list = await GetTreeChildrenByParentId(params.parentId);
      return {
        code: 0,
        msg: "success",
        data: list
      };
    }
  },
  {
    path: "/mock/tree/GetNodesByValues",
    method: "get",
    async handle({ params }: any) {
      const list = await GetNodesByValues(params.values);
      return {
        code: 0,
        msg: "success",
        data: list
      };
    }
  }
];
