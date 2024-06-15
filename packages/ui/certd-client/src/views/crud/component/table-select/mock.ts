import mockUtil from "/src/mock/base";
const options: any = {
  name: "ComponentTableSelect",
  idGenerator: 0
};
const list = [
  {
    single: 1,
    multi: [1, 2],
    valueType: { id: 1, name: "王小虎" },
    viewMode: 1
  },
  {
    single: 3,
    multi: [1, 2, 3],
    dynamicShow: false,
    viewMode: 2
  },
  {
    single: 2
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
