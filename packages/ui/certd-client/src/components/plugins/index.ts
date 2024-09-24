import PiSynologyIdDeviceGetter from "./synology/device-id-getter.vue";
export default {
  install(app: any) {
    app.component("PiSynologyDeviceIdGetter", PiSynologyIdDeviceGetter);
  }
};
