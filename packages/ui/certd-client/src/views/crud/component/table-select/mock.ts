import mockUtil from "/src/mock/base";
const options: any = {
  name: "ComponentTableSelect",
  idGenerator: 0
};
const list = [
  {
    single: 1,
    multi: [1, 2]
  },
  {
    single: 3,
    multi: [1, 2, 3]
  },
  {
    single: 2
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
