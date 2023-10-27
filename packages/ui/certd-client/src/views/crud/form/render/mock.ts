import mockUtil from "/src/mock/base";

const options: any = {
  name: "FormRender",
  idGenerator: 0
};
const list = [
  {
    name: "王小虎",
    conditionalRender: "conditionalRender"
  },
  {
    name: "张三",
    conditionalRender: "conditionalRender"
  }
];

options.list = list;
options.copyTimes = 1000;
const mock = mockUtil.buildMock(options);

export default mock;
