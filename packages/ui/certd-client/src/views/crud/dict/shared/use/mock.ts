// @ts-ignore
import mockUtil from "/src/mock/base";
const options: any = {
  name: "DictSharedUse",
  idGenerator: 0
};
const list = [
  {
    status: "close"
  },
  {
    status: "stop"
  },
  {
    status: "open"
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
