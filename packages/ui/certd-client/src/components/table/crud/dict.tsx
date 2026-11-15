import { ref } from "vue";
import type { DictOption, DictOptionsRef, FnDictStore, FnTableRow } from "../types/index";

export type { DictComponentType, DictOption, DictOptionsRef as DictPropsRef, DictValue, GetDictOptionsRef as GetDictPropsRef } from "../types/index";

export class DictStore implements FnDictStore {
  __options: DictOptionsRef = ref([]);
  value?: string;
  label?: string | ((row: FnTableRow) => string);
  getData?: () => Promise<DictOption[]>;
  getNodesByValues?: (values: Array<string | number>) => Promise<FnTableRow[]>;
  fetching = false;

  constructor(opts: {
    data: DictOption[];
    value?: string;
    label?: string | ((row: FnTableRow) => string);
    getDataFunc?: () => Promise<DictOption[]>;
    getNodesByValues?: (values: Array<string | number>) => Promise<FnTableRow[]>;
    immediate?: boolean;
  }) {
    this.__options.value = opts.data;
    this.value = opts.value;
    this.label = opts.label;
    this.getData = opts.getDataFunc;
    this.getNodesByValues = opts.getNodesByValues;
    if (opts.immediate !== false) {
      this.__fetch();
    }
  }

  getOptions(): DictOptionsRef {
    void this.__fetch();
    return this.__options;
  }

  async __fetch() {
    if (this.fetching || !this.getData) {
      return;
    }
    this.fetching = true;
    try {
      this.__options.value = await this.getData();
    } finally {
      this.fetching = false;
    }
  }
}
