import dayjs from 'dayjs';

export const ZoneOptions = [{ value: 'cn-hangzhou' }];
export function appendTimeSuffix(name: string) {
  if (name == null) {
    name = 'certd';
  }
  return name + '-' + dayjs().format('YYYYMMDD-HHmmss');
}

export function checkRet(ret: any) {
  if (ret.code != null) {
    throw new Error('执行失败：' + ret.Message);
  }
}
