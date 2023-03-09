import { createPinia } from "pinia";
const store = createPinia();
export default {
  install(app: any) {
    app.use(store);
  }
};

export { store };
