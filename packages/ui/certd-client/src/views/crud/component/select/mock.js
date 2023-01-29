import mockUtil from "/src/mock/base";
const options = {
  name: "ComponentSelect",
  idGenerator: 0
};
const list = [
  {
    statusLocal: "sz",
    customDictUrl: "0",
    statusValue: 1,
    multiple: ["sz", "bj", "gz", "sh", "hz", "xz", "xg"],
    checkbox: "0",
    select_local: "sz",
    statusRemote: "0",
    status_custom_2: "0",
    customDictGetData: "1",
    checkbox_btn: "1"
  },
  {
    statusLocal: "xg",
    customDictUrl: "1",
    statusValue: 2,
    statusRemote: "1",
    status_custom_2: "2",
    select_local: "gz",
    multiple: ["sh", "sz"],
    checkbox: "0"
  },
  {
    statusLocal: "gz",
    customDictUrl: "1",
    statusValue: 1,
    disabledCache: "1",
    disabledOptions: "2",
    select_local: "gz",
    multiple: ["sh", "gz"],
    checkbox: "0"
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
