import { inject } from "vue";
import { fnUiServicesKey, type FnUiServices } from "../provider/context";

export function useFnUiServices(): FnUiServices {
  const services = inject(fnUiServicesKey);
  if (!services) {
    throw new Error("Fn UI services require FnConfigProvider");
  }
  return services;
}
