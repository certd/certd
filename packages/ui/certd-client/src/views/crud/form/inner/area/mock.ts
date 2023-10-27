import mockUtil from "/src/mock/base";

const options: any = {
  name: "FormInnerArea",
  idGenerator: 0
};
const list = [
  {
    area: "深圳"
  },
  {
    area: "北京"
  },
  {
    area: "上海"
  },
  {
    area: "广州"
  }
];
options.list = list;
options.copyTimes = 1;
const mock = mockUtil.buildMock(options);
export default mock;
