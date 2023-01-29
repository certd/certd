import mockUtil from "/src/mock/base";
const options = {
  name: "DictSingle",
  idGenerator: 0
};
const list = [
  {
    status: "1",
    remote: "2"
  },
  {
    status: "2",
    remote: "0"
  },
  {
    status: "0"
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
