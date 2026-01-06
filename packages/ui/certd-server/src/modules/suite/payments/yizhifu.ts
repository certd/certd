import { logger, utils } from "@certd/basic";
import { IPaymentProvider, TradeEntity, UpdateTrade, UpdateTradeInfo } from "@certd/commercial-core";
import dayjs from "dayjs";
import { YizhifuAccess } from "../../../plugins/plugin-plus/yizhifu/access.js";

export class PaymentYizhifu implements IPaymentProvider {
  access: YizhifuAccess;
  constructor(access: YizhifuAccess) {
    this.access = access;
  }

  async getDetail(tradeNo: string): Promise<UpdateTradeInfo> {
    /**
     * http://pay.docmirror.cn/api.php?act=order&pid={商户ID}&key={商户密钥}&out_trade_no={商户订单号}
     *
     * 请求参数说明：
     *
     * 字段名	变量名	必填	类型	示例值	描述
     * 操作类型	act	是	String	order	此API固定值
     * 商户ID	pid	是	Int	1001
     * 商户密钥	key	是	String	89unJUB8HZ54Hj7x4nUj56HN4nUzUJ8i
     * 系统订单号	trade_no	选择	String	20160806151343312
     * 商户订单号	out_trade_no	选择	String	20160806151343349
     */

    const paymentReq = {
      pid: this.access.pid,
      act: "order",
      key: this.access.key,
      out_trade_no: tradeNo,
    };
    let url = this.access.url;
    if (url.endsWith("/")) {
      url = url.substring(0, url.length - 1);
    }
    const res = await utils.http.request({
      url: url + "/api.php",
      method: "get",
      params: paymentReq,
    });

    if (res.code !== 1) {
      throw new Error(res.msg);
    }

    if (res.status !== "1") {
      throw new Error("该订单还未支付");
    }
    /**
     * 易支付订单号	trade_no	String	2016080622555342651	袖手科技聚合支付平台订单号
     * 商户订单号	out_trade_no	String	20160806151343349	商户系统内部的订单号
     * 第三方订单号	api_trade_no	String	20160806151343349	支付宝微信等接口方订单号
     * 支付方式	type	String	alipay	支付方式列表
     * 商户ID	pid	Int	1001	发起支付的商户ID
     * 创建订单时间	addtime	String	2016-08-06 22:55:52
     * 完成交易时间	endtime	String	2016-08-06 22:55:52
     * 商品名称	name	String	VIP会员
     * 商品金额	money	String	1.00
     * 支付状态	status	Int	0	1为支付成功，0为未支付
     * 业务扩展参数	param	String		默认留空
     * 支付者账号	buyer	String		默认留空
     */

    let status: string = null;
    let payTime: number = null;
    if (res.status === "1") {
      status = "paid";
      payTime = dayjs(res.endtime).valueOf();
    } else {
      throw new Error("订单未支付");
    }

    return {
      tradeNo: res.out_trade_no,
      payNo: res.trade_no,
      remark: "支付类型：" + res.type,
      amount: utils.amount.toCent(parseFloat(res.money)),
      status: status,
      payTime: payTime,
    };
  }
  sign(paymentReq: any): any {
    const keys = Object.keys(paymentReq);
    if (paymentReq.pid && paymentReq.pid + "" !== this.access.pid + "") {
      throw new Error("pid  not match");
    }
    paymentReq.pid = this.access.pid;
    const params: any[] = [];

    for (const key of keys) {
      const value = paymentReq[key];
      if (value != null && value !== "" && key !== "sign" && key !== "sign_type") {
        params.push({ name: key, value: value });
      }
    }
    /**
     * 1、将发送或接收到的所有参数按照参数名ASCII码从小到大排序（a-z），sign、sign_type、和空值不参与签名！
     * 2、将排序后的参数拼接成URL键值对的格式，例如 a=b&c=d&e=f，参数值不要进行url编码。
     * 3、再将拼接好的字符串与商户密钥KEY进行MD5加密得出sign签名参数，sign = md5 ( a=b&c=d&e=f + KEY ) （注意：+ 为各语言的拼接符，不是字符！），md5结果为小写。
     */
    //sort
    const sortedParams = params.sort((a, b) => a.name.localeCompare(b.name));
    //join
    const signStr = sortedParams.map(p => `${p.name}=${p.value}`).join("&");
    //md5
    const signType = this.access.signType;

    let sign = "";
    if (signType === "MD5") {
      sign = utils.hash.md5(signStr + this.access.key);
    } else if (signType === "SHA256") {
      sign = utils.hash.sha256(signStr + this.access.key);
    } else {
      throw new Error("不支持的签名方式");
    }

    sign = sign.toLowerCase();

    params.push({ name: "sign", value: sign });

    params.push({ name: "sign_type", value: signType });

    const body = {};
    params.forEach(p => {
      body[p.name] = p.value;
    });

    return body;
  }
  async createOrder(trade: TradeEntity, opts: { bindUrl: string; clientIp: string }) {
    const { bindUrl } = opts;
    const paymentReq: any = {
      pid: this.access.pid,
      out_trade_no: trade.tradeNo,
      return_url: `${bindUrl}/#/certd/payment/return/yizhifu`,
      notify_url: `${bindUrl}/api/payment/notify/yizhifu`,
      name: trade.title,
      money: utils.amount.toYuan(trade.amount),
    };

    if (this.access.payType) {
      paymentReq.type = this.access.payType;
    }

    const body = this.sign(paymentReq);

    let url = this.access.url;
    if (url.endsWith("/")) {
      url = url.substring(0, url.length - 1);
    }
    return {
      url: url + "/submit.php",
      body,
    };
  }

  checkSign(paymentRes: any) {
    // const { pid, trade_no, out_trade_no, type, name, money, trade_status, param, sign, sign_type } = paymentRes;
    const body = this.sign(paymentRes);
    const pass = body.sign === paymentRes.sign;
    if (!pass) {
      throw new Error("签名校验失败");
    }
    return pass;
  }

  async onNotify(paymentRes: any, updateTrade: UpdateTrade) {
    logger.info(`易支付notify：${JSON.stringify(paymentRes)}`);
    this.checkSign(paymentRes);

    const success = paymentRes.trade_status === "TRADE_SUCCESS";
    if (success) {
      await updateTrade({
        tradeNo: paymentRes.out_trade_no,
        status: "paid",
        amount: utils.amount.toCent(parseFloat(paymentRes.money)),
        remark: "支付类型：" + paymentRes.type,
        payNo: paymentRes.trade_no,
        payTime: dayjs().valueOf(),
      });
    }
    return "success";
  }
}
