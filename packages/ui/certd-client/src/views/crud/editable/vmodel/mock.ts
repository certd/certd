import mockUtil from "/src/mock/base";
const options: any = {
  name: "EditableVModel",
  idGenerator: 0
};
const list = [
  {
    radio: "1",
    subTable: [{ id: 0, name: "王小虎" }]
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
