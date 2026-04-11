import * as api from "./api";
import { AddReq, CreateCrudOptionsProps, CreateCrudOptionsRet, DelReq, dict, EditReq, UserPageQuery, UserPageRes } from "@fast-crud/fast-crud";
import { useUserStore } from "/@/store/user";
import { Modal, notification } from "ant-design-vue";
import dayjs from "dayjs";
import { useSettingStore } from "/@/store/settings";
import { useI18n } from "/src/locales";
import { computed } from "vue";

export default function ({ crudExpose }: CreateCrudOptionsProps): CreateCrudOptionsRet {
  const { t } = useI18n();
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

  const userStore = useUserStore();

  const settingStore = useSettingStore();
  const userValidTimeEnabled = computed(() => {
    return settingStore.sysPublic.userValidTimeEnabled === true;
  });
  return {
    crudOptions: {
      request: {
        pageRequest,
        addRequest,
        editRequest,
        delRequest,
      },
      rowHandle: {
        fixed: "right",
        buttons: {
          unlock: {
            title: t("certd.unlockLogin"),
            text: null,
            type: "link",
            icon: "ion:lock-open-outline",
            click: async ({ row }) => {
              Modal.confirm({
                title: t("certd.notice"),
                content: t("certd.confirmUnlock"),
                onOk: async () => {
                  await api.Unlock(row.id);
                  notification.success({
                    message: t("certd.unlockSuccess"),
                  });
                },
              });
            },
          },
        },
      },
      table: {
        scroll: {
          //使用固定列时需要设置此值，并且大于等于列宽度之和的值
          x: 1400,
        },
      },
      columns: {
        id: {
          title: "id",
          type: "text",
          form: { show: false }, // 表单配置
          column: {
            width: 100,
            sorter: true,
          },
        },
        createTime: {
          title: t("certd.createTime"),
          type: "datetime",
          form: { show: false }, // 表单配置
          column: {
            width: 180,
            sorter: true,
          },
        },
        // updateTime: {
        //   title: "修改时间",
        //   type: "datetime",
        //   form: { show: false }, // 表单配置
        //   column: {
        //     sortable: "update_time",
        //     width: 180
        //   }
        // },
        username: {
          title: t("certd.username"),
          type: "text",
          search: { show: true }, // 开启查询
          form: {
            rules: [
              { required: true, message: t("certd.enterUsername") },
              { max: 50, message: t("certd.max50Chars") },
            ],
          },
          editForm: { component: { disabled: false } },
          column: {
            sorter: true,
            width: 200,
          },
        },
        password: {
          title: t("certd.password"),
          type: "text",
          key: "password",
          column: {
            show: false,
          },
          form: {
            rules: [{ max: 50, message: t("certd.max50Chars") }],
            component: {
              showPassword: true,
            },
            helper: t("certd.modifyPasswordIfFilled"),
          },
        },
        nickName: {
          title: t("certd.nickName"),
          type: "text",
          search: { show: true }, // 开启查询
          form: {
            rules: [{ max: 50, message: t("certd.max50Chars") }],
          },
          column: {
            sorter: true,
          },
        },
        email: {
          title: t("certd.emaila"),
          type: "text",
          search: { show: true }, // 开启查询
          form: {
            rules: [{ max: 50, message: t("certd.max50Chars") }],
          },
          column: {
            sorter: true,
            width: 160,
          },
        },
        mobile: {
          title: t("certd.mobile"),
          type: "text",
          search: { show: true }, // 开启查询
          form: {
            rules: [{ max: 50, message: t("certd.max50Chars") }],
          },
          column: {
            sorter: true,
            width: 130,
          },
        },
        avatar: {
          title: t("certd.avatar"),
          type: "cropper-uploader",
          column: {
            width: 70,
            component: {
              style: {
                height: "30px",
                width: "auto",
              },
              buildUrl(key: string) {
                return `api/basic/file/download?token=${userStore.getToken}&key=` + key;
              },
            },
          },
          form: {
            component: {
              vModel: "modelValue",
              valueType: "key",
              cropper: {
                aspectRatio: 1,
                autoCropArea: 1,
                viewMode: 0,
              },
              onReady: null,
              uploader: {
                type: "form",
                action: "/basic/file/upload?token=" + userStore.getToken,
                name: "file",
                headers: {
                  Authorization: "Bearer " + userStore.getToken,
                },
                successHandle(res: any) {
                  return res;
                },
              },
              buildUrl(key: string) {
                return `api/basic/file/download?&key=` + key;
              },
            },
          },
        },
        status: {
          title: t("certd.status"),
          type: "dict-switch",
          dict: dict({
            data: [
              { label: t("common.enabled"), value: 1, color: "green" },
              { label: t("common.disabled"), value: 0, color: "red" },
            ],
          }),
          column: {
            align: "center",
            sorter: true,
            width: 100,
          },
        },
        validTime: {
          title: t("certd.validTime"),
          type: "date",
          form: {
            show: userValidTimeEnabled,
          },
          column: {
            align: "center",
            sorter: true,
            width: 160,
            show: userValidTimeEnabled,
            cellRender({ value }) {
              if (value == null || value === 0) {
                return "";
              }
              if (value < dayjs().valueOf()) {
                return <a-tag color={"red"}>{t("certd.expired")}</a-tag>;
              }
              const date = dayjs(value).format("YYYY-MM-DD");
              return (
                <a-tag color={"green"} title={date}>
                  <fs-time-humanize modelValue={value} options={{ largest: 1, units: ["y", "d", "h"] }} useFormatGreater={30000000000} />
                </a-tag>
              );
            },
          },
          valueBuilder({ value, row, key }) {
            if (value != null) {
              row[key] = dayjs(value);
            }
          },
          valueResolve({ value, row, key }) {
            if (value != null) {
              row[key] = value.valueOf();
            }
          },
        },
        remark: {
          title: t("certd.remark"),
          type: "text",
          column: {
            sorter: true,
          },
          form: {
            rules: [{ max: 100, message: t("certd.max100Chars") }],
          },
        },
        roles: {
          title: t("certd.roles"),
          type: "dict-select",
          dict: dict({
            url: "/basic/user/getSimpleRoles",
            value: "id",
            label: "name",
          }), // 数据字典
          form: {
            component: { mode: "multiple" },
          },
          column: {
            width: 250,
            sortable: true,
          },
        },
      },
    },
  };
}
