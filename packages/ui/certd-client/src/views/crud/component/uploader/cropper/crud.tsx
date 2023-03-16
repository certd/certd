import * as api from "./api";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";

export default function ({ crudExpose }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const pageRequest = async (query: UserPageQuery): Promise<UserPageRes> => {
    return await api.GetList(query);
  };
  const editRequest = async ({ form, row }: EditReq) => {
    form.id = row.id;
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
        cropper: {
          title: "头像裁剪上传",
          type: "cropper-uploader"
        },
        avatar: {
          title: "数量限制",
          type: "cropper-uploader",
          form: {
            component: {
              limit: 5 //默认限制1个，即头像上传，0为不限制
            }
          }
        },
        aspect: {
          title: "按比例裁剪",
          type: "cropper-uploader",
          form: {
            component: {
              cropper: {
                aspectRatio: 2
              }
            }
          }
        },
        alioss: {
          title: "alioss",
          type: "cropper-uploader",
          form: {
            component: {
              uploader: {
                type: "alioss"
              }
            }
          }
        },
        qiniu: {
          title: "七牛",
          type: "cropper-uploader",
          form: {
            component: {
              uploader: {
                type: "qiniu"
              }
            }
          }
        },
        cos: {
          title: "腾讯cos",
          type: "cropper-uploader",
          form: {
            component: {
              uploader: {
                type: "cos"
              }
            }
          }
        },
        form: {
          title: "表单",
          type: "cropper-uploader",
          form: {
            component: {
              uploader: {
                type: "form"
              }
            }
          }
        }
      }
    }
  };
}
