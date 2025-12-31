import { AccessInput, BaseAccess, IsAccess } from "@certd/pipeline";

@IsAccess({
  name: "aliesa",
  title: "阿里云ESA授权",
  desc: "",
  icon: "ant-design:aliyun-outlined",
  order: 0,
})
export class AliesaAccess extends BaseAccess {
  @AccessInput({
    title: "阿里云授权",
    component: {
      name: "access-selector",
      vModel: "modelValue",
      type: "aliyun",
    },
    helper: "请选择阿里云授权",
    required: true,
  })
  accessId = "";

  @AccessInput({
    title: "地区",
    component: {
      name: "a-select",
      vModel: "value",
      options: [
        {
          label: "杭州",
          value: "cn-hangzhou",
        },
        {
          label: "新加坡",
          value: "ap-southeast-1",
        },
      ],
    },
    helper: "请选择ESA地区",
    required: true,
  })
  region = "";
}

new AliesaAccess();
