import SftpOssClientImpl from "./sftp.js";

export default class ScpOssClientImpl extends SftpOssClientImpl {
  getUploaderType() {
    return "scp";
  }
}
