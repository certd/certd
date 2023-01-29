import mockUtil from "/src/mock/base";
const options = {
  name: "SlotsForm",
  idGenerator: 0
};
const list = [
  {
    text: "文本输入"
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
