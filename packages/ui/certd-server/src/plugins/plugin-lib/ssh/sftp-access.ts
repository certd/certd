import { AccessInput, BaseAccess, IsAccess } from "@certd/pipeline";

@IsAccess({
  name: "sftp",
  title: "SFTP授权",
  desc: "",
  icon: "clarity:host-line",
  input: {},
})
export class SftpAccess extends BaseAccess {
  @AccessInput({
    title: "SSH授权",
    component: {
      name: "access-selector",
      type: "ssh",
      vModel: "modelValue",
    },
    helper: "请选择一个SSH授权",
    required: true,
  })
  sshAccess!: string;
  @AccessInput({
    title: "文件权限",
    component: {
      name: "a-input",
      vModel: "value",
      placeholder: "777",
    },
    helper: "文件上传后是否修改文件权限",
  })
  fileMode!: string;
}

new SftpAccess();
