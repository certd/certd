import mockUtil from "/src/mock/base";
const options: any = {
  name: "ComponentButton",
  idGenerator: 0
};
const list = [
  {
    button: "张三",
    link: "百度",
    url: "https://www.baidu.com",
    link2: "手写配置"
  },
  {
    button: "李四",
    link: "百度",
    url: "https://www.baidu.com",
    link2: "手写配置"
  },
  {}
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
