import mockUtil from "/src/mock/base";
const options = {
  name: "FormComputeMore",
  idGenerator: 0
};
const list = [
  {
    ref: "根据showRef显示",
    compute: true,
    status: "1",
    remote: "2",
    shower: "---> 点右边编辑查看示例效果",
    remote2: "2",
    editable: true
  },
  {
    compute: false,
    status: "2",
    remote: "0",
    remote2: "2",
    editable: false
  },
  {
    compute: true,
    status: "0",
    remote2: "2",
    editable: true
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
