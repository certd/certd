import { dict } from "@fast-crud/fast-crud";

export const Dicts = {
  sslProviderDict: dict({
    data: [
      { value: "letsencrypt", label: "Let‘s Encrypt" },
      { value: "zerossl", label: "ZeroSSL" },
    ],
  }),
  challengeTypeDict: dict({
    data: [
      { value: "dns", label: "DNS校验", color: "green" },
      { value: "cname", label: "CNAME代理校验", color: "blue" },
      { value: "http", label: "HTTP校验", color: "yellow" },
    ],
  }),
  dnsProviderTypeDict: dict({
    url: "pi/dnsProvider/dnsProviderTypeDict",
  }),
  uploaderTypeDict: dict({
    data: [
      { label: "SFTP", value: "sftp" },
      { label: "SCP", value: "scp" },
      { label: "FTP", value: "ftp" },
      { label: "阿里云OSS", value: "alioss" },
      { label: "腾讯云COS", value: "tencentcos" },
      { label: "七牛OSS", value: "qiniuoss" },
      { label: "S3/Minio", value: "s3" },
      { label: "SSH(已废弃，请选择SFTP方式)", value: "ssh", disabled: true },
    ],
  }),
  domainFromTypeDict: dict({
    data: [
      { value: "manual", label: "手动" },
      { value: "auto", label: "自动" },
    ],
  }),
};
