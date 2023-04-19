import mockUtil from "/src/mock/base";
const options: any = {
  name: "DictCloneable",
  idGenerator: 0
};
const list = [
  {
    status: "1",
    remote: "2",
    modifyDict: true
  },
  {
    status: "2",
    remote: "0",
    modifyDict: false
  },
  {
    status: "0",
    modifyDict: true
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
