import { AccessInput, BaseAccess, IsAccess } from "@certd/pipeline";

@IsAccess({
  name: "tencentcos",
  title: "腾讯云COS授权",
  icon: "svg:icon-tencentcloud",
  desc: "腾讯云对象存储授权，包含地域和存储桶",
})
export class TencentCosAccess extends BaseAccess {
  @AccessInput({
    title: "腾讯云授权",
    component: {
      name: "access-selector",
      vModel: "modelValue",
      type: "tencent",
    },
    helper: "请选择腾讯云授权",
    required: true,
  })
  accessId = "";

  @AccessInput({
    title: "所在地域",
    helper: "存储桶所在地域",
    component: {
      name: "a-auto-complete",
      vModel: "value",
      options: [
        { value: "", label: "--------中国大陆地区-------", disabled: true },
        { value: "ap-beijing-1", label: "北京1区" },
        { value: "ap-beijing", label: "北京" },
        { value: "ap-nanjing", label: "南京" },
        { value: "ap-shanghai", label: "上海" },
        { value: "ap-guangzhou", label: "广州" },
        { value: "ap-chengdu", label: "成都" },
        { value: "ap-chongqing", label: "重庆" },
        { value: "ap-shenzhen-fsi", label: "深圳金融" },
        { value: "ap-shanghai-fsi", label: "上海金融" },
        { value: "ap-beijing-fsi", label: "北京金融" },
        { value: "", label: "--------中国香港及境外-------", disabled: true },
        { value: "ap-hongkong", label: "中国香港" },
        { value: "ap-singapore", label: "新加坡" },
        { value: "ap-mumbai", label: "孟买" },
        { value: "ap-jakarta", label: "雅加达" },
        { value: "ap-seoul", label: "首尔" },
        { value: "ap-bangkok", label: "曼谷" },
        { value: "ap-tokyo", label: "东京" },
        { value: "na-siliconvalley", label: "硅谷" },
        { value: "na-ashburn", label: "弗吉尼亚" },
        { value: "sa-saopaulo", label: "圣保罗" },
        { value: "eu-frankfurt", label: "法兰克福" },
      ],
    },
  })
  region!: string;

  @AccessInput({
    title: "Bucket",
    helper: "存储桶名称",
    required: true,
  })
  bucket = "";
}

new TencentCosAccess();
