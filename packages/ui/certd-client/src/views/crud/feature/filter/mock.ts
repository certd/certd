import mockUtil from "/src/mock/base";
const options: any = {
  name: "FeatureFilter",
  idGenerator: 0
};
const list = [
  {
    radio: "1",
    remote: "0"
  },
  {
    radio: "2",
    remote: "1"
  },
  {
    radio: "0",
    remote: "2"
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
