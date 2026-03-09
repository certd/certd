import { useFormWrapper } from "@fast-crud/fast-crud";
import { merge } from "lodash-es";

export type FormOptionReq = {
  title: string;
  columns?: any;
  onSubmit?: any;
  body?: any;
  initialForm?: any;
  zIndex?: number;
  wrapper?: any;
};

export function useFormDialog() {
  const { openCrudFormDialog } = useFormWrapper();

  async function openFormDialog(req: FormOptionReq) {
    function createCrudOptions() {
      const warpper = merge(
        {
          zIndex: req.zIndex,
          title: req.title,
          saveRemind: false,
          slots: {
            "form-body-top": req.body,
          },
        },
        req.wrapper
      );
      return {
        crudOptions: {
          columns: req.columns,
          form: {
            initialForm: req.initialForm,
            wrapper: warpper,
            async afterSubmit() {},
            async doSubmit({ form }: any) {
              if (req.onSubmit) {
                await req.onSubmit(form);
              }
            },
          },
        },
      };
    }
    const { crudOptions } = createCrudOptions();
    await openCrudFormDialog({ crudOptions });
  }
  return {
    openFormDialog,
  };
}
