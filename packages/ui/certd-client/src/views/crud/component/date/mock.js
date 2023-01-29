import mockUtil from "/src/mock/base";

const options = {
  name: "ComponentDate",
  idGenerator: 0
};
const list = [
  {
    timestamp: 123123123123,
    humanize: new Date().getTime() - 11111111,
    datetime: "2019-09-01 11:11:11",
    date: "2019-09-02 11:11:11",
    format: "2019-09-21 11:11:11",
    time: "2019-09-22 12:11:11",
    daterangeStart: "2019-09-23 11:11:11",
    daterangeEnd: "2019-09-24 11:11:11",
    datetimerangeStart: "2019-09-25 11:11:11",
    datetimerangeEnd: "2019-09-26 11:11:11"
  },
  {
    // timestamp: 444444555,
    datetime: "2017-09-20 11:11:11",
    date: "2019-09-20 11:11:11",
    humanize: new Date().getTime() - 22222222,
    // time: 12313123334,
    daterangeStart: "2019-09-20 11:11:11",
    daterangeEnd: "2019-09-21 11:11:11",
    datetimerangeStart: "2019-09-20 11:11:11",
    datetimerangeEnd: "2019-09-21 11:11:11"
  },
  {
    // timestamp: 5555555555,
    datetime: "2017-09-20 11:11:11",
    date: "2019-09-20 11:11:11",
    // time: 12313123334,
    daterangeStart: "2019-09-20 11:11:11",
    daterangeEnd: "2019-09-21 11:11:11",
    datetimerangeStart: "2019-09-20 11:11:11",
    datetimerangeEnd: "2019-09-21 11:11:11"
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
