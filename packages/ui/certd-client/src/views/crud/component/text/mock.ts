import mockUtil from "/src/mock/base";
const options: any = {
  name: "ComponentText",
  idGenerator: 0
};
const list = [
  {
    name: "王小虎",
    date: "2016-05-02",
    status: "0",
    trim: "  aa  aa ",
    number: "123",
    province: "1",
    avatar: "https://alicdn.antdv.com/vue.png",
    show: true,
    city: "sz",
    address: "123123",
    zip: "518000",
    intro: "王小虎是element-plus的table示例出现的名字",
    copy: "测试文本",
    classId: 1
  },
  {
    name: "张三",
    date: "2016-05-04",
    status: "1",
    long: "我很长我很长我很长我很长我很长我很长我很长我很长",
    province: "2",
    copy: "测试文本",
    classId: 2
  },
  {
    name: "李四",
    date: 2232433534511,
    status: "1",
    province: "0",
    copy: "测试文本",
    classId: 3
  },
  {
    name: "王五",
    date: "2016-05-03",
    status: "2",
    province: "wh,gz"
  }
];
options.list = list;
options.copyTimes = 5;
const mock = mockUtil.buildMock(options);
export default mock;
