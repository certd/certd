import mockUtil from "/src/mock/base";
const options = {
  name: "FeatureSortable",
  idGenerator: 0
};
const list = [
  {
    radio: "1",
    radio1: "1",
    radio2: "2"
  },
  {
    radio: "2",
    radio1: "2",
    radio2: "0"
  },
  {
    radio: "0",
    radio1: "0",
    radio2: "1"
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
