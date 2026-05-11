import { defineComponent } from "vue";
import SmsCode from "/@/views/framework/login/sms-code.vue";
import EmailCode from "/@/views/framework/register/email-code.vue";

export const IdentityCodeInput = defineComponent({
  name: "IdentityCodeInput",
  props: {
    modelValue: {
      type: String,
      default: "",
    },
    form: {
      type: Object,
      required: true,
    },
    userInfo: {
      type: Object,
      required: true,
    },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const onChange = (value: string) => emit("update:modelValue", value);
    return () => {
      if (props.form.identityType === "email") {
        return <EmailCode value={props.modelValue} captcha={props.form.identityCaptcha} email={props.userInfo.email} verificationType="contactIdentity" onUpdate:value={onChange} />;
      }
      return (
        <SmsCode value={props.modelValue} captcha={props.form.identityCaptcha} mobile={props.userInfo.mobile} phoneCode={props.userInfo.phoneCode || "86"} verificationType="contactIdentity" onUpdate:value={onChange} />
      );
    };
  },
});
