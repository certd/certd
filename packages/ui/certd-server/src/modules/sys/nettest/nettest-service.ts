import { Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { http, logger, utils } from "@certd/basic";

// 使用@certd/basic包中已有的utils.sp.spawn函数替代自定义的asyncExec
// 该函数已经内置了Windows系统编码问题的解决方案

export type NetTestResult = {
  success: boolean; //是否成功
  message: string; //结果
  testLog: string; //测试日志
  error?: string; //执行错误信息
};

@Provide("nettestService")
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class NetTestService {
  /**
   * 执行Telnet测试
   * @param domain 域名
   * @param port 端口
   * @returns 测试结果
   */
  async telnet(domain: string, port: number): Promise<NetTestResult> {
    try {
      let command = "";

      if (this.isWindows()) {
        // Windows系统使用PowerShell执行测试，避免输入重定向问题
        // 使用PowerShell的Test-NetConnection命令进行端口测试
        command = `powershell -Command "& { $result = Test-NetConnection -ComputerName ${domain} -Port ${port} -InformationLevel Quiet; if ($result) { Write-Host '端口连接成功' } else { Write-Host '端口连接失败' } }"`;
      } else {
        // Linux系统使用nc命令进行端口测试
        command = `nc -zv -w 5 ${domain} ${port} 2>&1`;
      }

      // 使用utils.sp.spawn执行命令，它会自动处理Windows编码问题
      const output = await utils.sp.spawn({
        cmd: command,
        logger: undefined, // 可以根据需要传入logger
      });

      // 判断测试是否成功
      const normalizedOutput = output.toLowerCase();
      const success = this.isWindows()
        ? normalizedOutput.includes("端口连接成功")
        : normalizedOutput.includes("succeeded!") || normalizedOutput.includes("connected to") || normalizedOutput.includes(" open");


      // 处理结果
      return {
        success,
        message: success ? "端口连接测试成功" : "端口连接测试失败",
        testLog: output,
      };
    } catch (error) {
      return {
        success: false,
        message: "Telnet测试执行失败",
        testLog: error.stdout || error.stderr || error?.message || String(error),
        error: error.stderr || error?.message || String(error),
      };
    }
  }

  /**
   * 执行Ping测试
   * @param domain 域名
   * @returns 测试结果
   */
  async ping(domain: string): Promise<NetTestResult> {
    try {
      let command = "";

      if (this.isWindows()) {
        // Windows系统ping命令，发送4个包
        command = `ping -n 4 ${domain}`;
      } else {
        // Linux系统ping命令，发送4个包
        command = `ping -c 4 ${domain}`;
      }

      // 使用utils.sp.spawn执行命令
      const output = await utils.sp.spawn({
        cmd: command,
        logger: undefined,
      });

      // 判断测试是否成功
      const success = this.isWindows() ? output.includes("TTL=") : output.includes("time=");

      return {
        success,
        message: success ? "Ping测试成功" : "Ping测试失败",
        testLog: output,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: "Ping测试执行失败",
        testLog: error.stderr || error.stdout || errorMessage,
        error: errorMessage,
      };
    }
  }

  private isWindows() {
    return process.platform === "win32";
  }

  /**
   * 执行域名解析测试
   * @param domain 域名
   * @returns 解析结果
   */
  async domainResolve(domain: string): Promise<NetTestResult> {
    try {
      let command = "";
      if (this.isWindows()) {
        // Windows系统使用nslookup命令
        command = `nslookup ${domain}`;
      } else {
        // Linux系统优先使用dig命令，如果没有则回退到nslookup
        command = `which dig > /dev/null && dig ${domain} || nslookup ${domain}`;
      }

      // 使用utils.sp.spawn执行命令
      const output = await utils.sp.spawn({
        cmd: command,
        logger: undefined,
      });

      // 判断测试是否成功
      const success = output.includes("Address:") || output.includes("IN	A") || output.includes("IN	AAAA") || (this.isWindows() && output.includes("Name:"));

      return {
        success,
        message: success ? "域名解析测试成功" : "域名解析测试失败",
        testLog: output,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: "域名解析测试执行失败",
        testLog: error.stdoout || error.stderr || errorMessage,
        error: errorMessage,
      };
    }
  }

  async getLocalIP(): Promise<string[]> {
    try {
      const output = await utils.sp.spawn({
        cmd: "ip a | grep 'inet ' | grep -v '127.0.0.1' | awk '{print $2}' | cut -d/ -f1",
        logger: undefined,
      });
      // 去除 inet 前缀
      const ips = output.trim().replace(/inet /g, "");
      return ips.split("\n").filter(ip => ip.length > 0);
    } catch (error) {
      return [error instanceof Error ? error.message : String(error)];
    }
  }

  async getPublicIP(): Promise<string[]> {
    try {
      const res = await http.request({
        url: "https://ipinfo.io/ip",
        method: "GET",
      });
      return [res];
    } catch (error) {
      return [error instanceof Error ? error.message : String(error)];
    }
  }

  async getDNSservers(): Promise<string[]> {
    let dnsServers: string[] = [];
    try {
      const output = await utils.sp.spawn({
        cmd: "cat /etc/resolv.conf | grep nameserver | awk '{print $2}'",
        logger: undefined,
      });
      dnsServers = output.trim().split("\n");
    } catch (error) {
      dnsServers = [error instanceof Error ? error.message : String(error)];
    }
    try {
      /**
       * /app # cat /etc/resolv.conf | grep "ExtServers"
# ExtServers: [223.5.5.5 223.6.6.6]
       */
      const extDnsServers = await utils.sp.spawn({
        cmd: 'cat /etc/resolv.conf | grep "ExtServers"',
        logger: undefined,
      });
      const line = extDnsServers.trim();
      if (line.includes("ExtServers") && line.includes("[")) {
        const extDns = line.substring(line.indexOf("[") + 1, line.indexOf("]")).split(" ");
        const dnsList = extDns.map(item => `Ext:${item}`);
        dnsServers = dnsServers.concat(dnsList);
      }
    } catch (error) {
      logger.error("获取DNS ExtServers 服务器失败", error);
      // dnsServers.push(error instanceof Error ? error.message : String(error));
    }
    return dnsServers;
  }
  /**
   * 获取服务器信息（包括本地IP、外网IP和DNS服务器）
   * @returns 服务器信息
   */
  async serverInfo(): Promise<any> {
    const res = {
      localIP: [],
      publicIP: [],
      dnsServers: [],
    };

    res.localIP = await this.getLocalIP();
    res.publicIP = await this.getPublicIP();
    res.dnsServers = await this.getDNSservers();
    return res;
  }
}
