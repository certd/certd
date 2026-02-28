//@ts-ignore
import { request } from "/src/api/service";
// import "/src/mock";
import { ColumnCompositionProps, CrudOptions, FastCrud, PageQuery, PageRes, setLogger, TransformResProps, useColumns, UseCrudProps, UserPageQuery, useTypes, utils, forEachTableColumns } from "@fast-crud/fast-crud";
import "@fast-crud/fast-crud/dist/style.css";
import { FsExtendsCopyable, FsExtendsEditor, FsExtendsJson, FsExtendsTime, FsExtendsUploader, FsExtendsInput } from "@fast-crud/fast-extends";
import "@fast-crud/fast-extends/dist/style.css";
import UiAntdv from "@fast-crud/ui-antdv4";
import "@fast-crud/ui-antdv4/dist/style.css";
import { debounce, merge } from "lodash-es";
import { useCrudPermission } from "../permission";
import { App } from "vue";
import { notification } from "ant-design-vue";
import { usePreferences } from "/@/vben/preferences";
import { LocalStorage } from "/@/utils/util.storage";

import { FsEditorCode } from "@fast-crud/editor-code";
import "@fast-crud/editor-code/dist/style.css";

class ColumnSizeSaver {
  type: string;
  save: (key: string, value: any) => void;
  constructor(type: string = "columnSize") {
    this.type = type;
    this.save = debounce((key: string, value: any) => {
      const saveKey = this.getKey();
      let data = LocalStorage.get(saveKey);
      if (!data) {
        data = {};
      }
      data[key] = value;
      LocalStorage.set(saveKey, data);
    });
  }
  getKey() {
    const loc = window.location;
    const currentUrl = `${loc.pathname}${loc.search}${loc.hash}`;
    return `${this.type}-${currentUrl}`;
  }
  get(key: string) {
    const saveKey = this.getKey();
    const row = LocalStorage.get(saveKey);
    return row?.[key];
  }
  clear() {
    const saveKey = this.getKey();
    LocalStorage.remove(saveKey);
  }
}
const columnSizeSaver = new ColumnSizeSaver("columnSize");
const tableSortSaver = new ColumnSizeSaver("tableSorter");
const tableSaver = new ColumnSizeSaver("table");

