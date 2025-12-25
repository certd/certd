import { AccessInput, BaseAccess, IsAccess } from '@certd/pipeline';

export const AwsRegions = [
  { label: 'cn-north-1', value: 'cn-north-1' },
  { label: 'cn-northwest-1', value: 'cn-northwest-1' },
  { label: '---------------', value: '--',disabled: true },
  { label: 'us-east-1', value: 'us-east-1' },
  { label: 'us-east-2', value: 'us-east-2' },
  { label: 'us-west-1', value: 'us-west-1' },
  { label: 'us-west-2', value: 'us-west-2' },
  { label: 'af-south-1', value: 'af-south-1' },
  { label: 'ap-east-1', value: 'ap-east-1' },
  { label: 'ap-northeast-1', value: 'ap-northeast-1' },
  { label: 'ap-northeast-2', value: 'ap-northeast-2' },
  { label: 'ap-northeast-3', value: 'ap-northeast-3' },
  { label: 'ap-south-1', value: 'ap-south-1' },
  { label: 'ap-south-2', value: 'ap-south-2' },
  { label: 'ap-southeast-1', value: 'ap-southeast-1' },
  { label: 'ap-southeast-2', value: 'ap-southeast-2' },
  { label: 'ap-southeast-3', value: 'ap-southeast-3' },
  { label: 'ap-southeast-4', value: 'ap-southeast-4' },
  { label: 'ap-southeast-5', value: 'ap-southeast-5' },
  { label: 'ca-central-1', value: 'ca-central-1' },
  { label: 'ca-west-1', value: 'ca-west-1' },
  { label: 'eu-central-1', value: 'eu-central-1' },
  { label: 'eu-central-2', value: 'eu-central-2' },
  { label: 'eu-north-1', value: 'eu-north-1' },
  { label: 'eu-south-1', value: 'eu-south-1' },
  { label: 'eu-south-2', value: 'eu-south-2' },
  { label: 'eu-west-1', value: 'eu-west-1' },
  { label: 'eu-west-2', value: 'eu-west-2' },
  { label: 'eu-west-3', value: 'eu-west-3' },
  { label: 'il-central-1', value: 'il-central-1' },
  { label: 'me-central-1', value: 'me-central-1' },
  { label: 'me-south-1', value: 'me-south-1' },
  { label: 'sa-east-1', value: 'sa-east-1' },
];

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
    helper: '请选择您的默认AWS区域，默认us-east-1',
    options: AwsRegions,
  })
  region = '';
}

new AwsAccess();
