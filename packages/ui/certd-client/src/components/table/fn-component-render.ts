import { defineComponent, h, resolveComponent, type Component } from "vue";

export default defineComponent({
  name: "FnComponentRender",
  inheritAttrs: false,
  props: {
    name: { type: [String, Object] as unknown as () => string | Component, required: true },
    vModel: { type: String, default: "modelValue" },
    scope: String,
  },
  emits: ["update:modelValue"],
  setup(props, { attrs, emit, slots }) {
    return () => {
      const component = typeof props.name === "string" ? resolveComponent(props.name) : props.name;
      const modelProp = props.vModel || "modelValue";
      const componentAttrs = { ...attrs } as Record<string, any>;
      const modelValue = componentAttrs.modelValue;
      delete componentAttrs.modelValue;
      componentAttrs[modelProp] = modelValue;
      componentAttrs[`onUpdate:${modelProp}`] = (value: any) => emit("update:modelValue", value);
      if (slots.default) componentAttrs.default = slots.default;
      return h(component, componentAttrs);
    };
  },
});
