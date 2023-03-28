import mockUtil from "/src/mock/base";

const options: any = {
  name: "FormRender",
  idGenerator: 0
};
const list = [
  {
    name: "王小虎"
  },
  {
    name: "张三"
  }
];

options.list = list;
options.copyTimes = 1000;
const mock = mockUtil.buildMock(options);

export default mock;
