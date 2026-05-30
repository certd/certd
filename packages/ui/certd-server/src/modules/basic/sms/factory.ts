export class SmsServiceFactory {
  static async createSmsService(type: string) {
    const cls = await this.GetClassByType(type);
    return new cls();
  }

  static async GetClassByType(type: string) {
    switch (type) {
      case "aliyun":
        const { AliyunSmsService } = await import("./aliyun-sms.js");
        return AliyunSmsService;
      case "yfysms":
        const { YfySmsService } = await import("./yfy-sms.js");
        return YfySmsService;
      case "tencent":
        const { TencentSmsService } = await import("./tencent-sms.js");
        return TencentSmsService;
      default:
        throw new Error("不支持的短信服务类型");
    }
  }

  static async getDefine(type: string) {
    const cls = await this.GetClassByType(type);
    return cls.getDefine();
  }
}
