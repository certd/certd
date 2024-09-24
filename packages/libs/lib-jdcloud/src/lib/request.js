var JDCloud = require("./core");

let util = JDCloud.util;
JDCloud.JCRequest = class JCRequest {
  constructor(service, path, httpMethod, pathParams, queryParams, headerParams, formParams, postBody, contentTypes, accepts, returnType) {
    this.service = service;

    var endpoint = service.config.endpoint;
    pathParams.regionId = pathParams.regionId || service.config.regionId;
    this.regionId = pathParams.regionId;

    this.path = this.buildPath(path, pathParams);
    this.path = util.uriEscapePath(this.path);

    var queryString = this.buildQuery(queryParams);

    var url = this.path;
    if (queryString) {
      url = this.path + "?" + queryString;
    }

    var contentType = this.jsonPreferredMime(contentTypes) || "application/json";
    headerParams["content-type"] = contentType;
    var requestHeaders = this.buildHeaders(headerParams);

    var requestInit = {
      method: httpMethod || "GET",
      headers: requestHeaders,
    };

    if (contentType === "application/x-www-form-urlencoded") {
    } else if (contentType === "multipart/form-data") {
    } else if (postBody) {
      requestInit.body = JSON.stringify(postBody);
    }
    var fetchUrl = endpoint.protocol + "://" + endpoint.host + url;
    JDCloud.config.logger(`make request where url is :${fetchUrl} \nwith fetch config:${JSON.stringify(requestInit)}`);
    this.request = new JDCloud.fetch.Request(fetchUrl, requestInit);
    this.request.bodyCache = requestInit.body;
  }

  buildPath(path, pathParams) {
    var uri = (this.service.config.basePath || "") + path;
    uri = uri.replace(/\{([\w-]+)\}/g, (fullMatch, key) => {
      var value;
      if (pathParams.hasOwnProperty(key)) {
        value = pathParams[key];
      } else {
        value = fullMatch;
      }
      return value;
    });
    return uri;
  }

  buildQuery(queryParams) {
    var queryParamsWithoutEmptyItem = {};
    var keys = Object.keys(queryParams);
    for (let key of keys) {
      if (queryParams[key] !== undefined) {
        queryParamsWithoutEmptyItem[key] = queryParams[key];
      }
    }
    return JDCloud.util.querystring.stringify(queryParamsWithoutEmptyItem);
  }

  search() {
    var query = this.request.url.split("?", 2)[1];
    if (query) {
      query = JDCloud.util.querystring.parse(query);
      return JDCloud.util.queryParamsToString(query);
    }
    return "";
  }

  digitizationArray(key, obj) {
    var result = key;
    if (Array.isArray(obj)) {
      JDCloud.util.arrayEach(obj, (arrayValue, index) => {
        result += this.digitizationArray(`.${index + 1}`, arrayValue);
      });
    } else if (typeof obj === "object" && obj != null) {
      JDCloud.util.each(obj, (key, ObjValue) => {
        result += `.name=${key}&${result}.values` + this.digitizationArray();
        result += key + ".name=" + ObjValue + "&" + this.digitizationArray(key + ".values", ObjValue);
      });
    } else {
      result += key + "=" + encodeURI(obj);
    }
    return result;
  }

  buildHeaders(headerParams) {
    var headers = new JDCloud.fetch.Headers({
      accept: "application/json",
    });

    util.each.call(this, headerParams, function (key) {
      if (headerParams[key] !== undefined && headerParams[key] != null) {
        headers.append(key, headerParams[key]);
      }
    });
    return headers;
  }

  /**
   * Checks whether the given content type represents JSON.<br>
   * JSON content type examples:<br>
   * <ul>
   * <li>application/json</li>
   * <li>application/json; charset=UTF8</li>
   * <li>APPLICATION/JSON</li>
   * </ul>
   * @param {String} contentType The MIME content type to check.
   * @returns {Boolean} <code>true</code> if <code>contentType</code> represents JSON, otherwise <code>false</code>.
   */
  isJsonMime(contentType) {
    return Boolean(contentType != null && contentType.match(/^application\/json(;.*)?$/i));
  }

  /**
   * Chooses a content type from the given array, with JSON preferred; i.e. return JSON if included, otherwise return the first.
   * @param {Array.<String>} contentTypes
   * @returns {String} The chosen content type, preferring JSON.
   */
  jsonPreferredMime(contentTypes) {
    for (var i = 0; i < contentTypes.length; i++) {
      if (this.isJsonMime(contentTypes[i])) {
        return contentTypes[i];
      }
    }

    return contentTypes[0];
  }
};

module.exports = JDCloud.JCRequest;
