import mockUtil from "/src/mock/base";
const options = {
  name: "FeatureSearch",
  idGenerator: 0
};
const list = [
  {
    text: "这一列可以调整宽度，另外必须留一列自动宽度",
    radio: "1"
  },
  {
    radio: "2"
  },
  {
    radio: "0"
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
