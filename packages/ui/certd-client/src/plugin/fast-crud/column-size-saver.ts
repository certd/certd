import { debounce } from "lodash-es";
import { LocalStorage } from "/@/utils/util.storage";

export class ColumnSizeSaver {
  save: (key: string, size: number) => void;
  constructor() {
    this.save = debounce((key: string, size: number) => {
      const saveKey = this.getKey();
      let data = LocalStorage.get(saveKey);
      if (!data) {
        data = {};
      }
      data[key] = size;
      LocalStorage.set(saveKey, data);
    });
  }
  getKey() {
    const loc = window.location;
    const currentUrl = `${loc.pathname}${loc.search}${loc.hash}`;
    return `columnSize-${currentUrl}`;
  }
  get(key: string) {
    const saveKey = this.getKey();
    const row = LocalStorage.get(saveKey);
    return row?.[key];
  }
  clear() {
    const saveKey = this.getKey();
    LocalStorage.remove(saveKey);
  }
}

export const columnSizeSaver = new ColumnSizeSaver();
