import mockUtil from "/src/mock/base";
const options: any = {
  name: "FeatureSelection",
  idGenerator: 0
};
const list = [
  {
    text: "张三",
    radio: "1"
  },
  {
    text: "李四",
    radio: "2"
  },
  {
    text: "王五",
    radio: "0"
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
