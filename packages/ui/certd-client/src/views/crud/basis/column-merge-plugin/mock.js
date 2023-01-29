import mockUtil from "/src/mock/base";
const options = {
  name: "BasisColumnMergePlugin",
  idGenerator: 0
};
const list = [
  {
    text: "点击右边查看按钮看效果",
    readonly: "我是只读",
    useCell: "1"
  },
  {
    text: "点击编辑按钮查看效果",
    readonly: "我是只读",
    useCell: "2"
  },
  {
    text: "正常字段",
    readonly: "我是只读",
    useCell: "0"
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
