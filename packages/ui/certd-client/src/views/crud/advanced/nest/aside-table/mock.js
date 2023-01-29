import mockUtil from "/src/mock/base";
const options = {
  name: "AdvancedAside",
  idGenerator: 0
};
const list = [
  {
    class: "一班",
    gradeId: 1
  },
  {
    class: "二班",
    gradeId: 1
  },
  {
    class: "三班",
    gradeId: 2
  },
  {
    class: "四班",
    gradeId: 2
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
