//@ts-ignore
import mockUtil from "/src/mock/base";

const options: any = {
  name: "FormWatch",
  idGenerator: 0
};
const list = [
  {
    name: "王小虎",
    age: 15,
    a: 1,
    b: 2,
    c: null
  },
  {
    name: "王小虎",
    age: 15,
    a: 1,
    b: 3,
    c: null
  }
];

options.list = list;
options.copyTimes = 1000;
const mock = mockUtil.buildMock(options);

export default mock;
