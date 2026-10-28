import { IsTaskPlugin, pluginGroups, RunStrategy, TaskInput } from "@certd/pipeline";
import { CertInfo } from "@certd/plugin-cert";
import { AbstractPlusTaskPlugin } from "@certd/plugin-plus";
import { createCertDomainGetterInputDefine, createRemoteSelectInputDefine } from "@certd/plugin-lib";
import { tmpdir } from "node:os";
import path from "node:path";
import fs from "fs";
import { utils } from "@certd/basic";
import { CertApplyPluginNames } from "@certd/plugin-cert";
import { SshAccess } from "../../plugin-lib/ssh/ssh-access.js";
import { SshClient } from "../../plugin-lib/ssh/ssh.js";
@IsTaskPlugin({
  name: "HostDeployToIIS",
  title: "IIS-部署到IIS站点",
  i18n: { "en-US": { title: "IIS - Deploy to IIS Site", desc: "Deploy a certificate to an IIS site." } },
  icon: "devicon:windows8",
  group: pluginGroups.host.key,
  default: {
    strategy: {
      runStrategy: RunStrategy.SkipWhenSucceed,
    },
  },
  needPlus: true,
})
export class HostDeployToIIS extends AbstractPlusTaskPlugin {
  //证书选择，此项必须要有
  @TaskInput({
    title: "域名证书",
    helper: "请选择前置任务输出的域名证书",
    component: {
      name: "output-selector",
      from: [...CertApplyPluginNames],
    },
    required: true,
  })
  cert!: CertInfo;

  @TaskInput(createCertDomainGetterInputDefine({ props: { required: false } }))
  certDomains!: string[];

  //授权选择框
  @TaskInput({
    title: "主机SSH授权",
    component: {
      name: "access-selector",
      type: "ssh",
    },
    required: true,
  })
  accessId!: string;

  @TaskInput(
    createRemoteSelectInputDefine({
      title: "站点名称",
      helper: "选择或手动输入网站名称",
      action: HostDeployToIIS.prototype.onGetSiteList.name,
    })
  )
  siteNames!: string[];

  //授权选择框
  @TaskInput({
    title: "证书密码",
    required: false,
  })
  pfxPassword!: string;

  async onInstance() {}

  async execute(): Promise<void> {
    const sshConf = await this.getAccess<SshAccess>(this.accessId);
    const sshClient = new SshClient(this.logger);
    await this.checkTerminalType(sshClient, sshConf);
    const tempDir = path.join(tmpdir(), "certd");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const tempCertPath = path.join(tempDir, this.appendTimeSuffix("cert") + ".pfx");
    fs.writeFileSync(tempCertPath, Buffer.from(this.cert.pfx, "base64"));

    const remoteTmpDir = await sshClient.exec({
      connectConf: sshConf,
      // 获取远程服务器的tmpdir
      script: ["$env:temp"],
    });
    const remoteTempCertPath = path.join(remoteTmpDir.trim(), "certd", "iis", path.basename(tempCertPath));
    await sshClient.uploadFiles({
      connectConf: sshConf,
      transports: [
        {
          localPath: tempCertPath,
          remotePath: remoteTempCertPath,
        },
      ],
      mkdirs: true,
    });

    try {
      for (const siteName of this.siteNames) {
        const script = updateCertScriptTemplate
          .replaceAll("{SITE_NAME}", siteName)
          .replaceAll("{PASSWORD}", this.pfxPassword || "")
          .replaceAll("{CERT_PATH}", remoteTempCertPath);

        await sshClient.exec({
          connectConf: sshConf,
          script: [script],
          throwOnStdErr: true,
        });
      }
    } finally {
      fs.unlinkSync(tempCertPath);
    }

    this.logger.info(`更新证书完成`);
  }

