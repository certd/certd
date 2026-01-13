import { AccessInput, BaseAccess, IsAccess } from '@certd/pipeline';
import { AwsRegions } from './constants.js';

@IsAccess({
  name: 'aws',
  title: '亚马逊云aws授权',
  desc: '',
  icon: 'svg:icon-aws',
})
export class AwsAccess extends BaseAccess {
  @AccessInput({
    title: 'accessKeyId',
    component: {
      placeholder: 'accessKeyId',
    },
    helper:
      '右上角->安全凭证->访问密钥，[点击前往](https://us-east-1.console.aws.amazon.com/iam/home?region=ap-east-1#/security_credentials/access-key-wizard)',
    required: true,
  })
  accessKeyId = '';

  @AccessInput({
    title: 'secretAccessKey',
    component: {
      placeholder: 'secretAccessKey',
    },
    required: true,
    encrypt: true,
    helper: '请妥善保管您的安全访问密钥。您可以在AWS管理控制台的IAM中创建新的访问密钥。',
  })
  secretAccessKey = '';

  @AccessInput({
    title: 'region',
    component: {
      name:"a-select",
      options: AwsRegions,
    },
    required: true,
    helper: '请选择您的默认AWS区域，主要区分中国区还是海外区即可',
    options: AwsRegions,
  })
  region = '';
}

new AwsAccess();