function install(app: App, options: any = {}) {
  app.use(UiAntdv);
  //设置日志级别
  setLogger({ level: "info" });

  app.use(FastCrud, {
    i18n: options.i18n,
    async dictRequest({ url }: any) {
      return await request({ url, method: "post" });
    },
    /**
     * useCrud时会被执行
     * @param props，useCrud的参数
     */
    commonOptions(props: UseCrudProps): CrudOptions {
      utils.logger.debug("commonOptions:", props);
      const crudBinding = props.crudExpose?.crudBinding;
      const crudExpose = props.crudExpose;

      const { isMobile } = usePreferences();
      const opts: CrudOptions = {
        settings: {
          plugins: {
            mobile: {
              enabled: true,
              props: {
                isMobile: isMobile,
              },
            },
          },
          onUseCrud(bindings: any) {
            const oldSorter = tableSortSaver.get("sorter");
            if (oldSorter) {
              const { prop, order } = oldSorter;
              forEachTableColumns(bindings.table.columns, (column: any) => {
                if (column.key === prop) {
                  column.sortOrder = order;
                } else {
                  column.sortOrder = false;
                }
              });
              bindings.table.sort = oldSorter;
            }
          },
        },
        pagination: {
          _onPageSizeChange(req: any) {
            const { pageSize } = req;
            tableSaver.save("pageSize", pageSize);
          },
          pageSize: tableSaver.get("pageSize") || 20,
        },
        table: {
          scroll: {
            x: 960,
          },
          size: "small",
          pagination: false,
          onResizeColumn: (w: number, col: any) => {
            if (crudBinding.value?.table?.columnsMap && crudBinding.value?.table?.columnsMap[col.key]) {
              crudBinding.value.table.columnsMap[col.key].width = w;
              columnSizeSaver.save(col.key, w);
            }
          },
          conditionalRender: {
            match(scope) {
              if (scope.column.conditionalRenderDisabled) {
                return false;
              }
              if (scope.key === "__blank__") {
                return false;
              }
              //不能用 !scope.value ， 否则switch组件设置为关之后就消失了
              const { value, key, props } = scope;
              return !value && key != "_index" && value != false && value != 0;
            },
            render() {
              return "-";
            },
          },
          onSortChange: (sortChange: any) => {
            const { isServerSort, prop, asc, order } = sortChange;
            const oldSort = crudBinding.value.table.sort;
            const newSorter = isServerSort ? { prop, order, asc } : null;

            forEachTableColumns(crudBinding.value.table.columns, (column: any) => {
              if (column.key === prop) {
                column.sortOrder = order;
              } else {
                column.sortOrder = false;
              }
            });

            crudBinding.value.table.sort = newSorter;
            if (newSorter) {
              tableSortSaver.save("sorter", newSorter);
            } else {
              tableSortSaver.clear();
            }

            if (isServerSort || oldSort != null) {
              crudExpose.doRefresh();
            }
          },
        },
        toolbar: {
          export: {
            fileType: "excel",
          },
          columnsFilter: {
            async onReset() {
              columnSizeSaver.clear();
            },
          },
          buttons: {
            export: {
              show: false,
            },
          },
        },
        rowHandle: {
          fixed: "right",
          buttons: {
            view: { type: "link", text: null, icon: "ion:eye-outline", tooltip: { title: "查看" } },
            copy: { show: true, type: "link", text: null, icon: "ion:copy-outline", tooltip: { title: "复制" } },
            edit: { type: "link", text: null, icon: "ion:create-outline", tooltip: { title: "编辑" } },
            remove: { type: "link", style: { color: "red" }, text: null, icon: "ion:trash-outline", tooltip: { title: "删除" } },
          },
          dropdown: {
            more: {
              type: "link",
            },
          },
          resizable: true,
          width: 200,
        },
        request: {
          transformQuery: ({ page, form, sort }: PageQuery): UserPageQuery => {
            const limit = page.pageSize;
            const currentPage = page.currentPage ?? 1;
            const offset = limit * (currentPage - 1);

            sort = sort == null ? {} : sort;

            return {
              page: {
                limit,
                offset,
              },
              query: form,
              sort,
            };
          },
          transformRes: ({ res }: TransformResProps): PageRes => {
            const pageSize = res.limit;
            let currentPage = res.offset / pageSize;
            if (res.offset % pageSize === 0) {
              currentPage++;
            }
            return { currentPage, pageSize, records: res.records, total: res.total, ...res };
          },
        },
        search: {
          formItem: {
            wrapperCol: {
              style: {
                width: "50%",
              },
            },
          },
        },
        form: {
          display: "flex",
          labelCol: {
            //固定label宽度
            span: null,
            style: {
              width: "145px",
            },
          },
          async afterSubmit({ mode }) {
            if (mode === "add") {
              notification.success({ message: "添加成功" });
            } else if (mode === "edit") {
              notification.success({ message: "保存成功" });
            }
          },
          wrapperCol: {
            span: null,
          },
          wrapper: {
            saveRemind: true,
            // inner: true,
            // innerContainerSelector: "main.fs-framework-content"，
            buttons: {
              copy: { show: false },
              paste: { show: false },
            },
          },
        },
        columns: {
          //最后一列空白，用于自动伸缩列宽
          __blank__: {
            title: "",
            type: "text",
            form: {
              show: false,
            },
            column: {
              order: 99999,
              width: -1,
              columnSetShow: false,
              resizable: false,
            },
          },
        },
      };

      // 从 useCrud({permission}) 里获取permission参数，去设置各个按钮的权限
      const permission = props.context?.permission || null;
      const crudPermission = useCrudPermission({ permission });
      return crudPermission.merge(opts);
    },
  });

  // fast-extends里面的扩展组件均为异步组件，只有在使用时才会被加载，并不会影响首页加载速度
  //安装uploader 公共参数

  // @ts-ignore
  app.use(FsExtendsUploader, {
    // @ts-ignore
    defaultType: "form",
    form: {
      keepName: true,
      type: "form",
      action: "/basic/file/upload",
      name: "file",
      withCredentials: false,
      test: 22,
      custom: { aaa: 22 },
      uploadRequest: async (opts: any) => {
        console.log("uploadRequest:", opts);
        const { action, file, onProgress } = opts;
        // @ts-ignore
        const data = new FormData();
        data.append("file", file);
        return await request({
          url: action,
          method: "post",
          headers: {
            "Content-Type": "multipart/form-data",
          },
          timeout: 60000,
          data,
          onUploadProgress: (p: any) => {
            onProgress({ percent: Math.round((p.loaded / p.total) * 100) });
          },
        });
      },
      successHandle(res: any) {
        return res;
      },
    },
  });

  //安装editor
  app.use(FsExtendsEditor, {
    //编辑器的公共配置
    wangEditor: {
      editorConfig: {
        MENU_CONF: {},
      },
      toolbarConfig: {},
    },
  });
  app.use(FsExtendsJson);
  app.use(FsExtendsTime);
  app.use(FsExtendsCopyable);
  app.use(FsExtendsInput);
  //@ts-ignore
  app.use(FsEditorCode);

  const { addTypes, getType } = useTypes();
  //此处演示修改官方字段类型
  const textType = getType("text");
  textType.search.autoSearchTrigger = "change"; //修改官方的字段类型，变化就触发 ， "enter"=回车键触发
  if (!textType.column) {
    textType.column = {};
  }
  textType.column.ellipsis = true;
  textType.column.showTitle = true;

  // 此处演示自定义字段类型
  addTypes({
    time2: {
      //如果与官方字段类型同名，将会覆盖官方的字段类型
      form: { component: { name: "a-date-picker" } },
      column: { component: { name: "fs-date-format", format: "YYYY-MM-DD" } },
      valueBuilder(context: any) {
        console.log("time2,valueBuilder", context);
      },
    },
  });

  // 此处演示自定义字段合并插件
  const { registerMergeColumnPlugin } = useColumns();
  registerMergeColumnPlugin({
    name: "readonly-plugin",
    order: 1,
    handle: (columnProps: ColumnCompositionProps) => {
      // 你可以在此处做你自己的处理
      // 比如你可以定义一个readonly的公共属性，处理该字段只读，不能编辑
      if (columnProps.readonly) {
        // 合并column配置
        merge(columnProps, {
          form: { show: false },
          viewForm: { show: true },
        });
      }
      return columnProps;
    },
  });

  //默认宽度，支持自动拖动调整列宽
  registerMergeColumnPlugin({
    name: "resize-column-plugin",
    order: 2,
    handle: (columnProps: ColumnCompositionProps) => {
      if (!columnProps.column) {
        columnProps.column = {};
      }
      columnProps.column.resizable = true;
      const savedColumnWidth = columnSizeSaver.get(columnProps.key as string);
      if (savedColumnWidth) {
        columnProps.column.width = savedColumnWidth;
      } else if (columnProps.column.width == null) {
        columnProps.column.width = 200;
      } else if (typeof columnProps.column?.width === "string" && columnProps.column.width.indexOf("px") > -1) {
        columnProps.column.width = parseInt(columnProps.column.width.replace("px", ""));
      }
      return columnProps;
    },
  });

  registerMergeColumnPlugin({
    name: "reset-values-format-colors",
    order: 10,
    handle: (columnProps: ColumnCompositionProps) => {
      // 你可以在此处做你自己的处理
      // 比如你可以定义一个readonly的公共属性，处理该字段只读，不能编辑
      if (columnProps.column?.component?.name === "fs-values-format") {
        // 合并column配置
        if (!columnProps.column.component.autoColors) {
          columnProps.column.component.autoColors = ["green", "cyan", "blue", "purple", "geekblue"];
        }
      }
      return columnProps;
    },
  });
}

export default {
  install,
};
