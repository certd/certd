const numbers = "0123456789";
const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const specials = "~!@#$%^*()_+-=[]{}|;:,./<>?";

type RandomStrOptions = true | string | { numbers?: false | string; letters?: false | string; specials?: boolean | string };

/**
 * Generate random string
 * @param {Number} length
 * @param {Object} options
 */
function randomStr(length?: number, options?: RandomStrOptions) {
  length ?? (length = 8);
  options ?? (options = {});

  let chars = "";
  let result = "";

  if (options === true) {
    chars = numbers + letters;
  } else if (typeof options === "string") {
    chars = options;
  } else {
    if (options.numbers !== false) {
      chars += typeof options.numbers === "string" ? options.numbers : numbers;
    }

    if (options.letters !== false) {
      chars += typeof options.letters === "string" ? options.letters : letters;
    }

    if (options.specials) {
      chars += typeof options.specials === "string" ? options.specials : specials;
    }
  }

  if (chars.length === 0) {
    throw new Error("randomStr requires at least one available character");
  }

  while (length > 0) {
    length--;
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export const RandomUtil = { randomStr };
