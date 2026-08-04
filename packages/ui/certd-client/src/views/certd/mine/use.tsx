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
      throw new Error("User profile does not exist");
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
      title: `Edit user profile`,
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
    const methods = [{ label: "Password", value: "password" }];
    if (req.userInfo.email) {
      methods.push({ label: "Email", value: "email" });
    }
    if (req.contactCapability.smsEnabled && req.userInfo.mobile) {
      methods.push({ label: "Mobile number", value: "mobile" });
    }

    async function openChangeDialog(identityValidationCode: string) {
      const isMobile = req.type === "mobile";
      await openFormDialog({
        title: isMobile ? (req.userInfo.mobile ? "Change mobile number" : "Bind mobile number") : req.userInfo.email ? "Change email" : "Bind email",
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
          message.success("Binding information updated");
          await req.onUpdated?.();
        },
        columns: {
          phoneCode: {
            title: "Country code",
            type: "text",
            form: {
              col: {
                span: 24,
              },
              show: isMobile,
              component: {
                placeholder: "Country code",
              },
              rules: [{ required: isMobile, message: "Enter country code" }],
            },
          },
          mobile: {
            title: "Mobile number",
            type: "text",
            form: {
              col: {
                span: 24,
              },
              show: isMobile,
              component: {
                placeholder: "Enter mobile number",
              },
              rules: [
                { required: isMobile, message: "Enter mobile number" },
                { pattern: /^\d{4,20}$/, message: "Enter a valid mobile number" },
              ],
            },
          },
          email: {
            title: "Email",
            type: "text",
            form: {
              col: {
                span: 24,
              },
              show: !isMobile,
              component: {
                placeholder: "Enter email",
              },
              rules: [
                { required: !isMobile, message: "Enter email" },
                { type: "email", message: "Enter a valid email" },
              ],
            },
          },
          contactCaptcha: {
            title: "Captcha",
            form: {
              col: {
                span: 24,
              },
              component: {
                name: CaptchaInput,
                vModel: "modelValue",
              },
              rules: [{ required: true, message: "Complete the captcha" }],
            },
          },
          contactValidateCode: {
            title: isMobile ? "New mobile verification code" : "New email verification code",
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
              rules: [{ required: true, message: "Enter verification code" }],
            },
          },
        },
      });
    }

    await openFormDialog({
      title: "Verify your identity",
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
          title: "Verification method",
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
            rules: [{ required: true, message: "Select a verification method" }],
            valueChange({ form }: { form: any }) {
              form.identityPassword = "";
              form.identityCaptcha = null;
              form.identityValidateCode = "";
            },
          },
        },
        identityPassword: {
          title: "Login password",
          type: "password",
          form: {
            col: {
              span: 24,
            },
            show: compute(({ form }) => form.identityType === "password"),
            component: {
              placeholder: "Enter login password",
            },
            rules: [{ required: true, message: "Enter login password" }],
          },
        },
        identityCaptcha: {
          title: "Captcha",
          form: {
            col: {
              span: 24,
            },
            show: compute(({ form }) => form.identityType !== "password"),
            component: {
              name: CaptchaInput,
              vModel: "modelValue",
            },
            rules: [{ required: true, message: "Complete the captcha" }],
          },
        },
        identityValidateCode: {
          title: "Verification code",
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
            rules: [{ required: true, message: "Enter verification code" }],
          },
        },
      },
    });
  }

  return {
    openContactBindDialog,
  };
}
