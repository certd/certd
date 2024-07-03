// @ts-ignore
import mockUtil from "/src/mock/base";
const options: any = {
  name: "AdvancedInDrawer",
  idGenerator: 0
};
const list = [
  {
    textbookCategory: "初中英语",
    textbookVersion: "初中人教版",
    textbookName: "初一上学期",
    totalWords: 200,
    classTimeNumber: 40
  },
  {
    textbookCategory: "初中英语",
    textbookVersion: "初中人教版",
    textbookName: "初一上学期",
    totalWords: 200,
    classTimeNumber: 40
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
