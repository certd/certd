import _ from "lodash-es";
import { compute } from "@fast-crud/fast-crud";

export function useReference(form: any) {
  if (!form.reference) {
    return;
  }
  for (const reference of form.reference) {
    _.set(
      form,
      reference.dest,
      compute<any>((scope) => {
        return _.get(scope, reference.src);
      })
    );
  }
}
