import mockUtil from "/src/mock/base";
const options: any = {
  name: "FeatureMerge",
  idGenerator: 0
};
const list = [
  {
    radio: "1",
    cellMerge: "test",
    colMerge1: "111",
    colMerge2: "222",

    header1: "aaa",
    header2: "bbb"
  },
  {
    radio: "2",
    cellMerge: "test",
    colMerge1: "111",
    colMerge2: "222",

    header1: "aaa",
    header2: "bbb"
  },
  {
    radio: "0",
    cellMerge: "test",
    colMerge1: "111",
    colMerge2: "222",
    header1: "aaa",
    header2: "bbb"
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
