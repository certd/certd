import mockUtil from "/src/mock/base";
const options: any = {
  name: "ComponentPhone",
  idGenerator: 0
};
const list = [
  {
    phone: {
      callingCode: "86",
      phoneNumber: "12345678"
    },
    code: "86",
    phoneNumber: "12424354"
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
