import mockUtil from "/src/mock/base";
const options = {
  name: "DictSharedManager",
  idGenerator: 0,
  copyTimes: 1
};
const list = [
  {
    name: "close",
    label: "关闭"
  },
  {
    name: "open",
    label: "打开"
  },
  {
    name: "stop",
    label: "停止"
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
