import { request, requestForMock } from "/src/api/service";
import "/src/mock";
import UiAntdv from "@fast-crud/ui-antdv";
import { FastCrud, UseCrudProps, useTypes, setLogger } from "@fast-crud/fast-crud";
import "@fast-crud/fast-crud/dist/style.css";
import { FsExtendsUploader, FsExtendsEditor, FsExtendsJson, FsExtendsCopyable, FsExtendsTime } from "@fast-crud/fast-extends";
import "@fast-crud/fast-extends/dist/style.css";

import { useCrudPermission } from "../permission";

function install(app, options: any = {}) {
  app.use(UiAntdv);
  //设置日志级别
  setLogger({ level: "debug" });
  app.use(FastCrud, {
    i18n: options.i18n,
    async dictRequest({ url }) {
      if (url && url.startsWith("/mock")) {
        //如果是crud开头的dict请求视为mock
        return await requestForMock({ url, method: "post" });
      }
      return await request({ url, method: "post" });
    },
    /**
     * useCrud时会被执行
     * @param context，useCrud的参数
     */
    commonOptions(context: UseCrudProps) {
      const crudBinding = context.expose?.crudBinding;
      const opts = {
        table: {
          size: "small",
          pagination: false,
          onResizeColumn: (w, col) => {
            crudBinding.value.table.columnsMap[col.key].width = w;
          }
        },
        rowHandle: {
          buttons: {
            view: { type: "link", text: null, icon: "ion:eye-outline" },
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
          transformQuery: ({ page, form, sort }) => {
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
          transformRes: ({ res }) => {
            const pageSize = res.limit;
            let currentPage = res.offset / pageSize;
            if (res.offset % pageSize === 0) {
              currentPage++;
            }
            return { currentPage, pageSize, ...res };
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
          wrapperCol: {
            span: null
          }
        }
      };

      // 从 useCrud({permission}) 里获取permission参数，去设置各个按钮的权限
      const crudPermission = useCrudPermission({ permission: context.permission });
      return crudPermission.merge(opts);
    }
  });

  // fast-extends里面的扩展组件均为异步组件，只有在使用时才会被加载，并不会影响首页加载速度
  //安装uploader 公共参数
  app.use(FsExtendsUploader, {
    defaultType: "cos",
    cos: {
      domain: "https://d2p-demo-1251260344.cos.ap-guangzhou.myqcloud.com",
      bucket: "d2p-demo-1251260344",
      region: "ap-guangzhou",
      secretId: "", //
      secretKey: "", // 传了secretKey 和secretId 代表使用本地签名模式（不安全，生产环境不推荐）
      getAuthorization(custom) {
        // 不传secretKey代表使用临时签名模式,此时此参数必传（安全，生产环境推荐）
        return request({
          url: "http://www.docmirror.cn:7070/api/upload/cos/getAuthorization",
          method: "get"
        }).then((ret) => {
          // 返回结构如下
          // ret.data:{
          //   TmpSecretId,
          //   TmpSecretKey,
          //   XCosSecurityToken,
          //   ExpiredTime, // SDK 在 ExpiredTime 时间前，不会再次调用 getAuthorization
          // }
          return ret;
        });
      },
      successHandle(ret) {
        // 上传完成后可以在此处处理结果，修改url什么的
        console.log("success handle:", ret);
        return ret;
      }
    },
    alioss: {
      domain: "https://d2p-demo.oss-cn-shenzhen.aliyuncs.com",
      bucket: "d2p-demo",
      region: "oss-cn-shenzhen",
      accessKeyId: "",
      accessKeySecret: "",
      async getAuthorization(custom, context) {
        // 不传accessKeySecret代表使用临时签名模式,此时此参数必传（安全，生产环境推荐）
        const ret = await request({
          url: "http://www.docmirror.cn:7070/api/upload/alioss/getAuthorization",
          method: "get"
        });
        console.log("ret", ret);
        return ret;
      },
      sdkOpts: {
        // sdk配置
        secure: true // 默认为非https上传,为了安全，设置为true
      },
      successHandle(ret) {
        // 上传完成后可以在此处处理结果，修改url什么的
        console.log("success handle:", ret);
        return ret;
      }
    },
    qiniu: {
      bucket: "d2p-demo",
      async getToken(options) {
        const ret = await request({
          url: "http://www.docmirror.cn:7070/api/upload/qiniu/getToken",
          method: "get"
        });
        return ret; // {token:xxx,expires:xxx}
      },
      successHandle(ret) {
        // 上传完成后可以在此处处理结果，修改url什么的
        console.log("success handle:", ret);
        return ret;
      },
      domain: "http://d2p.file.handsfree.work/"
    },
    form: {
      action: "http://www.docmirror.cn:7070/api/upload/form/upload",
      name: "file",
      withCredentials: false,
      uploadRequest: async ({ action, file, onProgress }) => {
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
          onUploadProgress: (p) => {
            onProgress({ percent: Math.round((p.loaded / p.total) * 100) });
          }
        });
      },
      successHandle(ret) {
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
    wangEditor: {}
  });
  app.use(FsExtendsJson);
  app.use(FsExtendsTime);
  app.use(FsExtendsCopyable);

  const { addTypes } = useTypes();
  addTypes({
    time2: {
      //如果与官方字段类型同名，将会覆盖官方的字段类型
      form: { component: { name: "a-date-picker" } },
      column: { component: { name: "fs-date-format", format: "YYYY-MM-DD" } },
      valueBuilder(context) {
        console.log("time2,valueBuilder", context);
      }
    }
  });
}

export default {
  install
};
