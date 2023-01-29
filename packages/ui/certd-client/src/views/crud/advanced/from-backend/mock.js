import mockUtil from "/src/mock/base";
import { crudOptions } from "./crud-backend";
const options = {
  name: "AdvancedFromBackend",
  idGenerator: 0
};
const list = [
  {
    radio: "1"
  },
  {
    radio: "2"
  },
  {
    radio: "0"
  }
];

options.list = list;
options.copyTimes = 1000;
const mock = mockUtil.buildMock(options);

mock.push({
  path: "/AdvancedFromBackend/crud",
  method: "get",
  handle(req) {
    return {
      code: 0,
      msg: "success",
      data: crudOptions
    };
  }
});

export default mock;
