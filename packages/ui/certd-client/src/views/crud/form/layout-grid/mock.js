import mockUtil from "/src/mock/base";
const options = {
  name: "formLayoutGrid",
  idGenerator: 0
};
const list = [
  {
    name: "王小虎",
    date: "2016-05-02",
    status: "0",
    province: "1",
    avatar: "https://alicdn.antdv.com/vue.png",
    show: true,
    city: "sz",
    address: "123123",
    zip: "518000",
    order: "我在编辑的时候会排到第一个",
    intro: "王小虎是element-plus的table示例出现的名字"
  },
  {
    name: "张三",
    date: "2016-05-04",
    status: "1"
  },
  {
    name: "李四",
    date: 2232433534511,
    status: "1",
    province: "0"
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
