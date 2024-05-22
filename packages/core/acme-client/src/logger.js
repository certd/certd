/**
 * ACME logger
 */

const debug = require('debug')('acme-client');

let logger = () => {};

/**
 * Set logger function
 *
 * @param {function} fn Logger function
 */

exports.setLogger = (fn) => {
    logger = fn;
};

/**
 * Log message
 *
 * @param {string} msg Message
 */

exports.log = (msg) => {
    debug(msg);
    logger(msg);
};
