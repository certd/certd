// @ts-ignore
import mockUtil from "/src/mock/base";
const options: any = {
  name: "BasisReset",
  idGenerator: 0
};
const list = [
  {
    switch: true,
    text: "1111"
  },
  {
    switch: true,
    text: "2222"
  },
  {
    switch: true,
    text: "3333"
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
