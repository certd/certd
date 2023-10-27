import mockUtil from "/src/mock/base";
const options: any = {
  name: "FeatureHeaderGroup",
  idGenerator: 0
};
const list = [
  {
    name: "张三",
    age: 18,
    province: "广东省",
    city: "深圳市",
    county: "南山区",
    street: "粤海街道"
  },
  {
    name: "李四",
    age: 26,
    province: "浙江省",
    city: "杭州市",
    county: "西湖区",
    street: "西湖街道"
  },
  {
    name: "王五",
    age: 24
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
