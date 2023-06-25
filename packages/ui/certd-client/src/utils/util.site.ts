import { env } from "./util.env";
export const site = {
  /**
   * @description 更新标题
   * @param titleText
   */
  title: function (titleText: string) {
    const processTitle = env.TITLE || "FsAdmin";
    window.document.title = `${processTitle}${titleText ? ` | ${titleText}` : ""}`;
  }
};
