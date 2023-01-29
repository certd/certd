export const crudResources = [
  {
    title: "CRUD示例",
    name: "crud",
    path: "/crud",
    redirect: "/crud/basis",
    meta: {
      icon: "ion:apps-sharp"
    },
    children: [
      {
        title: "基本特性",
        name: "basis",
        path: "/crud/basis",
        redirect: "/crud/basis/i18n",
        meta: {
          icon: "ion:disc-outline"
        },
        children: [
          {
            title: "HelloWorld",
            name: "FsCrudFirst",
            path: "/crud/basis/first",
            component: "/crud/basis/first/index.vue"
          },
          {
            title: "动态计算",
            name: "BasisCompute",
            path: "/crud/basis/compute",
            component: "/crud/basis/compute/index.vue"
          },
          {
            title: "动态计算-更多示例",
            name: "BasisComputeMore",
            path: "/crud/basis/compute-more",
            component: "/crud/basis/compute-more/index.vue"
          },
          {
            title: "国际化",
            name: "BasisI18n",
            path: "/crud/basis/i18n",
            component: "/crud/basis/i18n/index.vue"
          },
          {
            title: "ValueChange",
            name: "BasisValueChange",
            path: "/crud/basis/value-change",
            component: "/crud/basis/value-change/index.vue"
          },
          {
            title: "Card布局",
            name: "BasisLayoutCard",
            path: "/crud/basis/layout-card",
            component: "/crud/basis/layout-card/index.vue"
          },
          {
            title: "自定义布局",
            name: "BasisLayoutCustom",
            path: "/crud/basis/layout-custom",
            component: "/crud/basis/layout-custom/index.vue"
          },
          {
            title: "列设置",
            name: "BasisColumnsSet",
            path: "/crud/basis/columns-set",
            component: "/crud/basis/columns-set/index.vue"
          }
        ]
      },
      {
        title: "数据字典",
        name: "dict",
        path: "/crud/dict",
        redirect: "/crud/dict/single",
        meta: {
          icon: "ion:book-outline"
        },
        children: [
          {
            title: "单例",
            name: "DictSingle",
            path: "/crud/dict/single",
            component: "/crud/dict/single/index.vue"
          },
          {
            title: "分发复制",
            name: "DictCloneable",
            path: "/crud/dict/cloneable",
            component: "/crud/dict/cloneable/index.vue"
          },
          {
            title: "原型复制",
            name: "DictPrototype",
            path: "/crud/dict/prototype",
            component: "/crud/dict/prototype/index.vue"
          }
        ]
      },
      {
        title: "操作列",
        name: "row-handle",
        path: "/crud/row-handle",
        redirect: "/crud/row-handle/tooltip",
        meta: {
          icon: "ion:build-outline"
        },
        children: [
          {
            title: "Tooltip",
            name: "RowHandleTooltip",
            path: "/crud/row-handle/tooltip",
            component: "/crud/row-handle/tooltip/index.vue"
          },
          {
            title: "按钮折叠",
            name: "RowHandleDropdown",
            path: "/crud/row-handle/dropdown",
            component: "/crud/row-handle/dropdown/index.vue"
          }
        ]
      },
      {
        title: "组件示例",
        name: "component",
        path: "/crud/component",
        redirect: "/crud/component/text",
        meta: {
          icon: "ion:cube-outline"
        },
        children: [
          {
            title: "文本输入(input)",
            name: "ComponentText",
            path: "/crud/component/text",
            component: "/crud/component/text/index.vue"
          },
          {
            title: "选择(select)",
            name: "ComponentSelect",
            path: "/crud/component/select",
            component: "/crud/component/select/index.vue"
          },
          {
            title: "级联(cascader)",
            name: "ComponentCascader",
            path: "/crud/component/cascader",
            component: "/crud/component/cascader/index.vue"
          },
          {
            title: "多选(checkbox)",
            name: "ComponentCheckbox",
            path: "/crud/component/checkbox",
            component: "/crud/component/checkbox/index.vue"
          },
          {
            title: "单选(radio)",
            name: "ComponentRadio",
            path: "/crud/component/radio",
            component: "/crud/component/radio/index.vue"
          },
          {
            title: "开关(switch)",
            name: "ComponentSwitch",
            path: "/crud/component/switch",
            component: "/crud/component/switch/index.vue"
          },
          {
            title: "日期时间(date)",
            name: "ComponentDate",
            path: "/crud/component/date",
            component: "/crud/component/date/index.vue"
          },
          {
            title: "按钮链接",
            name: "ComponentButton",
            path: "/crud/component/button",
            component: "/crud/component/button/index.vue"
          },
          {
            title: "数字",
            name: "ComponentNumber",
            path: "/crud/component/number",
            component: "/crud/component/number/index.vue"
          },
          {
            title: "树形选择",
            name: "ComponentTree",
            path: "/crud/component/tree",
            component: "/crud/component/tree/index.vue"
          },
          {
            title: "图片裁剪上传",
            name: "ComponentUploaderCropper",
            path: "/crud/component/uploader/cropper",
            component: "/crud/component/uploader/cropper/index.vue"
          },
          {
            title: "表单本地上传",
            name: "ComponentUploaderForm",
            path: "/crud/component/uploader/form",
            component: "/crud/component/uploader/form/index.vue"
          },
          {
            title: "阿里云oss上传",
            name: "ComponentUploaderAlioss",
            path: "/crud/component/uploader/alioss",
            component: "/crud/component/uploader/alioss/index.vue"
          },
          {
            title: "腾讯云cos上传",
            name: "ComponentUploaderCos",
            path: "/crud/component/uploader/cos",
            component: "/crud/component/uploader/cos/index.vue"
          },
          {
            title: "七牛云上传",
            name: "ComponentUploaderQiniu",
            path: "/crud/component/uploader/qiniu",
            component: "/crud/component/uploader/qiniu/index.vue"
          },
          {
            title: "富文本编辑器",
            name: "ComponentEditor",
            path: "/crud/component/editor",
            component: "/crud/component/editor/index.vue"
          },
          {
            title: "图标",
            name: "ComponentIcon",
            path: "/crud/component/icon",
            component: "/crud/component/icon/index.vue"
          },
          {
            title: "JsonEditor",
            name: "ComponentJson",
            path: "/crud/component/json",
            component: "/crud/component/json/index.vue"
          }
        ]
      },
      {
        title: "Form表单",
        name: "form",
        path: "/crud/form",
        redirect: "/crud/form/layout",
        meta: {
          icon: "ion:document-text-outline"
        },
        children: [
          {
            title: "基本表单",
            name: "FormBase",
            path: "/crud/form/base",
            component: "/crud/form/base/index.vue"
          },
          {
            title: "表单Grid布局",
            name: "FormLayoutGrid",
            path: "/crud/form/layout-grid",
            component: "/crud/form/layout-grid/index.vue"
          },
          {
            title: "表单Flex布局",
            name: "FormLayoutFlex",
            path: "/crud/form/layout-flex",
            component: "/crud/form/layout-flex/index.vue"
          },
          {
            title: "表单动态布局",
            name: "FormLayout",
            path: "/crud/form/layout",
            component: "/crud/form/layout/index.vue"
          },
          {
            title: "表单校验",
            name: "FormValidation",
            path: "/crud/form/validation",
            component: "/crud/form/validation/index.vue"
          },
          {
            title: "抽屉表单",
            name: "FormDrawer",
            path: "/crud/form/drawer",
            component: "/crud/form/drawer/index.vue"
          },
          {
            title: "表单分组",
            name: "FormGroup",
            path: "/crud/form/group",
            component: "/crud/form/group/index.vue"
          },
          {
            title: "表单分组(tabs)",
            name: "FormGroupTabs",
            path: "/crud/form/group-tabs",
            component: "/crud/form/group-tabs/index.vue"
          },
          {
            title: "自定义表单",
            name: "FormCustomForm",
            path: "/crud/form/custom-form",
            component: "/crud/form/custom-form/index.vue"
          },
          {
            title: "字段帮助说明",
            name: "FormHelper",
            path: "/crud/form/helper",
            component: "/crud/form/helper/index.vue"
          },
          {
            title: "页面内部弹出表单",
            name: "FormInner",
            path: "/crud/form/inner",
            component: "/crud/form/inner/index.vue",
            meta: {
              cache: true
            }
          },
          {
            title: "地区字典管理",
            name: "FormInnerArea",
            path: "/crud/form/inner/area",
            component: "/crud/form/inner/area/index.vue",
            meta: {
              isMenu: false
            }
          },
          {
            title: "新页面编辑",
            name: "FormNewPage",
            path: "/crud/form/new-page",
            component: "/crud/form/new-page/index.vue",
            meta: {
              cache: false
            }
          },
          {
            title: "新页面编辑表单",
            name: "FormNewPageEdit",
            path: "/crud/form/new-page/edit",
            component: "/crud/form/new-page/edit.vue",
            meta: {
              isMenu: false
            }
          },
          {
            title: "独立使用表单",
            name: "FormIndependent",
            path: "/crud/form/independent",
            component: "/crud/form/independent/index.vue"
          },
          {
            title: "重置表单",
            name: "FormReset",
            path: "/crud/form/reset",
            component: "/crud/form/reset/index.vue"
          },
          {
            title: "嵌套数据结构",
            name: "FormNest",
            path: "/crud/form/nest",
            component: "/crud/form/nest/index.vue"
          }
        ]
      },
      {
        title: "表格特性",
        path: "/crud/feature",
        meta: {
          icon: "ion:beer-outline"
        },
        redirect: "/crud/feature/dropdown",
        children: [
          {
            title: "部件显隐",
            name: "FeatureHide",
            path: "/crud/feature/hide",
            component: "/crud/feature/hide/index.vue"
          },
          {
            title: "多选&批量删除",
            name: "FeatureSelection",
            path: "/crud/feature/selection",
            component: "/crud/feature/selection/index.vue"
          },
          {
            title: "单选",
            name: "FeatureSelectionRadio",
            path: "/crud/feature/selection-radio",
            component: "/crud/feature/selection-radio/index.vue"
          },
          {
            title: "表头过滤",
            name: "FeatureFilter",
            path: "/crud/feature/filter",
            component: "/crud/feature/filter/index.vue"
          },
          {
            title: "行展开",
            name: "FeatureExpand",
            path: "/crud/feature/expand",
            component: "/crud/feature/expand/index.vue"
          },
          {
            title: "树形表格",
            name: "FeatureTree",
            path: "/crud/feature/tree",
            component: "/crud/feature/tree/index.vue"
          },
          {
            title: "多级表头",
            name: "FeatureHeaderGroup",
            path: "/crud/feature/header-group",
            component: "/crud/feature/header-group/index.vue"
          },
          {
            title: "合并单元格",
            name: "FeatureMerge",
            path: "/crud/feature/merge",
            component: "/crud/feature/merge/index.vue"
          },
          {
            title: "序号",
            name: "FeatureIndex",
            path: "/crud/feature/index",
            component: "/crud/feature/index/index.vue"
          },
          {
            title: "排序",
            name: "FeatureSortable",
            path: "/crud/feature/sortable",
            component: "/crud/feature/sortable/index.vue"
          },
          {
            title: "固定列",
            name: "FeatureFixed",
            path: "/crud/feature/fixed",
            component: "/crud/feature/fixed/index.vue"
          },
          {
            title: "不固定高度",
            name: "FeatureHeight",
            path: "/crud/feature/height",
            component: "/crud/feature/height/index.vue"
          },
          {
            title: "可编辑",
            name: "FeatureEditable",
            path: "/crud/feature/editable",
            component: "/crud/feature/editable/index.vue"
          },
          {
            title: "行编辑",
            name: "FeatureEditableRow",
            path: "/crud/feature/editable-row",
            component: "/crud/feature/editable-row/index.vue"
          },
          {
            title: "查询框",
            name: "FeatureSearch",
            path: "/crud/feature/search",
            component: "/crud/feature/search/index.vue"
          },
          {
            title: "查询框多行模式",
            name: "FeatureSearchMulti",
            path: "/crud/feature/search-multi",
            component: "/crud/feature/search-multi/index.vue"
          },
          {
            title: "字段排序",
            name: "FeatureColumnSort",
            path: "/crud/feature/column-sort",
            component: "/crud/feature/column-sort/index.vue"
          },
          {
            title: "ValueBuilder",
            name: "FeatureValueBuilder",
            path: "/crud/feature/value-builder",
            component: "/crud/feature/value-builder/index.vue"
          },
          {
            title: "列设置",
            name: "FeatureColumnsSet",
            path: "/crud/feature/columns-set",
            component: "/crud/feature/columns-set/index.vue"
          },
          {
            title: "本地化编辑",
            name: "FeatureLocal",
            path: "/crud/feature/local",
            component: "/crud/feature/local/index.vue"
          },
          {
            title: "v-model",
            name: "FeatureVModel",
            path: "/crud/feature/v-model",
            component: "/crud/feature/local-v-model/index.vue"
          },
          {
            title: "自定义删除",
            name: "FeatureRemove",
            path: "/crud/feature/remove",
            component: "/crud/feature/remove/index.vue"
          },
          {
            title: "调整列宽",
            name: "FeatureColumnResize",
            path: "/crud/feature/column-resize",
            component: "/crud/feature/column-resize/index.vue"
          }
        ]
      },
      {
        title: "插槽",
        name: "Slots",
        path: "/crud/slots",
        redirect: "/crud/slots/layout",
        meta: {
          icon: "ion:extension-puzzle-outline"
        },
        children: [
          {
            title: "页面占位插槽",
            name: "SlotsLayout",
            path: "/crud/slots/layout",
            component: "/crud/slots/layout/index.vue"
          },
          {
            title: "表单占位插槽",
            name: "SlotsForm",
            path: "/crud/slots/form",
            component: "/crud/slots/form/index.vue"
          },
          {
            title: "查询字段插槽",
            name: "SlotsSearch",
            path: "/crud/slots/search",
            component: "/crud/slots/search/index.vue"
          },
          {
            title: "单元格插槽",
            name: "SlotsCell",
            path: "/crud/slots/cell",
            component: "/crud/slots/cell/index.vue"
          },
          {
            title: "表单字段插槽",
            name: "SlotsFormItem",
            path: "/crud/slots/form-item",
            component: "/crud/slots/form-item/index.vue"
          }
        ]
      },
      {
        title: "复杂需求",
        name: "Advanced",
        path: "/crud/advanced",
        redirect: "/crud/advanced/linkage",
        meta: {
          icon: "ion:flame-outline"
        },
        children: [
          {
            title: "选择联动",
            name: "AdvancedLinkage",
            path: "/crud/advanced/linkage",
            component: "/crud/advanced/linkage/index.vue"
          },
          {
            title: "后台加载crud",
            name: "AdvancedFormBackend",
            path: "/crud/advanced/from-backend",
            component: "/crud/advanced/from-backend/index.vue"
          },
          {
            title: "本地分页",
            name: "AdvancedLocalPagination",
            path: "/crud/advanced/local-pagination",
            component: "/crud/advanced/local-pagination/index.vue"
          },
          {
            title: "嵌套子表格",
            name: "AdvancedNest",
            path: "/crud/advanced/nest",
            component: "/crud/advanced/nest/index.vue"
          },
          {
            title: "对话框中显示crud",
            name: "AdvancedInDialog",
            path: "/crud/advanced/in-dialog",
            component: "/crud/advanced/in-dialog/index.vue"
          },
          {
            title: "大量数据",
            name: "AdvancedBigData",
            path: "/crud/advanced/big-data",
            component: "/crud/advanced/big-data/index.vue"
          }
        ]
      }
    ]
  }
];
