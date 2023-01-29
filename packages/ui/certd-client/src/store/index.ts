import { createPinia } from "pinia";
const store = createPinia();
export default {
  install(app) {
    app.use(store);
  }
};

export { store };
