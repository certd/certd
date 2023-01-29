import mockUtil from "/src/mock/base";

const options = {
  name: "FormNewPage",
  idGenerator: 0
};
const list = [
  {
    title: "无线充电宝",
    code: "100001",
    images: "https://img0.bdstatic.com/static/searchdetail/img/logo-2X_0c4ef02.png",
    price: 100,
    stock: 99,
    intro: "30000毫安超大容量移动电源充电宝官方原装正品专用便携",
    content: ""
  }
];

options.list = list;
options.copyTimes = 1000;
const mock = mockUtil.buildMock(options);
export default mock;