  async onGetSiteList() {
    if (!this.accessId) {
      throw new Error("请选择Access授权");
    }
    const sshConf = await this.getAccess<SshAccess>(this.accessId);
    const sshClient = new SshClient(this.logger);
    await this.checkTerminalType(sshClient, sshConf);

    const res = await sshClient.exec({
      connectConf: sshConf,
      script: [getAllBindingsScript],
    });

    /**
     *

    -------result start--------
Default Web Site | *:14431:handfree.work
Default Web Site | *:2443:*.handfree.work
-------result end--------
    */
    // 解析获取网站名称
    const sites = new Map<string, string[]>();
    let start = false;
    const lines = res.split("\n");
    for (let item of lines) {
      if (item.includes("-------result start--------")) {
        start = true;
        continue;
      }
      if (item.includes("-------result end--------")) {
        start = false;
        continue;
      }
      if (!start) {
        continue;
      }
      item = item.trim();
      if (item === "" || !item.includes(" | ")) {
        continue;
      }
      const [name, value] = item.split(" | ");
      const siteName = name.trim();
      if (value === "No HTTPS bindings") {
        continue;
      }
      const domain = value.split(":").slice(2).join(":").trim();
      if (!domain) {
        continue;
      }
      const domains = sites.get(siteName) ?? [];
      if (!domains.includes(domain)) {
        domains.push(domain);
      }
      sites.set(siteName, domains);
    }

    const siteOptions = Array.from(sites, ([siteName, domains]) => {
      const extraDomainCount = domains.length - 1;
      let label = `${siteName}<${domains[0]}`;
      if (extraDomainCount > 0) {
        label += `+${extraDomainCount}`;
      }
      label += ">";
      return {
        label,
        value: siteName,
        domain: domains,
        domains,
      };
    });

    return utils.options.buildGroupOptions(siteOptions, this.certDomains);
  }

  private async checkTerminalType(sshClient: SshClient, sshConf: SshAccess) {
    this.logger.info("检查终端类型");
    const isCmd = await sshClient.getIsCmd({
      connectConf: sshConf,
    });
    this.logger.info("isCmd", isCmd);
    if (isCmd) {
      throw new Error("不支持cmd,请将OpenSSH的默认终端设置为powershell，如何设置请参考： https://certd.docmirror.cn/guide/use/host/windows.html");
    }
  }
}

const updateCertScriptTemplate = `
try{
  $siteName = "{SITE_NAME}"
  $password = "{PASSWORD}"
  $certPath = "{CERT_PATH}" 
  if($password -eq "") {
     Write-Host "cert password is empty"
  }else{
     $password = ConvertTo-SecureString -String $password -AsPlainText -Force
  }
  
  # 导入 PFX 证书
  $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2
  # $cert.Import($certPath, $password, [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::MachineKeySet)
  $cert.Import(
    $certPath,
    $password,
    [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::MachineKeySet -bor
    [System.Security.Cryptography.X509Certificates.X509KeyStorageFlags]::PersistKeySet
)
  # 打开 LocalMachine 的证书存储
  $store = New-Object System.Security.Cryptography.X509Certificates.X509Store("My", "LocalMachine")
  $store.Open("ReadWrite")
  $store.Add($cert)
  $store.Close()
  
  Write-Host "import cert success"
  
  # 导入 IIS 模块
  Import-Module WebAdministration
  
  # 网站名称和证书指纹
  
  $thumbprint = $cert.Thumbprint    # 获取证书指纹
  Write-Host 'site name:' $siteName
  Write-Host 'cert info:' $cert.Thumbprint
  
  # 绑定新的证书
  $binding = Get-WebBinding -Name $siteName -Protocol https
  if ($binding) {
      $binding.AddSslCertificate($thumbprint, 'My')
  \tWrite-Host "update cert success"
  } else {
      Write-Error "HTTPS bind not found, cant add SSL cert，Https绑定不存在，请先创建https绑定"
  }
  
  # 确认更改
  Get-WebBinding -Name $siteName -Protocol https
  
  # 重启 IIS
  iisreset
} catch {
    Write-Error "发生错误：$($_.Exception.Message)"
}
`;

const getAllBindingsScript = `
try{
  # 导入 WebAdministration 模块
  Import-Module WebAdministration
  
  # Get-Website 来自 WebAdministration，兼容不提供 Get-IISSite 的旧版 IIS。
  $sites = Get-Website

  Write-Output "-------result start--------"
  foreach ($site in $sites) {
      $bindings = Get-WebBinding -Name $site.Name -Protocol https
      if ($bindings) {
          foreach ($binding in $bindings) {
              Write-Output "$($site.Name) | $($binding.bindingInformation)"
          }
      } else {
          Write-Output "$($site.Name) | No HTTPS bindings"
      }
  }
  Write-Output "-------result end--------"
} catch {
    Write-Error "发生错误：$($_.Exception.Message)"
}
`;


new HostDeployToIIS();
