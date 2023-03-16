import mockUtil from "/src/mock/base";
const options: any = {
  name: "ComponentJson",
  idGenerator: 0
};
const list: any = [
  {
    json: '{"a":1,"b":2}',
    async: null
  },
  {
    json: '{"a":3,"b":4}',
    async: null
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
