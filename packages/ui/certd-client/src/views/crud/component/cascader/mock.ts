import mockUtil from "/src/mock/base";
const options: any = {
  name: "ComponentCascader",
  idGenerator: 0
};
const list = [
  {
    cascader: ["zhinan", "shejiyuanze", "yizhi"],
    lazyLoad: ["11", "1101", "110101", "110101001"],
    multiple: ["antdv cascader不支持多选"]
  },
  {
    cascader: ["zhinan", "shejiyuanze", "yizhi"],
    multiple: ["antdv cascader不支持多选"]
  },
  {
    cascader: ["zhinan", "shejiyuanze", "yizhi"],
    multiple: ["antdv cascader不支持多选"]
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
