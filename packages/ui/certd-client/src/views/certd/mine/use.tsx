// useUserProfile, 获取 openEditProfileDialog ,参考 useTemplate方法
import { compute, dict } from "@fast-crud/fast-crud";

// 假设的 API 导入
import * as userProfileApi from "./api";
import { useUserStore } from "/@/store/user";
import { useI18n } from "/src/locales";
import CaptchaInput from "/@/components/captcha/captcha-input.vue";
import { message } from "ant-design-vue";
import { ContactCodeInput } from "./contact-code-input";
import { IdentityCodeInput } from "./identity-code-input";
import { useFormDialog } from "/@/use/use-dialog";

/**
 * 获取用户资料编辑相关功能
 * @returns {{openEditProfileDialog: openEditProfileDialog}}
 */
export function useUserProfile() {
  const { openFormDialog } = useFormDialog();
  async function openEditProfileDialog(req: { onUpdated?: (ctx: any) => void }) {
    const detail = await userProfileApi.getMineInfo();
    if (!detail) {
      throw new Error("用户资料不存在");
    }

    const { t } = useI18n();

    const userStore = useUserStore();
    async function doSubmit(form: any) {
      const { id } = await userProfileApi.UpdateProfile(form);
      if (req.onUpdated) {
        req.onUpdated({ id });
      }
    }

    await openFormDialog({
      title: `编辑用户资料`,
      wrapper: {
        width: 600,
      },
      initialForm: detail,
      onSubmit: doSubmit,
      columns: {
        nickName: {
          title: t("certd.nickName"),
          type: "text",
          form: {
            col: {
              span: 24,
            },
            component: {
              placeholder: t("certd.nickName"),
            },
            rules: [{ required: true, message: t("certd.nickName") }],
          },
        },
        avatar: {
          title: t("certd.avatar"),
          type: "cropper-uploader",
          column: {
            width: 70,
            component: {
              style: {
                height: "30px",
                width: "auto",
              },
              buildUrl(key: string) {
                return `api/basic/file/download?token=${userStore.getToken}&key=` + key;
              },
            },
          },
          form: {
            col: {
              span: 24,
            },
            component: {
              vModel: "modelValue",
              valueType: "key",
              cropper: {
                aspectRatio: 1,
                autoCropArea: 1,
                viewMode: 0,
              },
              onReady: null,
              uploader: {
                type: "form",
                action: "/basic/file/upload?token=" + userStore.getToken,
                name: "file",
                headers: {
                  Authorization: "Bearer " + userStore.getToken,
                },
                successHandle(res: any) {
                  return res;
                },
              },
              buildUrl(key: string) {
                return `api/basic/file/download?token=${userStore.getToken}&key=` + key;
              },
            },
          },
        },
      },
    });
  }

  return {
    openEditProfileDialog,
  };
}

export function usePasskeyRegister() {
  const { openFormDialog } = useFormDialog();
  async function openRegisterDialog(req: { onSubmit?: (ctx: any) => void }) {
    const { t } = useI18n();

    await openFormDialog({
      title: t("authentication.registerPasskey"),
      wrapper: {
        width: 500,
      },
      initialForm: {
        deviceName: "",
      },
      onSubmit: async (form: any) => {
        await req.onSubmit?.({ form });
      },
      columns: {
        deviceName: {
          title: t("authentication.deviceName"),
          type: "text",
          form: {
            component: {
              class: "w-full",
            },
            col: {
              span: 24,
            },
            helper: t("authentication.deviceNameHelper"),
            rules: [{ required: true, message: t("authentication.deviceName") }],
          },
        },
      },
    });
  }

  return {
    openRegisterDialog,
  };
}

