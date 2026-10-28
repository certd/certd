import { Provide, Scope, ScopeEnum } from "@midwayjs/core";
import { http, utils } from "@certd/basic";
import { lookup } from "node:dns/promises";
import fs from "node:fs";
import net, { isIP } from "node:net";
import os from "node:os";
import { domainToASCII } from "node:url";

export type NetTestResult = {
  success: boolean;
  message: string;
  testLog: string;
  error?: string;
};

@Provide("nettestService")
@Scope(ScopeEnum.Request, { allowDowngrade: true })
export class NetTestService {
  async telnet(domain: string, port: number): Promise<NetTestResult> {
    try {
      const host = this.validateDomain(domain);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("端口范围无效");
      }

      const output = await new Promise<string>((resolve, reject) => {
        const socket = net.createConnection({ host, port });
        socket.setTimeout(5000);
        socket.once("connect", () => {
          socket.destroy();
          resolve(`Connected to ${host}:${port}`);
        });
        socket.once("timeout", () => socket.destroy(new Error("连接超时")));
        socket.once("error", reject);
      });
      return { success: true, message: "端口连接测试成功", testLog: output };
    } catch (error: any) {
      return {
        success: false,
        message: "Telnet测试执行失败",
        testLog: error.stdout || error.stderr || error?.message || String(error),
        error: error.stderr || error?.message || String(error),
      };
    }
  }

  async ping(domain: string): Promise<NetTestResult> {
    try {
      const host = this.validateDomain(domain);
      const args = process.platform === "win32" ? ["-n", "4", host] : ["-c", "4", host];
      const output = await utils.sp.spawn({ cmd: "ping", args });
      const success = process.platform === "win32" ? output.includes("TTL=") : output.includes("time=");
      return {
        success,
        message: success ? "Ping测试成功" : "Ping测试失败",
        testLog: output,
      };
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: "Ping测试执行失败",
        testLog: error.stderr || error.stdout || errorMessage,
        error: errorMessage,
      };
    }
  }

  private validateDomain(domain: string) {
    const value = domain.trim();
    if (isIP(value)) {
      return value;
    }
    const asciiDomain = domainToASCII(value);
    const labels = asciiDomain.replace(/\.$/, "").split(".");
    if (!asciiDomain || asciiDomain.length > 253 || labels.some(label => !/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/.test(label))) {
      throw new Error("域名格式无效");
    }
    return asciiDomain;
  }

  async domainResolve(domain: string): Promise<NetTestResult> {
    try {
      const host = this.validateDomain(domain);
      const addresses = await lookup(host, { all: true });
      const output = addresses.map(item => `${host} ${item.family} ${item.address}`).join("\n");
      return {
        success: addresses.length > 0,
        message: addresses.length > 0 ? "域名解析测试成功" : "域名解析测试失败",
        testLog: output,
      };
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        message: "域名解析测试执行失败",
        testLog: error.stderr || error.stdout || errorMessage,
        error: errorMessage,
      };
    }
  }

  async getLocalIP(): Promise<string[]> {
    try {
      const interfaces = os.networkInterfaces();
      return Object.values(interfaces)
        .flatMap(items => items || [])
        .filter(item => !item.internal)
        .map(item => item.address);
    } catch (error) {
      return [error instanceof Error ? error.message : String(error)];
    }
  }

  async getPublicIP(): Promise<string[]> {
    try {
      const res = await http.request({ url: "https://ipinfo.io/ip", method: "GET" });
      return [res];
    } catch (error) {
      return [error instanceof Error ? error.message : String(error)];
    }
  }

  async getDNSservers(): Promise<string[]> {
    let dnsServers: string[] = [];
    let resolvConf = "";
    try {
      resolvConf = fs.readFileSync("/etc/resolv.conf", "utf8");
      dnsServers = resolvConf
        .split(/\r?\n/)
        .map(line => line.match(/^\s*nameserver\s+(\S+)/)?.[1])
        .filter((server): server is string => Boolean(server));
    } catch (error) {
      dnsServers = [error instanceof Error ? error.message : String(error)];
    }

    const line = resolvConf.split(/\r?\n/).find(item => item.includes("ExtServers")) || "";
    if (line.includes("[") && line.includes("]")) {
      const extDns = line.substring(line.indexOf("[") + 1, line.indexOf("]")).split(" ");
      dnsServers = dnsServers.concat(extDns.map(item => `Ext:${item}`));
    }
    return dnsServers;
  }

  async serverInfo(): Promise<any> {
    return {
      localIP: await this.getLocalIP(),
      publicIP: await this.getPublicIP(),
      dnsServers: await this.getDNSservers(),
    };
  }
}
