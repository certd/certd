import mockUtil from "/src/mock/base";
const options = {
  name: "BasisLayoutCard",
  idGenerator: 0
};
const list = [
  {
    radio: "1",
    name: "张三",
    city: "sz"
  },
  {
    radio: "2",
    name: "李四",
    city: "gz"
  },
  {
    radio: "0",
    name: "王五",
    city: "sh"
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
