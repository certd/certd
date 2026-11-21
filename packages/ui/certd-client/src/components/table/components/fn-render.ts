import { defineComponent, type PropType } from "vue";
import type { FnRenderSlot } from "../types/index";

export default defineComponent({
  name: "FnRender",
  props: {
    render: { type: Function as PropType<FnRenderSlot>, required: true },
    ctx: { type: Object as PropType<Record<string, any>>, default: () => ({}) },
  },
  setup(props) {
    return () => props.render(props.ctx);
  },
});
