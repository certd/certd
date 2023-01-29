import mockUtil from "/src/mock/base";
const options = {
  name: "FeatureRemove",
  idGenerator: 0
};
const list = [
  {
    text: "测试文本1"
  },
  {
    text: "测试文本2"
  },
  {
    text: "测试文本3"
  },
  {
    text: "测试文本4"
  },
  {
    text: "测试文本5"
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
