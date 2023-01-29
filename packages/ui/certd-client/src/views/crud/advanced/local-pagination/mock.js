import mockUtil from "/src/mock/base";
const options = {
  name: "AdvancedLocalPagination",
  idGenerator: 0
};
const list = [
  {
    status: "1"
  },
  {
    status: "2"
  },
  {
    status: "0"
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
