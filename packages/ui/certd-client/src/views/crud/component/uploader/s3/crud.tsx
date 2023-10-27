import * as api from "./api";
import { GetSignedUrl } from "./api";
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
        file: {
          title: "S3上传",
          type: "file-uploader",
          // 将被分发到 form.component 和 column.component之下
          async buildUrl(key: string) {
            //向后端获取下载的预签名链接
            return await GetSignedUrl("fast-crud", key, "get");
          },
          form: {
            component: {
              uploader: {
                type: "s3"
              },
              valueType: "key" //返回值为key
            }
          }
        },
        pictureCard: {
          title: "照片墙",
          type: "image-uploader",
          async buildUrl(key: string) {
            //向后端获取下载的预签名链接
            return await GetSignedUrl("fast-crud", key, "get");
          },
          form: {
            component: {
              uploader: {
                type: "s3"
              },
              valueType: "key"
            }
          }
        },
        cropper: {
          title: "裁剪",
          type: "cropper-uploader",
          async buildUrl(key: string) {
            //向后端获取下载的预签名链接
            return await GetSignedUrl("fast-crud", key, "get");
          },
          form: {
            component: {
              uploader: {
                type: "s3"
              },
              valueType: "key"
            }
          }
        }
      }
    }
  };
}
