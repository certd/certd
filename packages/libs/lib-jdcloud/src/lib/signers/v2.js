// Copyright 2018 JDCLOUD.COM
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License
// This signer is modified from AWS V4 signer algorithm.

var util = require("../util");
var RequestSigner = require("./request_signer");
var v2Credentials = require("./v2_credentials");
var uuid = require("uuid");
var JDCloud = require("../core");

module.exports = class SignerV2 extends RequestSigner {
  constructor(request, serviceName, options = {}) {
    super(request);
    this.signatureCache = true;
    this.algorithm = "JDCLOUD2-HMAC-SHA256";
    this.unsignableHeaders = ["authorization", "user-agent"];
    this.serviceName = serviceName;
    // this.signatureCache = typeof options.signatureCache === 'boolean' ? options.signatureCache : true;
  }

  // 签名流程见 https://docs.aws.amazon.com/AmazonS3/latest/API/sig-v4-header-based-auth.html

  addAuthorization(credentials, date) {
    // var datetime = '20180119T070300Z';
    var datetime = util.date.iso8601(date).replace(/[:-]|\.\d{3}/g, "");
    this.addHeaders(credentials, datetime);
    this.request.request.headers.set("Authorization", this.authorization(credentials, datetime));
  }

  addHeaders(credentials, datetime) {
    this.request.request.headers.set("x-jdcloud-date", datetime);
    this.request.request.headers.set("x-jdcloud-nonce", uuid.v4());
    this.request.request.headers.set("host", this.request.service.config.endpoint.host);
  }

  signedHeaders() {
    var keys = [];
    this.request.request.headers.forEach((value, key) => {
      key = key.toLowerCase();
      if (this.isSignableHeader(key)) {
        keys.push(key);
      }
    });
    /* util.each.call(this, this.request.headers, function (key) {

        }); */
    return keys.sort().join(";");
  }

  credentialString(datetime) {
    return v2Credentials.createScope(datetime.substr(0, 8), this.request.regionId, this.serviceName);
  }

  signature(credentials, datetime) {
    var signingKey = v2Credentials.getSigningKey(credentials, datetime.substr(0, 8), this.request.regionId, this.serviceName, this.signatureCache);
    return util.crypto.hmac(signingKey, this.stringToSign(datetime), "hex");
  }

  stringToSign(datetime) {
    var parts = [];
    parts.push(this.algorithm);
    parts.push(datetime);
    parts.push(this.credentialString(datetime));
    parts.push(this.hexEncodedHash(this.canonicalString()));
    JDCloud.config.logger("StringToSign is \n" + JSON.stringify(parts), "DEBUG");
    return parts.join("\n");
  }

  // 构建标准签名字符串
  canonicalString() {
    var parts = [];
    var pathname = this.request.path;
    //    if (this.serviceName !== 'jfs') {
    //      pathname = util.uriEscapePath(pathname)
    //    }

    parts.push(this.request.request.method);
    parts.push(pathname);
    parts.push(this.request.search());
    parts.push(this.canonicalHeaders() + "\n");
    parts.push(this.signedHeaders());
    parts.push(this.hexEncodedBodyHash());
    JDCloud.config.logger("canonicalString is \n" + JSON.stringify(parts), "DEBUG");
    return parts.join("\n");
  }

  canonicalHeaders() {
    var headers = [];
    this.request.request.headers.forEach((value, key) => {
      headers.push([key, value]);
    });
    headers.sort(function (a, b) {
      return a[0].toLowerCase() < b[0].toLowerCase() ? -1 : 1;
    });
    var parts = [];
    util.arrayEach.call(this, headers, function (item) {
      var key = item[0].toLowerCase();
      if (this.isSignableHeader(key)) {
        var value = item[1];
        if (typeof value === "undefined" || value === null || typeof value.toString !== "function") {
          throw util.error(new Error("Header " + key + " contains invalid value"), {
            code: "InvalidHeader",
          });
        }
        parts.push(key + ":" + this.canonicalHeaderValues(value.toString()));
      }
    });
    return parts.join("\n");
  }

  canonicalHeaderValues(values) {
    return values.replace(/\s+/g, " ").replace(/^\s+|\s+$/g, "");
  }

  authorization(credentials, datetime) {
    var parts = [];
    var credString = this.credentialString(datetime);
    parts.push(this.algorithm + " Credential=" + credentials.accessKeyId + "/" + credString);
    parts.push("SignedHeaders=" + this.signedHeaders());
    parts.push("Signature=" + this.signature(credentials, datetime));
    JDCloud.config.logger("Signature is \n" + JSON.stringify(parts), "DEBUG");
    return parts.join(", ");
  }

  hexEncodedHash(string) {
    return util.crypto.sha256(string, "hex");
  }

  hexEncodedBodyHash() {
    return this.hexEncodedHash(this.request.request.body || "");
    /* var request = this.request;
        if (this.isPresigned() && this.serviceName === 's3' && !request.body) {
            return 'UNSIGNED-PAYLOAD';
        } else if (request.headers['X-Amz-Content-Sha256']) {
            return request.headers['X-Amz-Content-Sha256'];
        } else {
            return this.hexEncodedHash(this.request.body || '');
        } */
  }

  isSignableHeader(key) {
    if (key.toLowerCase().includes("x-jdcloud-")) {
      return true;
    }
    return !this.unsignableHeaders.includes(key.toLowerCase());
  }
};
