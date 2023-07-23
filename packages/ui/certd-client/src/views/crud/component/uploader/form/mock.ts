import mockUtil from "/src/mock/base";
const options: any = {
  name: "ComponentUploader",
  idGenerator: 0
};
const list = [
  {
    avatar: "http://greper.handsfree.work/extends/avatar.jpg",
    file: ["http://greper.handsfree.work/extends/avatar.jpg", "https://www.baidu.com/img/bd_logo1.png"],
    pictureCard: ["http://greper.handsfree.work/extends/avatar.jpg", "https://www.baidu.com/img/bd_logo1.png"],
    error: ["http://localhost:11111/error_image"],
    pictureCard2: [
      {
        url: "https://zos.alipayobjects.com/rmsportal/jkjgkEfvpUPVyRjUImniVslZfWPnJuuZ.png?1",
        previewUrl: "https://zos.alipayobjects.com/rmsportal/jkjgkEfvpUPVyRjUImniVslZfWPnJuuZ.png?preview1"
      },
      {
        url: "https://zos.alipayobjects.com/rmsportal/jkjgkEfvpUPVyRjUImniVslZfWPnJuuZ.png?2",
        previewUrl: "https://zos.alipayobjects.com/rmsportal/jkjgkEfvpUPVyRjUImniVslZfWPnJuuZ.png?preview2"
      }
    ],
    limit: ["http://greper.handsfree.work/extends/avatar.jpg", "https://www.baidu.com/img/bd_logo1.png"],
    statusRemote: "0",
    keyValueType: "/2022-12-20/qygzqdjd1g.yaml",
    object: {
      url: "http://greper.handsfree.work/extends/avatar.jpg"
    }
  },
  {
    radio: "2"
  },
  {
    radio: "0"
  }
];
options.list = list;
const mock = mockUtil.buildMock(options);
export default mock;
