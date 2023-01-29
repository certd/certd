import mockUtil from "/src/mock/base";
const options = {
  name: "FeatureColumnSort",
  idGenerator: 0
};
const list = [
  {
    col1: "1",
    col2: "2",
    col3: "3",
    col4: "4",
    col5: "5"
  },
  {
    col1: "1",
    col2: "2",
    col3: "3",
    col4: "4",
    col5: "5"
  },
  {
    col1: "1",
    col2: "2",
    col3: "3",
    col4: "4",
    col5: "5"
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
