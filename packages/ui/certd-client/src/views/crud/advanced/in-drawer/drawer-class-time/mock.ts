// @ts-ignore
import mockUtil from "/src/mock/base";
const options: any = {
  name: "AdvancedInDrawerClassTime",
  idGenerator: 0
};
const list = [
  {
    textbookId: 1,
    classTimeName: "1",
    order: 1
  },
  {
    textbookId: 1,
    classTimeName: "2",
    order: 1
  },
  {
    textbookId: 1,
    classTimeName: "3",
    order: 1
  },
  {
    textbookId: 1,
    classTimeName: "4",
    order: 1
  },
  {
    textbookId: 1,
    classTimeName: "5",
    order: 1
  },
  {
    textbookId: 2,
    classTimeName: "1",
    order: 1
  },
  {
    textbookId: 2,
    classTimeName: "2",
    order: 1
  },
  {
    textbookId: 2,
    classTimeName: "3",
    order: 1
  },
  {
    textbookId: 2,
    classTimeName: "4",
    order: 1
  },
  {
    textbookId: 2,
    classTimeName: "5",
    order: 1
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
