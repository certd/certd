import mockUtil from "/src/mock/base";

const options: any = {
  name: "ComponentEditor",
  idGenerator: 0
};
const list = [
  {
    title: "d2-crud-plus好用吗？",
    text: "非常好用",
    content_quill: '<h1 class="ql-align-center">非常好用哦</h1>',
    change: "quill"
  },
  {
    title: "d2-crud-plus有什么优势？",
    text: "简单，方便",
    content_quill: "简单方便",
    change: "wang"
  },
  {
    title: "1111111",
    text: "22222",
    content_quill: "3333",
    change: "wang"
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
