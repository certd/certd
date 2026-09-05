import { Constants } from "../constants.js";
import { BaseException } from "./base-exception.js";
/**
 */
export class SiteOffException extends BaseException {
  constructor(message) {
    super("SiteOffException", Constants.res.siteOff.code, message ? message : Constants.res.siteOff.message);
  }
}
