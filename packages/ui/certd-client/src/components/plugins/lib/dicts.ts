import { dict } from "@fast-crud/fast-crud";
import { $t } from "/@/locales";

function createChallengeTypeDict() {
  return dict({
    data: [
      { value: "dns", label: $t("certd.verifyPlan.dnsChallenge"), color: "green" },
      { value: "dns-persist", label: "DNS持久验证", color: "cyan" },
      { value: "cname", label: $t("certd.verifyPlan.cnameProxyChallenge"), color: "blue" },
      { value: "http", label: $t("certd.verifyPlan.httpChallenge"), color: "yellow" },
    ],
  });
}

function createUploaderTypeDict() {
  return dict({
    data: [
      { label: "SFTP", value: "sftp" },
      { label: "SCP", value: "scp" },
      { label: "FTP", value: "ftp" },
      { label: $t("certd.verifyPlan.uploader.aliyunOss"), value: "alioss" },
      { label: $t("certd.verifyPlan.uploader.tencentCos"), value: "tencentcos" },
      { label: $t("certd.verifyPlan.uploader.qiniuOss"), value: "qiniuoss" },
      { label: "S3/Minio", value: "s3" },
      { label: $t("certd.verifyPlan.uploader.sshDeprecated"), value: "ssh", disabled: true },
    ],
  });
}

function createDomainFromTypeDict() {
  return dict({
    data: [
      { value: "manual", label: $t("certd.verifyPlan.domainFrom.manual") },
      { value: "auto", label: $t("certd.verifyPlan.domainFrom.auto") },
    ],
  });
}

export const Dicts = {
  sslProviderDict: dict({
    data: [
      { value: "letsencrypt", label: "Let's Encrypt" },
      { value: "letsencrypt_staging", label: "Let's Encrypt测试环境" },
      { value: "google", label: "Google" },
      { value: "zerossl", label: "ZeroSSL" },
      { value: "sslcom", label: "SSL.com" },
      { value: "litessl", label: "litessl" },
      { value: "custom", label: "自定义ACME" },
    ],
  }),
  get challengeTypeDict() {
    return createChallengeTypeDict();
  },
  dnsProviderTypeDict: dict({
    url: "pi/dnsProvider/dnsProviderTypeDict",
  }),
  get uploaderTypeDict() {
    return createUploaderTypeDict();
  },
  get domainFromTypeDict() {
    return createDomainFromTypeDict();
  },
};
