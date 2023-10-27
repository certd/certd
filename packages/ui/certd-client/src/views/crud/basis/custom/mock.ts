import mockUtil from "/src/mock/base";
const options: any = {
  name: "BasisCustom",
  idGenerator: 0
};
const list = [
  {
    counter: 1,
    cellRender: "cellRender1"
  },
  {
    counter: 2,
    cellRender: "cellRender2"
  },
  {
    counter: 3,
    cellRender: "cellRender3"
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
