import { useColumns } from "@fast-crud/fast-crud";
import { createExtraColumns } from "/@/views/certd/pipeline/template/use";
import TemplateImportTable from "/@/views/certd/pipeline/template/import/table.vue";
import { Ref } from "vue";

export function createFormOptions(detail: Ref): any {
  const { buildFormOptions } = useColumns();

  const crudOptions = {
    columns: {
      ...createExtraColumns(),
      templateProps: {
        title: "流水线导入",
        type: "text",
        form: {
          order: 1,
          component: {
            name: TemplateImportTable,
            detail: detail,
          },
          col: {
            span: 24,
          },
        },
      },
    },
  };

  return buildFormOptions(crudOptions);
}
