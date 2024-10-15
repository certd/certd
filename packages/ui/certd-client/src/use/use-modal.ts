import { inject } from "vue";
import type { ModalStaticFunctions } from "ant-design-vue/es/modal/confirm";
import { ModalFuncWithRef } from "ant-design-vue/es/modal/useModal";

export function useModal(): ModalStaticFunctions<ModalFuncWithRef> {
  return inject("modal");
}
