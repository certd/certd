/**
 * [x]-col的配置
 */
export type ColProps = {
  span?: number;
  [props: string]: any;
};

export type FormItemProps = {
  /**
   * 字段label
   */
  title?: string;
  /**
   * 表单字段组件配置
   */
  component?: ComponentProps;
  /**
   * 表单字段 [a|el|n]-col的配置
   * 一般用来配置跨列：{span:24} 占满一行
   */
  col?: ColProps;
  /**
   * 默认值
   */
  value?: any;
  /**
   * 帮助提示配置
   */
  helper?: string | FormItemHelperProps;
  /**
   * 排序号
   */
  order?: number;
  /**
   * 是否显示此字段
   */
  show?: boolean;
  /**
   * 是否是空白占位栏
   */
  blank?: boolean;

  [key: string]: any;
};

/**
 * 表单字段帮助说明配置
 */
export type FormItemHelperProps = {
  /**
   * 自定义渲染帮助说明
   * @param scope
   */
  render?: (scope: any) => any;
  /**
   * 帮助文本
   */
  text?: string;
  /**
   * 帮助说明所在的位置，[ undefined | label]
   */
  position?: string;
  /**
   * [a|el|n]-tooltip配置
   */
  tooltip?: object;

  [key: string]: any;
};

/**
 * 组件配置
 */
export type ComponentProps = {
  /**
   * 组件的名称
   */
  name?: string | object;
  /**
   * vmodel绑定的目标属性名
   */
  vModel?: string;

  /**
   * 当原始组件名的参数被以上属性名占用时，可以配置在这里
   * 例如:原始组件有一个叫name的属性，你想要配置它，则可以按如下配置
   * ```
   * component:{
   *   name:"组件的名称"
   *   props:{
   *     name:"组件的name属性"  <-----------
   *   }
   * }
   * ```
   */
  props?: {
    [key: string]: any;
  };

  /**
   * 组件事件监听
   */
  on?: {
    [key: string]: (context?: any) => void;
  };

  /**
   * 组件其他参数
   * 事件：onXxx:(event)=>void 组件原始事件监听
   *      on.onXxx:(context)=>void 组件事件监听(对原始事件包装)
   * 样式：style、class等
   */
  [key: string]: any;
};
