// @ts-nocheck
/**
 * ACME logger
 */

import debugg from 'debug'
const debug = debugg('acme-client');

let logger = () => {};

/**
 * Set logger function
 *
 * @param {function} fn Logger function
 */

export const setLogger = (fn) => {
    logger = fn;
};

/**
 * Log message
 *
 * @param {string} msg Message
 */

export const  log = (...msg) => {
    debug(...msg);
    logger(...msg);
};
