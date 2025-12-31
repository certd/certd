import { AccessInput, BaseAccess, IsAccess } from "@certd/pipeline";

@IsAccess({
  name: "alioss",
  title: "阿里云OSS授权",
  desc: "包含地域和Bucket",
  icon: "ant-design:aliyun-outlined",
})
export class AliossAccess extends BaseAccess {
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
    title: "大区",
    component: {
      name: "a-auto-complete",
      vModel: "value",
      options: [
        { value: "oss-cn-hangzhou", label: "华东1（杭州）" },
        { value: "oss-cn-shanghai", label: "华东2（上海）" },
        { value: "oss-cn-nanjing", label: "华东5（南京-本地地域）" },
        { value: "oss-cn-fuzhou", label: "华东6（福州-本地地域）" },
        { value: "oss-cn-wuhan-lr", label: "华中1（武汉-本地地域）" },
        { value: "oss-cn-qingdao", label: "华北1（青岛）" },
        { value: "oss-cn-beijing", label: "华北2（北京）" },
        { value: "oss-cn-zhangjiakou", label: "华北 3（张家口）" },
        { value: "oss-cn-huhehaote", label: "华北5（呼和浩特）" },
        { value: "oss-cn-wulanchabu", label: "华北6（乌兰察布）" },
        { value: "oss-cn-shenzhen", label: "华南1（深圳）" },
        { value: "oss-cn-heyuan", label: "华南2（河源）" },
        { value: "oss-cn-guangzhou", label: "华南3（广州）" },
        { value: "oss-cn-chengdu", label: "西南1（成都）" },
        { value: "oss-cn-hongkong", label: "中国香港" },
        { value: "oss-us-west-1", label: "美国（硅谷）①" },
        { value: "oss-us-east-1", label: "美国（弗吉尼亚）①" },
        { value: "oss-ap-northeast-1", label: "日本（东京）①" },
        { value: "oss-ap-northeast-2", label: "韩国（首尔）" },
        { value: "oss-ap-southeast-1", label: "新加坡①" },
        { value: "oss-ap-southeast-2", label: "澳大利亚（悉尼）①" },
        { value: "oss-ap-southeast-3", label: "马来西亚（吉隆坡）①" },
        { value: "oss-ap-southeast-5", label: "印度尼西亚（雅加达）①" },
        { value: "oss-ap-southeast-6", label: "菲律宾（马尼拉）" },
        { value: "oss-ap-southeast-7", label: "泰国（曼谷）" },
        { value: "oss-eu-central-1", label: "德国（法兰克福）①" },
        { value: "oss-eu-west-1", label: "英国（伦敦）" },
        { value: "oss-me-east-1", label: "阿联酋（迪拜）①" },
        { value: "oss-rg-china-mainland", label: "无地域属性（中国内地）" },
      ],
    },
    required: true,
  })
  region!: string;

  @AccessInput({
    title: "Bucket",
    helper: "存储桶名称",
    required: true,
  })
  bucket!: string;
}

new AliossAccess();
