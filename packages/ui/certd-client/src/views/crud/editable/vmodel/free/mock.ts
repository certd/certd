import mockUtil from "/src/mock/base";
const options: any = {
  name: "EditableFreeSub",
  idGenerator: 0
};
const list = [
  {
    radio: "1",
    name: "王强"
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
