export interface AddonTypeDefine {
  name: string;
  title: string;
  showDefault: boolean;
  showTest: boolean;
}

export const AddonTypeDefines: Record<string, AddonTypeDefine> = {
  captcha: {
    name: "captcha",
    title: "验证码",
    showDefault: false,
    showTest: false,
  },
};
