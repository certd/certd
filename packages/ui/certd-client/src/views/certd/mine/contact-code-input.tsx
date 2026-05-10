import { defineComponent } from "vue";
import SmsCode from "/@/views/framework/login/sms-code.vue";
import EmailCode from "/@/views/framework/register/email-code.vue";

export const ContactCodeInput = defineComponent({
  name: "ContactCodeInput",
  props: {
    modelValue: {
      type: String,
      default: "",
    },
    form: {
      type: Object,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
  },
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    const onChange = (value: string) => emit("update:modelValue", value);
    return () => {
      if (props.type === "email") {
        return <EmailCode value={props.modelValue} captcha={props.form.contactCaptcha} email={props.form.email} verificationType="bindEmail" onUpdate:value={onChange} />;
      }
      return <SmsCode value={props.modelValue} captcha={props.form.contactCaptcha} mobile={props.form.mobile} phoneCode={props.form.phoneCode} verificationType="bindMobile" onUpdate:value={onChange} />;
    };
  },
});
