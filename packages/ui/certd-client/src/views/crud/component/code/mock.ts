import mockUtil from "/src/mock/base";
const options: any = {
  name: "ComponentCode",
  idGenerator: 0
};
const list: any = [
  {
    json: '{"p1":1,"b":2}',
    yaml: `
property: 1
p1: 3
services:
  certd:
    container_name: certd
    `,
    javascript: `console.log(123)`
  },
  {
    json: '{"p1":3,"b":4}'
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
