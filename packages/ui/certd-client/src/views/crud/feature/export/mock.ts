import mockUtil from "/src/mock/base";
const options: any = {
  name: "FeatureExport",
  idGenerator: 0
};
const list = [
  {
    text: "测试文本1",
    radio: "1",
    multi: ["1", "2"],
    date: 1111111222222
  },
  {
    text: "测试文本2",
    radio: "2",
    multi: ["0", "2"],
    date: 123123234433
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
