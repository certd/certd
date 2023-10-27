import mockUtil from "/src/mock/base";
const options: any = {
  name: "ComponentNumber",
  idGenerator: 0
};
const list = [
  {
    integer: 1,
    float: 1.1,
    format: 100
  },
  {
    integer: 2,
    float: 1.2,
    format: 100
  },
  {
    integer: 3,
    float: 1.3,
    format: 100
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
