import { request, requestForMock } from "/src/api/service";
// import "/src/mock";
import {
  ColumnCompositionProps,
  CrudOptions,
  FastCrud,
  PageQuery,
  PageRes,
  setLogger,
  TransformResProps,
  useColumns,
  UseCrudProps,
  UserPageQuery,
  useTypes,
  utils
} from "@fast-crud/fast-crud";
import "@fast-crud/fast-crud/dist/style.css";
import {
  FsExtendsCopyable,
  FsExtendsEditor,
  FsExtendsJson,
  FsExtendsTime,
  FsExtendsUploader,
  FsExtendsInput,
  FsUploaderS3SignedUrlType,
  FsUploaderGetAuthContext,
  FsUploaderAliossSTS
} from "@fast-crud/fast-extends";
import "@fast-crud/fast-extends/dist/style.css";
import UiAntdv from "@fast-crud/ui-antdv4";
import "@fast-crud/ui-antdv4/dist/style.css";
import _ from "lodash-es";
import { useCrudPermission } from "../permission";
import { App } from "vue";
import { notification } from "ant-design-vue";

function install(app: App, options: any = {}) {
  app.use(UiAntdv);
  //设置日志级别
  setLogger({ level: "info" });
  app.use(FastCrud, {
    i18n: options.i18n,
    async dictRequest({ url }: any) {
      if (url && url.startsWith("/mock")) {
        //如果是crud开头的dict请求视为mock
        return await requestForMock({ url, method: "post" });
      }
      return await request({ url, method: "post" });
    },
    /**
     * useCrud时会被执行
     * @param props，useCrud的参数
     */
    commonOptions(props: UseCrudProps): CrudOptions {
      utils.logger.debug("commonOptions:", props);
      const crudBinding = props.crudExpose?.crudBinding;
      const opts: CrudOptions = {
        table: {
          scroll: {
            x: 960
          },
          size: "small",
          pagination: false,
          onResizeColumn: (w: number | string, col: any) => {
            if (crudBinding.value?.table?.columnsMap && crudBinding.value?.table?.columnsMap[col.key]) {
              crudBinding.value.table.columnsMap[col.key].width = w;
            }
          },
          conditionalRender: {
            match(scope) {
              //不能用 !scope.value ， 否则switch组件设置为关之后就消失了
              const { value, key, props } = scope;
              return !value && key != "_index" && value != false;
            },
            render() {
              return "-";
            }
          }
        },
        toolbar: {
          export: {
            fileType: "excel"
          }
        },
        rowHandle: {
          buttons: {
            view: { type: "link", text: null, icon: "ion:eye-outline" },
            copy: { show: true, type: "link", text: null, icon: "ion:copy-outline" },
            edit: { type: "link", text: null, icon: "ion:create-outline" },
            remove: { type: "link", style: { color: "red" }, text: null, icon: "ion:trash-outline" }
          },
          dropdown: {
            more: {
              type: "link"
            }
          }
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
                offset
              },
              query: form,
              sort
            };
          },
          transformRes: ({ res }: TransformResProps): PageRes => {
            const pageSize = res.limit;
            let currentPage = res.offset / pageSize;
            if (res.offset % pageSize === 0) {
              currentPage++;
            }
            return { currentPage, pageSize, records: res.records, total: res.total, ...res };
          }
        },
        form: {
          display: "flex",
          labelCol: {
            //固定label宽度
            span: null,
            style: {
              width: "120px"
            }
          },
          async afterSubmit({ mode }) {
            if (mode === "add") {
              notification.success({ message: "添加成功" });
            } else if (mode === "edit") {
              notification.success({ message: "保存成功" });
            }
          },
          wrapperCol: {
            span: null
          },
          wrapper: {
            saveRemind: true
            // inner: true,
            // innerContainerSelector: "main.fs-framework-content"
          }
        },
        columns: {
          // createdAt: {
          //   title: "创建时间",
          //   type: "datetime",
          //   form: {
          //     show: false
          //   },
          //   column: {
          //     show: false,
          //     order: 1000
          //   }
          // }
        }
      };

      // 从 useCrud({permission}) 里获取permission参数，去设置各个按钮的权限
      const permission = props.context?.permission || null;
      const crudPermission = useCrudPermission({ permission });
      return crudPermission.merge(opts);
    }
  });

  // fast-extends里面的扩展组件均为异步组件，只有在使用时才会被加载，并不会影响首页加载速度
  //安装uploader 公共参数

  // @ts-ignore
  app.use(FsExtendsUploader, {
    // @ts-ignore
    defaultType: "cos",
    cos: {
      keepName: true,
      domain: "https://d2p-demo-1251260344.cos.ap-guangzhou.myqcloud.com",
      bucket: "d2p-plugins-1251260344",
      region: "ap-guangzhou",
      secretId: "", //
      secretKey: "", // 传了secretKey 和secretId 代表使用本地签名模式（不安全，生产环境不推荐）
      async getAuthorization(custom: any) {
        // 不传secretKey代表使用临时签名模式,此时此参数必传（安全，生产环境推荐）
        const ret = request({
          url: "http://www.docmirror.cn:7070/api/upload/cos/getAuthorization",
          method: "get"
        });
        // 返回结构要求如下
        // ret.data:{
        //   TmpSecretId,
        //   TmpSecretKey,
        //   XCosSecurityToken,
        //   ExpiredTime, // SDK 在 ExpiredTime 时间前，不会再次调用 getAuthorization
        // }
        return ret;
      },
      successHandle(ret: any) {
        // 上传完成后可以在此处处理结果，修改url什么的
        console.log("success handle:", ret);
        return ret;
      }
    },
    alioss: {
      keepName: true,
      domain: "https://d2p-demo.oss-cn-shenzhen.aliyuncs.com",
      bucket: "d2p-plugins",
      region: "oss-cn-shenzhen",
      accessKeyId: "",
      accessKeySecret: "",
      async getAuthorization(context: FsUploaderGetAuthContext): Promise<FsUploaderAliossSTS> {
        // 不传accessKeySecret代表使用临时签名模式,此时此参数必传（安全，生产环境推荐）
        const ret = await request({
          url: "http://www.docmirror.cn:7070/api/upload/alioss/getAuthorization",
          method: "get"
        });
        console.log("ret", ret);
        // 返回结构要求如下
        // ret.data:{
        //   TmpSecretId,
        //   TmpSecretKey,
        //   XCosSecurityToken,
        //   ExpiredTime, // SDK 在 ExpiredTime 时间前，不会再次调用 getAuthorization
        //   key //【可选】后台生成的文件key，如果不传则用前端自己生成的key
        // }
        return ret;
      },
      sdkOpts: {
        // sdk配置
        secure: true // 默认为非https上传,为了安全，设置为true
      },
      successHandle(ret: any) {
        // 上传完成后可以在此处处理结果，修改url什么的
        console.log("success handle:", ret);
        return ret;
      }
    },
    qiniu: {
      keepName: true,
      bucket: "d2p-plugins",
      async getToken(options: any) {
        const ret = await request({
          url: "http://www.docmirror.cn:7070/api/upload/qiniu/getToken",
          method: "get"
        });
        return ret; // {token:xxx,expires:xxx}
      },
      successHandle(ret: any) {
        // 上传完成后可以在此处处理结果，修改url什么的
        console.log("success handle:", ret);
        return ret;
      },
      domain: "http://d2p.file.handsfree.work/"
    },
    form: {
      keepName: true,
      action: "http://www.docmirror.cn:7070/api/upload/form/upload",
      name: "file",
      withCredentials: false,
      uploadRequest: async ({ action, file, onProgress }: any) => {
        // @ts-ignore
        const data = new FormData();
        data.append("file", file);
        return await request({
          url: action,
          method: "post",
          headers: {
            "Content-Type": "multipart/form-data"
          },
          timeout: 60000,
          data,
          onUploadProgress: (p: any) => {
            onProgress({ percent: Math.round((p.loaded / p.total) * 100) });
          }
        });
      },
      successHandle(ret: any) {
        // 上传完成后的结果处理， 此处应返回格式为{url:xxx}
        return {
          url: "http://www.docmirror.cn:7070" + ret,
          key: ret.replace("/api/upload/form/download?key=", "")
        };
      }
    }
  });

  //安装editor
  app.use(FsExtendsEditor, {
    //编辑器的公共配置
    wangEditor: {
      editorConfig: {
        MENU_CONF: {}
      },
      toolbarConfig: {}
    }
  });
  app.use(FsExtendsJson);
  app.use(FsExtendsTime);
  app.use(FsExtendsCopyable);
  app.use(FsExtendsInput);

  const { addTypes, getType } = useTypes();
  //此处演示修改官方字段类型
  const textType = getType("text");
  textType.search.autoSearchTrigger = "change"; //修改官方的字段类型，变化就触发 ， "enter"=回车键触发

  // 此处演示自定义字段类型
  addTypes({
    time2: {
      //如果与官方字段类型同名，将会覆盖官方的字段类型
      form: { component: { name: "a-date-picker" } },
      column: { component: { name: "fs-date-format", format: "YYYY-MM-DD" } },
      valueBuilder(context: any) {
        console.log("time2,valueBuilder", context);
      }
    }
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
        _.merge(columnProps, {
          form: { show: false },
          viewForm: { show: true }
        });
      }
      return columnProps;
    }
  });

  registerMergeColumnPlugin({
    name: "resize-column-plugin",
    order: 2,
    handle: (columnProps: ColumnCompositionProps) => {
      if (!columnProps.column) {
        columnProps.column = {};
      }
      columnProps.column.resizable = true;
      if (!columnProps.column.width) {
        columnProps.column.width = 100;
      } else if (typeof columnProps.column?.width === "string" && columnProps.column.width.indexOf("px") > -1) {
        columnProps.column.width = parseInt(columnProps.column.width.replace("px", ""));
      }
      return columnProps;
    }
  });
}

export default {
  install
};
