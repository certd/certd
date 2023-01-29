import mockUtil from "/src/mock/base";
const options = {
  name: "SlotsCell",
  idGenerator: 0
};
const list = [
  {
    like: 10000,
    switch: true,
    createDate: new Date().getTime(),
    updateDate: new Date().getTime()
  },
  {
    like: 10000,
    switch: false,
    createDate: new Date().getTime(),
    updateDate: new Date().getTime()
  },
  {
    like: 10000,
    switch: true
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
