import mockUtil from "/src/mock/base";
const options = {
  name: "AdvancedSubTable",
  idGenerator: 0
};
const list = [
  {
    name: "张三"
  },
  {
    name: "李四"
  },
  {
    name: "王五"
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
