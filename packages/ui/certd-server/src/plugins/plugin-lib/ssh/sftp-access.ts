import { AccessInput, BaseAccess, IsAccess } from "@certd/pipeline";

@IsAccess({
  name: "sftp",
  title: "SFTP Authorization",
  desc: "",
  icon: "clarity:host-line",
  input: {},
})
export class SftpAccess extends BaseAccess {
  @AccessInput({
    title: "SSH Authorization",
    component: {
      name: "access-selector",
      type: "ssh",
      vModel: "modelValue",
    },
    helper: "Please select an SSH authorization",
    required: true,
  })
  sshAccess!: string;
  @AccessInput({
    title: "File Permissions",
    component: {
      name: "a-input",
      vModel: "value",
      placeholder: "777",
    },
    helper: "Whether to change file permissions after upload",
  })
  fileMode!: string;
}

new SftpAccess();
