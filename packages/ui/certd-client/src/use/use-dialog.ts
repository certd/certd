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
  noneForm?: boolean; //是否隐藏表单，只显示注入的body
  className?: string; // 自定义类名，用于包裹表单
};

export function useFormDialog() {
  const { openCrudFormDialog } = useFormWrapper();

  async function openFormDialog(req: FormOptionReq) {
    const noneForm = req.noneForm ?? Object.keys(req?.columns || {}).length === 0;
    function createCrudOptions() {
      const warpper = merge(
        {
          zIndex: req.zIndex,
          title: req.title,
          saveRemind: false,
          slots: {
            "form-body-top": req.body,
          },
          wrapClassName: (noneForm ? "fs-form-none-content" : "") + " " + (req.className || ""),
        },
        req.wrapper
      );
      return {
        crudOptions: {
          columns: req.columns,
          form: {
            labelCol: {
              // @ts-ignore
              span: null,
              style: {
                width: "100px",
              },
            },
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
    return await openCrudFormDialog({ crudOptions });
  }
  return {
    openFormDialog,
  };
}
