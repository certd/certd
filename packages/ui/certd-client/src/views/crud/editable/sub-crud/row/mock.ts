import mockUtil from "/src/mock/base";
const options: any = {
  name: "EditableSubCrudTarget",
  idGenerator: 0
};
const list = [
  {
    radio: "1",
    name: "张三",
    parentId:1
  },
  {
    radio: "2",
    parentId:2
  },
  {
    parentId:3
  },
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
