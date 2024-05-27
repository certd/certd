import crypto from 'crypto';
function hmacsha256(keyByte: any, message: any) {
  return crypto
    .createHmac('SHA256', keyByte)
    .update(message)
    .digest()
    .toString('hex');
}
function HexEncodeSHA256Hash(body: any) {
  return crypto.createHash('SHA256').update(body).digest().toString('hex');
}
const Algorithm = 'SDK-HMAC-SHA256';
const HeaderXDate = 'X-Sdk-Date';
const HeaderAuthorization = 'Authorization';
const HeaderContentSha256 = 'x-sdk-content-sha256';

const hexTable = new Array(256);
for (let i = 0; i < 256; ++i)
  hexTable[i] = '%' + ((i < 16 ? '0' : '') + i.toString(16)).toUpperCase();

const noEscape = [
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0, // 0 - 15
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0, // 16 - 31
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  0, // 32 - 47
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  0,
  0,
  0,
  0,
  0,
  0, // 48 - 63
  0,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1, // 64 - 79
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  0,
  0,
  0,
  0,
  1, // 80 - 95
  0,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1, // 96 - 111
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  1,
  0,
  0,
  0,
  1,
  0, // 112 - 127
];

// function urlEncode is based on https://github.com/nodejs/node/blob/master/lib/querystring.js
// Copyright Joyent, Inc. and other Node contributors.
function urlEncode(str: any) {
  if (typeof str !== 'string') {
    if (typeof str === 'object') str = String(str);
    else str += '';
  }
  let out = '';
  let lastPos = 0;

  for (let i = 0; i < str.length; ++i) {
    let c = str.charCodeAt(i);

    // ASCII
    if (c < 0x80) {
      if (noEscape[c] === 1) continue;
      if (lastPos < i) out += str.slice(lastPos, i);
      lastPos = i + 1;
      out += hexTable[c];
      continue;
    }

    if (lastPos < i) out += str.slice(lastPos, i);

    // Multi-byte characters ...
    if (c < 0x800) {
      lastPos = i + 1;
      out += hexTable[0xc0 | (c >> 6)] + hexTable[0x80 | (c & 0x3f)];
      continue;
    }
    if (c < 0xd800 || c >= 0xe000) {
      lastPos = i + 1;
      out +=
        hexTable[0xe0 | (c >> 12)] +
        hexTable[0x80 | ((c >> 6) & 0x3f)] +
        hexTable[0x80 | (c & 0x3f)];
      continue;
    }
    // Surrogate pair
    ++i;

    if (i >= str.length) throw new Error('ERR_INVALID_URI');

    const c2 = str.charCodeAt(i) & 0x3ff;

    lastPos = i + 1;
    c = 0x10000 + (((c & 0x3ff) << 10) | c2);
    out +=
      hexTable[0xf0 | (c >> 18)] +
      hexTable[0x80 | ((c >> 12) & 0x3f)] +
      hexTable[0x80 | ((c >> 6) & 0x3f)] +
      hexTable[0x80 | (c & 0x3f)];
  }
  if (lastPos === 0) return str;
  if (lastPos < str.length) return out + str.slice(lastPos);
  return out;
}

function findHeader(r: any, header: any) {
  for (const k in r.headers) {
    if (k.toLowerCase() === header.toLowerCase()) {
      return r.headers[k];
    }
  }
  return null;
}

// Build a CanonicalRequest from a regular request string
//
// CanonicalRequest =
//  HTTPRequestMethod + '\n' +
//  CanonicalURI + '\n' +
//  CanonicalQueryString + '\n' +
//  CanonicalHeaders + '\n' +
//  SignedHeaders + '\n' +
//  HexEncode(Hash(RequestPayload))
function CanonicalRequest(r: any, signedHeaders: any) {
  let hexencode = findHeader(r, HeaderContentSha256);
  if (hexencode === null) {
    const data = RequestPayload(r);
    hexencode = HexEncodeSHA256Hash(data);
  }
  return (
    r.method +
    '\n' +
    CanonicalURI(r) +
    '\n' +
    CanonicalQueryString(r) +
    '\n' +
    CanonicalHeaders(r, signedHeaders) +
    '\n' +
    signedHeaders.join(';') +
    '\n' +
    hexencode
  );
}

function CanonicalURI(r: any) {
  const pattens = r.uri.split('/');
  const uri = [];
  for (const k in pattens) {
    const v = pattens[k];
    uri.push(urlEncode(v));
  }
  let urlpath = uri.join('/');
  if (urlpath[urlpath.length - 1] !== '/') {
    urlpath = urlpath + '/';
  }
  //r.uri = urlpath
  return urlpath;
}

function CanonicalQueryString(r: any) {
  const keys = [];
  for (const key in r.query) {
    keys.push(key);
  }
  keys.sort();
  const a = [];
  for (const i in keys) {
    const key = urlEncode(keys[i]);
    const value = r.query[keys[i]];
    if (Array.isArray(value)) {
      value.sort();
      for (const iv in value) {
        a.push(key + '=' + urlEncode(value[iv]));
      }
    } else {
      a.push(key + '=' + urlEncode(value));
    }
  }
  return a.join('&');
}

