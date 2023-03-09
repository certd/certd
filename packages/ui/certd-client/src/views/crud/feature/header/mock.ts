// @ts-ignore
import mockUtil from "/src/mock/base";
const options: any = {
  name: "FeatureHeader",
  idGenerator: 0
};
const list = [
  {
    text: "上面自定义表头"
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
