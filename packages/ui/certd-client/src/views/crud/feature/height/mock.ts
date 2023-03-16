import mockUtil from "/src/mock/base";
const options: any = {
  name: "ComponentHeight",
  idGenerator: 0
};
const list = [
  {
    radio: "1",
    button: "1",
    bool: true
  },
  {
    radio: "2",
    button: "2",
    bool: false
  },
  {
    radio: "0",
    button: "0"
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
