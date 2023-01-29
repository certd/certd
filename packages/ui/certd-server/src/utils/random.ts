const numbers = '0123456789';
const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const specials = '~!@#$%^*()_+-=[]{}|;:,./<>?';

/**
 * Generate random string
 * @param {Number} length
 * @param {Object} options
 */
function randomStr(length, options) {
  length || (length = 8);
  options || (options = {});

  let chars = '';
  let result = '';

  if (options === true) {
    chars = numbers + letters;
  } else if (typeof options === 'string') {
    chars = options;
  } else {
    if (options.numbers !== false) {
      chars += typeof options.numbers === 'string' ? options.numbers : numbers;
    }

    if (options.letters !== false) {
      chars += typeof options.letters === 'string' ? options.letters : letters;
    }

    if (options.specials) {
      chars +=
        typeof options.specials === 'string' ? options.specials : specials;
    }
  }

  while (length > 0) {
    length--;
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export const RandomUtil = { randomStr };
