import mockUtil from "/src/mock/base";
const options: any = {
  name: "DebugSelect",
  idGenerator: 0,
  copyTimes: 500
};
const list: any = [
  {
    statusRemote: "1"
  },
  {
    statusRemote: "2"
  },
  {
    statusRemote: "3"
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
