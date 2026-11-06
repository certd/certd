import { ref, type VNodeChild } from "vue";
import type { DictComponentType, DictOption, DictPropsRef, DictValue, FnDictStore, GetDictPropsRef } from "./types";

export type { DictComponentType, DictOption, DictPropsRef, DictValue, GetDictPropsRef } from "./types";

export class DictStore implements FnDictStore {
  Props: DictPropsRef = ref([]);
  getData?: () => Promise<DictOption[]>;
  fetching = false;

  constructor(opts: { data: DictOption[]; getData?: () => Promise<DictOption[]> }) {
    this.Props.value = opts.data;
    this.getData = opts.getData;
  }

  getProps(): DictPropsRef {
    void this.fetch();
    return this.Props;
  }

  async fetch() {
    if (this.fetching || !this.getData) {
      return;
    }
    this.fetching = true;
    try {
      this.Props.value = await this.getData();
    } finally {
      this.fetching = false;
    }
  }

  renderTag(value: unknown): VNodeChild {
    const option = this.getOption(value);
    const label = option?.label || this.formatValue(value);
    if (!label) {
      return "—";
    }
    return <a-tag color={option?.color}>{label}</a-tag>;
  }

  getComponentProps(type: DictComponentType, value: unknown, label?: string): Record<string, any> {
    if (type === "select") {
      return this.getSelectComponentProps(value);
    }
    if (type === "checkbox") {
      return this.getCheckableComponentProps("a-checkbox", "checked", value, label);
    }
    if (type === "radio") {
      return this.getCheckableComponentProps("a-radio", "checked", value, label);
    }
    return this.getCheckableComponentProps("a-switch", "checked", value, label, { size: "small" });
  }

  private getSelectComponentProps(value: unknown) {
    const label = this.getOption(value)?.label || this.formatValue(value);
    const selectValue = value === null || value === undefined || value === "" ? undefined : String(value);
    const options = [...this.Props.value];
    if (selectValue && !this.getOption(value)) {
      options.push({ label, value: selectValue });
    }
    return { name: "a-select", vModel: "value", value: selectValue, options, disabled: true, placeholder: "—", class: "dict-render-select" };
  }

  private getCheckableComponentProps(name: string, vModel: string, value: unknown, label?: string, props: Record<string, any> = {}) {
    return {
      name,
      vModel,
      checked: this.isChecked(value),
      disabled: true,
      label: label || this.getOption(value)?.label || this.formatValue(value),
      ...props,
    };
  }

  private getOption(value: unknown) {
    if (value === null || value === undefined) {
      return undefined;
    }
    return this.Props.value.find(option => String(option.value) === String(value));
  }

  private formatValue(value: unknown) {
    if (value === null || value === undefined || value === "") {
      return "";
    }
    return String(value);
  }

  private isChecked(value: unknown) {
    if (typeof value === "string") {
      return value === "true" || value === "1";
    }
    return value === true || value === 1;
  }
}
