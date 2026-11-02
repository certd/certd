import { defineComponent, type PropType, type VNodeChild } from "vue";

const FnTableCellRender = defineComponent({
  props: {
    vnode: {
      type: null as unknown as PropType<VNodeChild>,
      required: true,
    },
  },
  setup(props) {
    return () => props.vnode;
  },
});

export default FnTableCellRender;
