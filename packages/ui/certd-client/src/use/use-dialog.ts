import { useFormWrapper } from "@fast-crud/fast-crud";

export type FormOptionReq = {
  title: string;
  columns?: any;
  onSubmit?: any;
  body?: any;
};

export function useFormDialog() {
  const { openCrudFormDialog } = useFormWrapper();

  async function openFormDialog(req: FormOptionReq) {
    function createCrudOptions() {
      return {
        crudOptions: {
          columns: req.columns,
          form: {
            wrapper: {
              title: req.title,
              saveRemind: false,
              slots: {
                "form-body-top": req.body,
              },
            },
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
