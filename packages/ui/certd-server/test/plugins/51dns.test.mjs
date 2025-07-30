import CryptoJS from 'crypto-js'

function aes(val) {
  var k = CryptoJS.enc.Utf8.parse('1234567890abcDEF');
  var iv = CryptoJS.enc.Utf8.parse('1234567890abcDEF');
  const enc = CryptoJS.AES.encrypt(val, k, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.ZeroPadding
  }).toString();
  return enc;
}


import axios from 'axios'

const instance = axios.create({
  baseURL: 'https://www.51dns.com',
  timeout: 5000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  }
})

async function login() {

  const res = await instance.request({
    url: 'https://www.51dns.com/login.html',
    method: 'get',
    headers: {
      // 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.95 Safari/537.36',
      'Origin': 'https://www.51dns.com',
      'Referer': 'https://www.51dns.com',
    }
  })

  //提取 var csrfToken = "ieOfM21eDd9nWJv3OZtMJF6ogDsnPKQHJ17dlMck";
  const _token = res.data.match(/var csrfToken = "(.*?)"/)[1]
  console.log(_token)
  console.log(res.headers)


  const setCookie = res.headers['set-cookie']
  const cookie = setCookie.map(item => {
    return item.split(';')[0]
  }).join(';')


  var obj = {
    'email_or_phone': aes(""),
    'password': aes(""),
    'type': aes('account'),
    'redirectTo': 'https://www.51dns.com/domain',
    '_token': _token
  }
  // console.log(JSON.stringify(obj, null, 2)) // Avoid logging sensitive data
  const res2 = await instance.request({
    url: 'https://www.51dns.com/login',
    method: 'post',
    data: {
      ...obj
    },
    headers: {
      /**
       * Origin:
       * https://www.51dns.com
       * Referer:
       * https://www.51dns.com/login.html
       * User-Agent:
       * Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.95 Safari/537.36
       // __root_domain_v=.51dns.com;
       */

      // 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.95 Safari/537.36',
      'Origin': 'https://www.51dns.com',
      'Referer': 'https://www.51dns.com/login.html',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookie,
      //X-Requested-With:
      // XMLHttpRequest
      'X-Requested-With': 'XMLHttpRequest'
    }
  })

  console.log(res2.headers)
  if (res2.data.code == 0) {
    console.log("登录成功")
  }

  const setCookie2 = res2.headers['set-cookie']
  const cookie2 = setCookie2.map(item => {
    return item.split(';')[0]
  }).join(';')

  //
  // // console.log(res2.data)
  // // 提取 <span class="user_email">182****43522</span><br>
  // console.log(res2.data.match(/<span class="user_email">(.*?)<\/span>/)[1])
  // const success1 = res2.data.includes('<span class="nav-title">DNS解析</span>')
  // console.log("success", success1)


  const res3 = await instance.request({
    url: 'https://www.51dns.com/domain',
    method: 'get',
    withCredentials: true,
    headers: {
      // 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.95 Safari/537.36',
      'Origin': 'https://www.51dns.com',
      'Referer': 'https://www.51dns.com/login.html',
      'Cookie': cookie2,
    }
  })

  console.log(res3.statusText)
  console.log(res3.headers)
  const success2 = res3.data.includes('<span class="nav-title">DNS解析</span>')
  console.log("success", success2)


  /**
   * <a target="_blank" href="https://www.51dns.com/domain/record/193341603"
   *                                        class="color47">certd.top</a>

   */
    //上面文本中间有换行，需要提取 193341603 部分,必须有certd.top,使用 new Regexp, .号要能匹配换行符，非贪婪模式
  const regExp = new RegExp('<a target="_blank" href="https://www.51dns.com/domain/record/(\\d+)"[^>]*>certd\\.top<\\/a>',"i");

  const domainId = res3.data.match(regExp)[1]


  console.log("domainId", domainId)
}

login()
