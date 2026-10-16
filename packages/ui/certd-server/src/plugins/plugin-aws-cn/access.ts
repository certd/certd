import { AccessInput, BaseAccess, IsAccess } from "@certd/pipeline";

@IsAccess({
  name: "aws-cn",
  title: "亚马逊云科技（国区）授权",
  desc: "",
  icon: "svg:icon-aws",
  i18n: {
    "en-US": {
      title: "AWS Access(China)",
      desc: "AWS credentials for the China region",
      input: {
        accessKeyId: {
          title: "Access key ID",
          helper: "Find this under Security credentials > Access keys in the AWS China console.",
        },
        secretAccessKey: {
          title: "Secret access key",
          helper: "Keep your secret access key secure. Create access keys in IAM in the AWS console.",
        },
      },
    },
  },
})
export class AwsCNAccess extends BaseAccess {
  @AccessInput({
    title: "accessKeyId",
    component: {
      placeholder: "accessKeyId",
    },
    helper: "右上角->安全凭证->访问密钥，[点击前往](https://cn-north-1.console.amazonaws.cn/iam/home?region=cn-north-1#/security_credentials/access-key-wizard#)",
    required: true,
  })
  accessKeyId = "";

  @AccessInput({
    title: "secretAccessKey",
    component: {
      placeholder: "secretAccessKey",
    },
    required: true,
    encrypt: true,
    helper: "请妥善保管您的安全访问密钥。您可以在AWS管理控制台的IAM中创建新的访问密钥。",
  })
  secretAccessKey = "";
}

new AwsCNAccess();
