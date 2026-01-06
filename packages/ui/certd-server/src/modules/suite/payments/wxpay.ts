import { IPaymentProvider, TradeEntity, UpdateTrade, UpdateTradeInfo } from "@certd/commercial-core";
import WxPay from "wechatpay-node-v3";
import dayjs from "dayjs";
import { logger } from "@certd/basic"; // 支持使用require
import { WxpayAccess } from "../../../plugins/plugin-plus/wxpay/access.js";
export class PaymentWxpay implements IPaymentProvider {
  access: WxpayAccess;
  constructor(access: WxpayAccess) {
    this.access = access;
  }
  async getDetail(tradeNo: string): Promise<UpdateTradeInfo> {
    /**
     *  const result = await pay.query({out_trade_no: '1609914303237'});
     *   # 或者 const result = await pay.query({transaction_id: ''});
     *   console.log(result);
     *   {
     *     status: 200,
     *     appid: 'appid',
     *     attach: '',
     *     mchid: '商户号',
     *     out_trade_no: '1609899981750',
     *     payer: {},
     *     promotion_detail: [],
     *     trade_state: 'CLOSED',
     *     trade_state_desc: '订单已关闭'
     *   }
     */

    const pay = this.createSdk();

    const result: any = await pay.query({ out_trade_no: tradeNo });
    logger.info(`微信支付查询订单返回：${JSON.stringify(result)}`);
    if (result.status !== 200) {
      throw new Error("查询微信支付订单失败:" + result.status);
    }
    const data = result.data;
    let status: string = undefined;
    let payTime: number = undefined;
    let amount: number = undefined;
    if (data.trade_state === "SUCCESS") {
      status = "paid";
      payTime = dayjs(data.success_time).valueOf();
      amount = data.amount.total;
    } else if (data.trade_state === "CLOSED") {
      status = "closed";
    } else {
      logger.info("微信支付订单状态为：" + data.trade_state);
    }

    return {
      tradeNo: data.out_trade_no,
      status,
      amount,
      payNo: data.transaction_id,
      payTime,
    };
  }
  async createOrder(trade: TradeEntity, opts: { bindUrl: string; clientIp: string }) {
    const notify_url = `${opts.bindUrl}/api/payment/notify/wxpay`;

    const pay = this.createSdk();

    const params = {
      description: trade.title,
      out_trade_no: trade.tradeNo,
      notify_url,
      amount: {
        total: trade.amount,
      },
      scene_info: {
        payer_client_ip: "ip",
      },
    };

    logger.info(`微信支付下单请求：${JSON.stringify(params)}`);
    const result: any = await pay.transactions_native(params);
    logger.info(`微信支付下单返回：${JSON.stringify(result)}`);
    if (result.status !== 200) {
      throw new Error("请求微信支付失败:" + result.status);
    }
    return {
      qrcode: result.data.code_url,
    };
  }

  private createSdk() {
    const pay = new WxPay({
      appid: this.access.appId,
      mchid: this.access.mchid,
      publicKey: Buffer.from(this.access.publicKey), // 公钥
      privateKey: Buffer.from(this.access.privateKey), // 秘钥
    });
    return pay;
  }

  async onNotify(notifyData: any, updateTrade: UpdateTrade) {
    const pay = this.createSdk();
    const { ciphertext, associated_data, nonce } = notifyData.resource;
    logger.info(`微信支付notify：${JSON.stringify(notifyData)}`);
    const key = this.access.key;
    const result: any = pay.decipher_gcm(ciphertext, associated_data, nonce, key);
    logger.info(`微信支付解析结果：${JSON.stringify(result)}`);
    /**
     * mchid: '商户号',
     * #   appid: 'appid',
     * #   out_trade_no: '1610419296553',
     * #   transaction_id: '4200000848202101120290526543',
     * #   trade_type: 'NATIVE',
     * #   trade_state: 'SUCCESS',
     * #   trade_state_desc: '支付成功',
     * #   bank_type: 'OTHERS',
     * #   attach: '',
     * #   success_time: '2021-01-12T10:43:43+08:00',
     * #   payer: { openid: '' },
     * #   amount: { total: 1, payer_total: 1, currency: 'CNY', payer_currency: 'CNY' }
     */
    const data: any = result;
    if (data.trade_state === "SUCCESS") {
      await updateTrade({
        tradeNo: data.out_trade_no,
        status: "paid",
        amount: data.amount.total,
        payNo: data.transaction_id,
        payTime: dayjs(data.success_time).valueOf(),
      });
    } else if (data.trade_state === "CLOSED") {
      await updateTrade({
        tradeNo: data.out_trade_no,
        status: "closed",
        payNo: data.transaction_id,
      });
    }

    return "success";
  }
}
