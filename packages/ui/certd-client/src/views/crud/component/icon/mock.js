import mockUtil from "/src/mock/base";
const options = {
  name: "ComponentIcon",
  idGenerator: 0
};
const list = [
  {
    icon: "ri:24-hours-fill",
    svg:"svg:icon-compass"
  },
  {
    icon: "ion:add-circle-outline",
    svg:"svg:icon-left-circle"
  },
  {
    icon: "ion:american-football-sharp",
    svg:"svg:icon-Dollar"
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
