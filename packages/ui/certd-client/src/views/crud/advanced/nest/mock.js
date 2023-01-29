import mockUtil from "/src/mock/base";
const options = {
  name: "AdvancedNest",
  idGenerator: 0
};
const list = [
  {
    grade: "一年级",
    nestId: 1
  },
  {
    grade: "二年级",
    nestId: 2
  },
  {
    grade: "三年级",
    nestId: 3
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
