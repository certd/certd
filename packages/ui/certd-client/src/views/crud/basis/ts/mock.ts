// @ts-ignore
import mockUtil from "/src/mock/base";
const options: any = {
  name: "FsCrudFirst",
  idGenerator: 0
};
const list = [
  {
    name: "张三",
    type: 1
  },
  {
    name: "李四",
    type: 0
  },
  {
    name: "王五"
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
