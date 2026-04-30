import { dict } from "@fast-crud/fast-crud";
import { $t } from "/@/locales";

export const Dicts = {
  sslProviderDict: dict({
    data: [
      { value: "letsencrypt", label: "Let's Encrypt" },
      { value: "zerossl", label: "ZeroSSL" },
    ],
  }),
  challengeTypeDict: dict({
    data: [
      { value: "dns", label: $t("certd.verifyPlan.dnsChallenge"), color: "green" },
      { value: "cname", label: $t("certd.verifyPlan.cnameProxyChallenge"), color: "blue" },
      { value: "http", label: $t("certd.verifyPlan.httpChallenge"), color: "yellow" },
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
      { label: $t("certd.verifyPlan.uploader.aliyunOss"), value: "alioss" },
      { label: $t("certd.verifyPlan.uploader.tencentCos"), value: "tencentcos" },
      { label: $t("certd.verifyPlan.uploader.qiniuOss"), value: "qiniuoss" },
      { label: "S3/Minio", value: "s3" },
      { label: $t("certd.verifyPlan.uploader.sshDeprecated"), value: "ssh", disabled: true },
    ],
  }),
  domainFromTypeDict: dict({
    data: [
      { value: "manual", label: $t("certd.verifyPlan.domainFrom.manual") },
      { value: "auto", label: $t("certd.verifyPlan.domainFrom.auto") },
    ],
  }),
};
