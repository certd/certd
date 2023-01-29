import { uiContext } from "@fast-crud/fast-crud";

export default function ({ expose }) {
  return {
    crudOptions: {
      mode:{
        name:'local',
        isMergeWhenUpdate:true,
        isAppendWhenAdd:true
      },
      search: {
        show: false
      },
      toolbar:{
        show:false,
      },
      pagination:{
        show:false
      },
      columns: {
        name: {
          type: "text",
          title: "联系人姓名"
        },
        mobile: {
          type: "text",
          title: "联系人手机号码"
        }
      }
    }
  };
}
