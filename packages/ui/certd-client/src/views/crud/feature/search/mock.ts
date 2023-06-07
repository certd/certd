import mockUtil from "/src/mock/base";
const options: any = {
  name: "FeatureSearch",
  idGenerator: 0
};
const list = [
  {
    radio: "1",
    customRender: true,
    customRender2: false,
    customRender3: true
  },
  {
    radio: "2"
  },
  {
    radio: "0"
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
