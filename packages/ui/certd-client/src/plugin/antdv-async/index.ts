import { defineAsyncComponent } from "vue";
import Input from "ant-design-vue/es/input/Input";
import Button from "ant-design-vue/es/button/button";
import Divider from "ant-design-vue/es/divider";
import Badge from "ant-design-vue/es/badge";
import Empty from "ant-design-vue/es/empty";
import Avatar from "ant-design-vue/es/avatar";
import Steps from "ant-design-vue/es/steps";
import Select from "ant-design-vue/es/select";
import PageHeader from "ant-design-vue/es/page-header";
import Card from "ant-design-vue/es/card";
export default {
  install(app: any) {
    app.use(Input);
    app.use(Button);
    app.use(Divider);
    app.use(Badge);
    app.use(Empty);
    app.use(Avatar);
    app.use(PageHeader);
    app.use(Steps);
    app.use(Select);
    app.use(Card);

    app.component(
      "AAutoComplete",
      defineAsyncComponent(() => import("ant-design-vue/es/auto-complete/index"))
    );
    app.component(
      "ARadio",
      defineAsyncComponent(() => import("ant-design-vue/es/radio/Radio"))
    );
    app.component(
      "ARadioGroup",
      defineAsyncComponent(() => import("ant-design-vue/es/radio/Group"))
    );
    app.component(
      "ATable",
      defineAsyncComponent(() => import("ant-design-vue/es/table/Table"))
    );
    app.component(
      "AModal",
      defineAsyncComponent(() => import("ant-design-vue/es/modal/Modal"))
    );
    app.component(
      "AForm",
      defineAsyncComponent(() => import("ant-design-vue/es/form/Form"))
    );
    app.component(
      "AFormItem",
      defineAsyncComponent(() => import("ant-design-vue/es/form/FormItem"))
    );
    app.component(
      "AFormItemRest",
      defineAsyncComponent(() => import("ant-design-vue/es/form/FormItemContext"))
    );

    app.component(
      "ATabs",
      defineAsyncComponent(() => import("ant-design-vue/es/tabs/src/Tabs"))
    );

    app.component(
      "ATabPane",
      defineAsyncComponent(() => import("ant-design-vue/es/tabs/src/TabPanelList/TabPane"))
    );
    app.component(
      "ATextarea",
      defineAsyncComponent(() => import("ant-design-vue/es/input/TextArea"))
    );
    app.component(
      "AInputNumber",
      defineAsyncComponent(() => import("ant-design-vue/es/input-number/index"))
    );
    app.component(
      "ADrawer",
      defineAsyncComponent(() => import("ant-design-vue/es/drawer/index"))
    );
    app.component(
      "ASwitch",
      defineAsyncComponent(() => import("ant-design-vue/es/switch/index"))
    );
    app.component(
      "AUpload",
      defineAsyncComponent(() => import("ant-design-vue/es/upload/index"))
    );
    app.component(
      "ADatePicker",
      defineAsyncComponent(() => import("ant-design-vue/es/date-picker/index"))
    );
    app.component(
      "ARangePicker",
      defineAsyncComponent(async () => {
        const { RangePicker } = await import("ant-design-vue/es/date-picker/index");
        return RangePicker;
      })
    );
    app.component(
      "ATimePicker",
      defineAsyncComponent(() => import("ant-design-vue/es/time-picker/index"))
    );
    app.component(
      "ATag",
      defineAsyncComponent(() => import("ant-design-vue/es/tag/index"))
    );
    app.component(
      "AAlert",
      defineAsyncComponent(() => import("ant-design-vue/es/alert/index"))
    );
    app.component(
      "AInputAutoComplete",
      defineAsyncComponent(() => import("ant-design-vue/es/auto-complete/index"))
    );

    app.component(
      "ACascader",
      defineAsyncComponent(() => import("ant-design-vue/es/cascader/index"))
    );
    app.component(
      "ACheckbox",
      defineAsyncComponent(() => import("ant-design-vue/es/checkbox"))
    );
    app.component(
      "ACheckboxGroup",
      defineAsyncComponent(() => import("ant-design-vue/es/checkbox/Group"))
    );
    app.component(
      "ACol",
      defineAsyncComponent(() => import("ant-design-vue/es/col"))
    );
    app.component(
      "ARow",
      defineAsyncComponent(() => import("ant-design-vue/es/row"))
    );
    app.component(
      "ADropdown",
      defineAsyncComponent(() => import("ant-design-vue/es/dropdown"))
    );
    app.component(
      "AGrid",
      defineAsyncComponent(() => import("ant-design-vue/es/grid"))
    );
    app.component(
      "AImage",
      defineAsyncComponent(() => import("ant-design-vue/es/image"))
    );
    app.component(
      "APagination",
      defineAsyncComponent(() => import("ant-design-vue/es/pagination"))
    );
    app.component(
      "ATooltip",
      defineAsyncComponent(() => import("ant-design-vue/es/tooltip"))
    );
    app.component(
      "ATree",
      defineAsyncComponent(() => import("ant-design-vue/es/tree"))
    );
    app.component(
      "ATreeSelect",
      defineAsyncComponent(() => import("ant-design-vue/es/tree-select"))
    );
    app.component(
      "ATour",
      defineAsyncComponent(() => import("ant-design-vue/es/tour"))
    );

    app.component(
      "AMenu",
      defineAsyncComponent(() => import("ant-design-vue/es/menu/index"))
    );
    app.component(
      "ASubMenu",
      defineAsyncComponent(() => import("ant-design-vue/es/menu/src/SubMenu"))
    );
    app.component(
      "AMenuItem",
      defineAsyncComponent(() => import("ant-design-vue/es/menu/src/MenuItem"))
    );

    app.component(
      "AProgress",
      defineAsyncComponent(() => import("ant-design-vue/es/progress"))
    );
    app.component(
      "ATimelineItem",
      defineAsyncComponent(() => import("ant-design-vue/es/timeline/TimelineItem"))
    );
    app.component(
      "ATimeline",
      defineAsyncComponent(() => import("ant-design-vue/es/timeline/Timeline"))
    );
    app.component(
      "APageHeader",
      defineAsyncComponent(() => import("ant-design-vue/es/page-header/index"))
    );
    app.component(
      "APopover",
      defineAsyncComponent(() => import("ant-design-vue/es/popover"))
    );
    app.component(
      "APopconfirm",
      defineAsyncComponent(() => import("ant-design-vue/es/popconfirm"))
    );
    app.component(
      "ACollapse",
      defineAsyncComponent(() => import("ant-design-vue/es/collapse"))
    );
    app.component(
      "ADescriptions",
      defineAsyncComponent(() => import("ant-design-vue/es/descriptions"))
    );
    app.component(
      "ADescriptionsItem",
      defineAsyncComponent(async () => {
        const m = await import("ant-design-vue/es/descriptions/");
        return m.DescriptionsItem;
      })
    );
    app.component(
      "AResult",
      defineAsyncComponent(() => import("ant-design-vue/es/result"))
    );

    app.component(
      "ATableSummaryCell",
      defineAsyncComponent(() => import("ant-design-vue/es/vc-table/Cell/index"))
    );
    app.component(
      "ATableSummaryRow",
      defineAsyncComponent(() => import("ant-design-vue/es/vc-table/Footer/Row"))
    );
    app.component(
      "ATableSummary",
      defineAsyncComponent(() => import("ant-design-vue/es/vc-table/Footer/Summary"))
    );
  }
};
