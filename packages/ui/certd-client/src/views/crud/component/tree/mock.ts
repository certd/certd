import mockUtil from "/src/mock/base";
const options: any = {
  name: "ComponentTree",
  idGenerator: 0
};
const list = [
  {
    tree: "zhinan",
    multiple: ["zhinan", "yizhi"]
  },
  { tree: "zhinan" },
  { tree: "zhinan" }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