function CanonicalHeaders(r: any, signedHeaders: any) {
  const headers: any = {};
  for (const key in r.headers) {
    headers[key.toLowerCase()] = r.headers[key];
  }
  const a = [];
  for (const i in signedHeaders) {
    const value = headers[signedHeaders[i]];
    a.push(signedHeaders[i] + ':' + value.trim());
  }
  return a.join('\n') + '\n';
}

function SignedHeaders(r: any) {
  const a = [];
  for (const key in r.headers) {
    a.push(key.toLowerCase());
  }
  a.sort();
  return a;
}

function RequestPayload(r: any) {
  return r.body;
}

// Create a "String to Sign".
function StringToSign(canonicalRequest: any, t: any) {
  const bytes = HexEncodeSHA256Hash(canonicalRequest);
  return Algorithm + '\n' + t + '\n' + bytes;
}

// Create the HWS Signature.
function SignStringToSign(stringToSign: any, signingKey: any) {
  return hmacsha256(signingKey, stringToSign);
}

// Get the finalized value for the "Authorization" header.  The signature
// parameter is the output from SignStringToSign
function AuthHeaderValue(signature: any, Key: any, signedHeaders: any) {
  return (
    Algorithm +
    ' Access=' +
    Key +
    ', SignedHeaders=' +
    signedHeaders.join(';') +
    ', Signature=' +
    signature
  );
}

function twoChar(s: any) {
  if (s >= 10) {
    return '' + s;
  } else {
    return '0' + s;
  }
}

function getTime() {
  const date = new Date();
  return (
    '' +
    date.getUTCFullYear() +
    twoChar(date.getUTCMonth() + 1) +
    twoChar(date.getUTCDate()) +
    'T' +
    twoChar(date.getUTCHours()) +
    twoChar(date.getUTCMinutes()) +
    twoChar(date.getUTCSeconds()) +
    'Z'
  );
}

export class SigHttpRequest {
  method = '';
  host = '';
  uri = '';
  query: any = {};
  headers: any = {};
  body = '';

  constructor(method: any, url: any, headers: any, body: any) {
    if (method === undefined) {
      this.method = '';
    } else {
      this.method = method;
    }
    if (url === undefined) {
      this.host = '';
      this.uri = '';
      this.query = {};
    } else {
      this.query = {};
      let host, path;
      let i = url.indexOf('://');
      if (i !== -1) {
        url = url.substr(i + 3);
      }
      i = url.indexOf('?');
      if (i !== -1) {
        const query_str = url.substr(i + 1);
        url = url.substr(0, i);
        const spl = query_str.split('&');
        for (const i in spl) {
          const kv = spl[i];
          const index = kv.indexOf('=');
          let key, value;
          if (index >= 0) {
            key = kv.substr(0, index);
            value = kv.substr(index + 1);
          } else {
            key = kv;
            value = '';
          }
          if (key !== '') {
            key = decodeURI(key);
            value = decodeURI(value);
            if (this.query[key] === undefined) {
              this.query[key] = [value];
            } else {
              this.query[key].push(value);
            }
          }
        }
      }
      i = url.indexOf('/');
      if (i === -1) {
        host = url;
        path = '/';
      } else {
        host = url.substr(0, i);
        path = url.substr(i);
      }
      this.host = host;
      this.uri = decodeURI(path);
    }
    if (headers === undefined) {
      this.headers = {};
    } else {
      this.headers = headers;
    }
    if (body === undefined) {
      this.body = '';
    } else {
      this.body = body;
    }
  }
}
export class Signer {
  Key = '';
  Secret = '';
  constructor(Key: any, Secret: any) {
    this.Key = Key;
    this.Secret = Secret;
  }

  Sign(r: any) {
    let headerTime = findHeader(r, HeaderXDate);
    if (headerTime === null) {
      headerTime = getTime();
      r.headers[HeaderXDate] = headerTime;
    }
    if (r.method !== 'PUT' && r.method !== 'PATCH' && r.method !== 'POST') {
      r.body = '';
    }
    let queryString = CanonicalQueryString(r);
    if (queryString !== '') {
      queryString = '?' + queryString;
    }
    const options = {
      hostname: r.host,
      path: encodeURI(r.uri) + queryString,
      method: r.method,
      headers: r.headers,
    };
    if (findHeader(r, 'host') === null) {
      r.headers.host = r.host;
    }
    const signedHeaders = SignedHeaders(r);
    const canonicalRequest = CanonicalRequest(r, signedHeaders);
    const stringToSign = StringToSign(canonicalRequest, headerTime);
    const signature = SignStringToSign(stringToSign, this.Secret);
    options.headers[HeaderAuthorization] = AuthHeaderValue(
      signature,
      this.Key,
      signedHeaders
    );
    return options;
  }
}
