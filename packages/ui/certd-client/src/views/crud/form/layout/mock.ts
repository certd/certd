import mockUtil from "/src/mock/base";
const options: any = {
  name: "formLayout",
  idGenerator: 0
};
const list = [
  {
    display: "flex",
    name: "aa",
    date: "2016-05-02",
    status: "0",
    province: "1",
    avatar: "https://alicdn.antdv.com/vue.png",
    show: true,
    city: "sz",
    address: "123123",
    zip: "518000"
  },
  {
    display: "grid",
    name: "bb",
    date: "2016-05-04",
    status: "1",
    province: "2"
  },
  {
    name: "cc",
    date: 2232433534511,
    status: "1",
    province: "0"
  },
  {
    name: "dd",
    date: "2016-05-03",
    status: "2",
    province: "wh,gz"
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
