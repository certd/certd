import mockUtil from "/src/mock/base";
const options = {
  name: "FeatureValueBuilder",
  idGenerator: 0
};
const list = [
  {
    name: "user1",
    roles: [
      { id: 1, name: "管理员" },
      { id: 2, name: "普通用户" }
    ]
  },
  {
    name: "user2",
    roles: [{ id: 1, name: "管理员" }]
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
