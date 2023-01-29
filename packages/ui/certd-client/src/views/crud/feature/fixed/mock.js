import mockUtil from "/src/mock/base";
const options = {
  name: "FeatureFixed",
  idGenerator: 0
};
const list = [
  {
    text1: "我会被固定在左侧",
    last: "操作列被固定在右侧"
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