export function useContactBind() {
  const { openFormDialog } = useFormDialog();

  async function openContactBindDialog(req: { type: "mobile" | "email"; userInfo: any; contactCapability: { smsEnabled?: boolean }; onUpdated?: () => Promise<void> | void }) {
    const methods = [{ label: "密码", value: "password" }];
    if (req.userInfo.email) {
      methods.push({ label: "邮箱", value: "email" });
    }
    if (req.contactCapability.smsEnabled && req.userInfo.mobile) {
      methods.push({ label: "手机号", value: "mobile" });
    }

    async function openChangeDialog(identityValidationCode: string) {
      const isMobile = req.type === "mobile";
      await openFormDialog({
        title: isMobile ? (req.userInfo.mobile ? "修改手机号" : "绑定手机号") : req.userInfo.email ? "修改邮箱" : "绑定邮箱",
        wrapper: {
          width: 560,
        },
        initialForm: {
          phoneCode: req.userInfo.phoneCode || "86",
          mobile: req.userInfo.mobile || "",
          email: req.userInfo.email || "",
          contactCaptcha: null,
          contactValidateCode: "",
        },
        async onSubmit(form: any) {
          if (isMobile) {
            await userProfileApi.UpdateMobile({
              phoneCode: form.phoneCode,
              mobile: form.mobile,
              validateCode: form.contactValidateCode,
              identityValidationCode,
            });
          } else {
            await userProfileApi.UpdateEmail({
              email: form.email,
              validateCode: form.contactValidateCode,
              identityValidationCode,
            });
          }
          message.success("绑定信息已更新");
          await req.onUpdated?.();
        },
        columns: {
          phoneCode: {
            title: "区号",
            type: "text",
            form: {
              col: {
                span: 24,
              },
              show: isMobile,
              component: {
                placeholder: "区号",
              },
              rules: [{ required: isMobile, message: "请输入区号" }],
            },
          },
          mobile: {
            title: "手机号",
            type: "text",
            form: {
              col: {
                span: 24,
              },
              show: isMobile,
              component: {
                placeholder: "请输入手机号",
              },
              rules: [
                { required: isMobile, message: "请输入手机号" },
                { pattern: /^\d{4,20}$/, message: "请输入正确的手机号" },
              ],
            },
          },
          email: {
            title: "邮箱",
            type: "text",
            form: {
              col: {
                span: 24,
              },
              show: !isMobile,
              component: {
                placeholder: "请输入邮箱",
              },
              rules: [
                { required: !isMobile, message: "请输入邮箱" },
                { type: "email", message: "请输入正确的邮箱" },
              ],
            },
          },
          contactCaptcha: {
            title: "图形验证码",
            form: {
              col: {
                span: 24,
              },
              component: {
                name: CaptchaInput,
                vModel: "modelValue",
              },
              rules: [{ required: true, message: "请完成图形验证码" }],
            },
          },
          contactValidateCode: {
            title: isMobile ? "新手机号验证码" : "新邮箱验证码",
            form: {
              col: {
                span: 24,
              },
              component: {
                name: ContactCodeInput,
                vModel: "modelValue",
                form: compute(({ form }) => form),
                type: req.type,
              },
              rules: [{ required: true, message: "请输入验证码" }],
            },
          },
        },
      });
    }

    await openFormDialog({
      title: "验证本人操作",
      wrapper: {
        width: 520,
      },
      initialForm: {
        identityType: "password",
        identityPassword: "",
        identityCaptcha: null,
        identityValidateCode: "",
      },
      async onSubmit(form: any) {
        const res = await userProfileApi.VerifyContactIdentity({
          identityType: form.identityType,
          identityPassword: form.identityPassword,
          identityValidateCode: form.identityValidateCode,
        });
        await openChangeDialog(res.validationCode);
      },
      columns: {
        identityType: {
          title: "验证方式",
          form: {
            col: {
              span: 24,
            },
            component: {
              name: "fs-dict-radio",
              vModel: "value",
              dict: dict({
                data: methods,
              }),
            },
            rules: [{ required: true, message: "请选择验证方式" }],
            valueChange({ form }: { form: any }) {
              form.identityPassword = "";
              form.identityCaptcha = null;
              form.identityValidateCode = "";
            },
          },
        },
        identityPassword: {
          title: "登录密码",
          type: "password",
          form: {
            col: {
              span: 24,
            },
            show: compute(({ form }) => form.identityType === "password"),
            component: {
              placeholder: "请输入登录密码",
            },
            rules: [{ required: true, message: "请输入登录密码" }],
          },
        },
        identityCaptcha: {
          title: "图形验证码",
          form: {
            col: {
              span: 24,
            },
            show: compute(({ form }) => form.identityType !== "password"),
            component: {
              name: CaptchaInput,
              vModel: "modelValue",
            },
            rules: [{ required: true, message: "请完成图形验证码" }],
          },
        },
        identityValidateCode: {
          title: "验证码",
          form: {
            col: {
              span: 24,
            },
            show: compute(({ form }) => form.identityType !== "password"),
            component: {
              name: IdentityCodeInput,
              vModel: "modelValue",
              form: compute(({ form }) => form),
              userInfo: req.userInfo,
            },
            rules: [{ required: true, message: "请输入验证码" }],
          },
        },
      },
    });
  }

  return {
    openContactBindDialog,
  };
}
