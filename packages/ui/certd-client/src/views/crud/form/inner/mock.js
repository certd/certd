import mockUtil from "/src/mock/base";

const options = {
  name: "FormInner",
  idGenerator: 0
};
const list = [
  {
    name: "王小虎",
    age: 15,
    password: "",
    status: "2",
    url: "https://baidu.com"
  },
  {
    name: "张三",
    age: 18,
    password: "",
    url: "https://baidu.com"
  }
];
options.list = list;
options.copyTimes = 1000;
const mock = mockUtil.buildMock(options);
export default mock;
