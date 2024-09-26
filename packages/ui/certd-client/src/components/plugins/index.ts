import SynologyIdDeviceGetter from "./synology/device-id-getter.vue";
import RemoteSelect from "./common/remote-select.vue";
export default {
  install(app: any) {
    app.component("SynologyDeviceIdGetter", SynologyIdDeviceGetter);
    app.component("RemoteSelect", RemoteSelect);
  }
};
