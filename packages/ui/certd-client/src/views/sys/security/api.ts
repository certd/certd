import { request } from "/src/api/service";

const apiPrefix = "/sys/settings/security-monitor";

export interface RiskRecord {
  id: string;
  type: string;
  level: string;
  ip: string;
  path?: string;
  userId?: number;
  pipelineId?: number;
  pipelineName?: string;
  status: string;
  createTime: string | number;
  detail?: string;
}

export interface SecurityMonitorSummary {
  riskCount: number;
  suspiciousPipelineCount: number;
  ipBanCount: number;
  hasRecentRisk: boolean;
}

export interface SecurityDetectionSettings {
  urlScanEnabled: boolean;
  suspiciousPipelineEnabled: boolean;
}

export interface RiskRecordsPageResult {
  records: RiskRecord[];
  total: number;
  tabsCounts: Record<string, number>;
}

export interface SecurityBanPageResult {
  records: SecurityBan[];
  total: number;
  tabsCounts: Record<string, number>;
}

export interface SecurityBan {
  id: number;
  targetType: "ip" | "user" | "pipeline";
  targetValue: string;
  action: "ban" | "allow";
  scope: "access" | "pipeline";
  reason?: string;
  expiresAt?: string | null;
  enabled: boolean;
  createTime: string;
}

export const securityMonitorApi = {
  async unblock(ip: string) {
    return await request({
      url: "/sys/security/risk-records/unblock",
      method: "post",
      data: { ip },
    });
  },
  async riskRecordsPage(query: any): Promise<RiskRecordsPageResult> {
    return await request({
      url: "/sys/security/risk-records/page",
      method: "post",
      data: query,
    });
  },
  async banPage(query: any): Promise<SecurityBanPageResult> {
    return await request({
      url: "/sys/security/risk-records/ban/page",
      method: "post",
      data: query,
    });
  },
  async summary(): Promise<SecurityMonitorSummary> {
    return await request({ url: apiPrefix + "/summary", method: "post" });
  },
  async getDetectionSettings(): Promise<SecurityDetectionSettings> {
    return await request({ url: apiPrefix + "/settings/get", method: "post", showErrorNotify: false });
  },
  async saveDetectionSettings(data: Partial<SecurityDetectionSettings>): Promise<SecurityDetectionSettings> {
    return await request({ url: apiPrefix + "/settings/save", method: "post", data, showErrorNotify: false });
  },
  async listBans(): Promise<SecurityBan[]> {
    return await request({ url: "/sys/security/risk-records/ban/list", method: "post" });
  },
  async addBan(data: Omit<SecurityBan, "id" | "enabled" | "createTime">) {
    // 表单弹窗统一提示提交错误，避免请求层重复通知。
    return await request({ url: "/sys/security/risk-records/ban/add", method: "post", data, showErrorNotify: false });
  },
  async removeBan(id: number) {
    return await request({ url: "/sys/security/risk-records/ban/remove", method: "post", data: { id } });
  },
};
