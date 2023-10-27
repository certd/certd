import mockUtil from "/src/mock/base";
const options: any = {
  name: "ComponentCheckbox",
  idGenerator: 0
};
const list = [
  {
    checkbox: ["1", "2"]
  },
  {
    checkbox: "2"
  },
  {
    checkbox: "0"
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
