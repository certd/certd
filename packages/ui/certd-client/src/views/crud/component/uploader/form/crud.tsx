import * as api from "./api";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, EditReq, UserPageQuery, UserPageRes, utils } from "@fast-crud/fast-crud";
import { createUploaderRules } from "@fast-crud/fast-extends";

export default function ({ crudExpose }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetList(query);
  };
  const editRequest = async ({ form, row }: EditReq) => {
    if (form.id == null) {
      form.id = row.id;
    }
    return await api.UpdateObj(form);
  };
  const delRequest = async ({ row }: DelReq) => {
    return await api.DelObj(row.id);
  };

  const addRequest = async ({ form }: AddReq) => {
    return await api.AddObj(form);
  };

  return {
    crudOptions: {
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest
      },
      form: {
        wrapper: {
          async onOpened() {
            // 异步组件实例的获取
            const componentRef = await crudExpose.getFormComponentRef("file", true);
            utils.logger.info("componentRef", componentRef);
          }
        }
      },
      table: {
        scroll: { x: 2000 }
      },
      columns: {
        id: {
          title: "ID",
          key: "id",
          type: "number",
          column: {
            width: 50
          },
          form: {
            show: false
          }
        },
        file: {
          title: "表单上传",
          type: "file-uploader",
          form: {
            component: {
              multiple: true, //可选择多个
              uploader: {
                type: "form",
                keepName: true,
                successHandle(res: any) {
                  //这里我的后台返回res是一个key 字符串
                  //此方法需要返回的数据结构为 {key:"string",url:"string"...}
                  // 如果 有返回url，那么buildUrl将不会被执行
                  return { key: res };
                }
              },
              valueType: "key",
              async buildUrl(value: string) {
                return "http://www.docmirror.cn:7070/api/upload/form/download?key=" + value;
              }
            },
            helper: "可以同时选择多个文件"
          },
          column: {
            component: {
              // 如果你后台返回的值不是一个完整的url，那么展示时就无法显示和点击
              // 需要你本地根据value构建文件的url。
              // 支持异步
              async buildUrl(value: any) {
                return value;
              }
            }
          }
        },
        pictureCard: {
          title: "照片墙",
          type: "image-uploader",
          form: {
            component: {
              limit: 2,
              uploader: {
                type: "form"
              }
            },
            rules: createUploaderRules([{ required: true, message: "此项必传", trigger: "change" }]),
            helper: "最大可上传2个文件"
          },
          column: {
            component: {
              buildPreviewUrl({ url, index }: any) {
                if (index === 0) {
                  return "https://zos.alipayobjects.com/rmsportal/jkjgkEfvpUPVyRjUImniVslZfWPnJuuZ.png";
                } else {
                  return url + "?preview=600x600";
                }
              }
            }
          }
        },
        error: {
          title: "error",
          type: "image-uploader"
        },
        object: {
          title: "object",
          type: "image-uploader"
        },
        pictureCard2: {
          title: "通过urls显示",
          type: "image-uploader",
          form: {
            show: false,
            component: {
              uploader: {
                type: "form"
              }
            }
          },
          column: {
            component: {
              vModel: "urls"
              // urls:[{url:'xxxx',previewUrl:'xxxx'}]
            }
          }
        },
        avatar: {
          title: "头像上传",
          type: "avatar-uploader",
          form: {
            component: {
              uploader: {
                type: "form"
              },
              on: {
                success(ctx) {
                  // 上传成功后的回调
                  console.log("success", ctx);
                  ctx.form.avatarSize = ctx.$event.file.size;
                }
              }
            },
            helper: "就是照片墙limit=1的效果"
          }
        },
        avatarSize: {
          title: "头像文件大小",
          type: "number",
          form: {
            component: {
              disabled: true
            },
            helper: "左边头像上传成功后，会自动填充文件大小"
          }
        },
        cropper: {
          title: "裁剪",
          type: "cropper-uploader",
          form: {
            component: {
              uploader: {
                type: "form"
              }
            }
          }
        },
        keyValueType: {
          title: "valueType为key",
          type: "file-uploader",
          form: {
            component: {
              uploader: {
                type: "form"
              },
              valueType: "key",
              async buildUrl(value: any) {
                return "http://www.docmirror.cn:7070/api/upload/form/download?key=" + value;
              }
            }
          },
          column: {
            component: {
              async buildUrl(value: any) {
                return "http://www.docmirror.cn:7070/api/upload/form/download?key=" + value;
              }
            }
          }
        },
        anyValueType: {
          title: "valueType=any",
          type: "file-uploader",
          form: {
            component: {
              uploader: {
                type: "form",
                successHandle(res: any) {
                  // 模拟后台返回fileId
                  const key = res.replace("/api/upload/form/download?key=", "");
                  return {
                    url: "http://www.docmirror.cn:7070" + res,
                    key: key,
                    fileId: key
                  };
                }
              },
              valueType: "fileId",
              async buildUrls(value: any[]) {
                //批量构建url
                const urls: string[] = [];
                for (const item of value) {
                  const url = "http://www.docmirror.cn:7070/api/upload/form/download?key=" + item;
                  urls.push(url);
                }
                return urls;
              }
            }
          },
          column: {
            component: {
              async buildUrl(value: any) {
                return "http://www.docmirror.cn:7070/api/upload/form/download?key=" + value;
              }
            }
          }
        },
        limit: {
          title: "限制数量",
          type: "file-uploader",
          form: {
            component: {
              limit: 2,
              uploader: {
                type: "form"
              }
            },
            helper: "最大可上传2个文件"
          }
        },
        sizeLimit: {
          title: "限制大小",
          type: "file-uploader",
          form: {
            component: {
              sizeLimit: 1024,
              uploader: {
                type: "form"
              }
            },
            helper: "大小不能超过1k"
          }
        },
        accept: {
          title: "限制类型",
          type: "file-uploader",
          form: {
            component: {
              accept: ".jpg,.png"
            },
            helper: "只能上传jpg或者png"
          }
        },
        validation: {
          title: "校验",
          type: "file-uploader",
          form: {
            // 使用createUploaderRules创建校验规则,会附带文件还未上传完成的校验
            rules: createUploaderRules([{ required: true, message: "此项必传", trigger: "change" }]),
            helper: "大小不能超过50M，文件未上传完成之前，阻止提交",
            component: {
              uploader: {
                type: "form",
                sizeLimit: 1024 * 1024 * 50
              }
            }
          }
        }
      }
    }
  };
}
