import mockUtil from "/src/mock/base";
const options: any = {
  name: "SlotsFormItem",
  idGenerator: 0
};
const list = [
  {
    topics: ["fast-crud 666", "fast-crud真好用"]
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
