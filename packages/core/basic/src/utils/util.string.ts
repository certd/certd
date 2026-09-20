import dayjs from "dayjs";

export const stringUtils = {
  replaceTemplate(target: string, body: Record<string, unknown>, urlEncode = false) {
    let bodyStr = target;
    for (const key of Object.keys(body)) {
      const rawValue = body[key] == null ? "" : String(body[key]);
      let value = urlEncode ? encodeURIComponent(rawValue) : rawValue;
      value = value.replace(/[\u0000-\u001f]/g, char => {
        const escapes: Record<string, string> = { "\b": "\\b", "\f": "\\f", "\n": "\\n", "\r": "\\r", "\t": "\\t" };
        return escapes[char] ?? `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`;
      });
      bodyStr = bodyStr.replaceAll(`\${${key}}`, value);
      bodyStr = bodyStr.replaceAll(`{${key}}`, value);
    }
    return bodyStr;
  },

  maxLength(str?: string, length = 100) {
    if (str) {
      return str.length > length ? str.slice(0, length) + "..." : str;
    }
    return "";
  },

  appendTimeSuffix(str?: string) {
    if (str) {
      return `${str}-${dayjs().format("YYYYMMDDHHmmssSSS")}`;
    }
    return "";
  },
};
