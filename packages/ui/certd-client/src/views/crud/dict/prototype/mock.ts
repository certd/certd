import mockUtil from "/src/mock/base";
const options: any = {
  name: "DictPrototype",
  idGenerator: 0
};
const list = [
  {
    status: "1",
    remote: "2",
    modifyDict: false,
    switch: true,
    dynamicGetData: "1",
    dynamicUrl: "2"
  },
  {
    status: "2",
    remote: "0",
    modifyDict: false,
    dynamicGetData: "1",
    dynamicUrl: "2"
  },
  {
    status: "0",
    modifyDict: false,
    dynamicGetData: "1",
    dynamicUrl: "2"
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
