import { IPaymentProvider, TradeEntity, UpdateTrade, UpdateTradeInfo } from "@certd/commercial-core";
import dayjs from "dayjs";
import { logger, utils } from "@certd/basic";
import { AlipayAccess } from "../../../plugins/plugin-plus/alipay/access.js";

export class PaymentAlipay implements IPaymentProvider {
  access: AlipayAccess;

  constructor(access: AlipayAccess) {
    this.access = access;
  }

  async getDetail(tradeNo: string): Promise<UpdateTradeInfo> {
    const alipaySdk = await this.createAlipaySdk();

    const result: any = await alipaySdk.curl("POST", "/v3/alipay/trade/query", {
      body: {
        out_trade_no: tradeNo,
      },
    });
    logger.info("获取支付宝订单详情", JSON.stringify(result));
    if (result.responseHttpStatus !== 200) {
      throw new Error("请求支付宝失败:" + result.responseHttpStatus);
    }
    const data = result.data;

    let status: string = undefined;
    let payTime: number = undefined;
    if (data.trade_status === "TRADE_SUCCESS") {
      status = "paid";
      payTime = dayjs(data.send_pay_date).valueOf();
    } else if (data.trade_status === "TRADE_CLOSED") {
      status = "closed";
    } else {
      logger.info("支付宝订单状态为：" + data.trade_status);
    }

    return {
      tradeNo,
      status: status,
      amount: utils.amount.toCent(parseFloat(data.total_amount)),
      payNo: data.trade_no,
      payTime: payTime,
    };
  }

  async createOrder(trade: TradeEntity, opts: { bindUrl: string; clientIp: string }) {
    const return_url = `${opts.bindUrl}/#/certd/payment/return/alipay`;
    const notify_url = `${opts.bindUrl}/api/payment/notify/alipay`;

    const alipaySdk = await this.createAlipaySdk();
    const url = alipaySdk.pageExec("alipay.trade.page.pay", "GET", {
      return_url,
      notify_url,
      bizContent: {
        out_trade_no: trade.tradeNo,
        total_amount: utils.amount.toYuan(trade.amount),
        subject: trade.title,
        product_code: "FAST_INSTANT_TRADE_PAY",
        // qr_pay_mode: "1",
        // qrcode_width: "100",
        // time_expire: "2016-12-31+10:05:01",
        // sub_merchant: {
        //   merchant_id: "2088000603999128",
        //   merchant_type: "alipay",
        // },
        // extend_params: {
        //   sys_service_provider_id: "2088511833207846",
        //   hb_fq_seller_percent: "100",
        //   hb_fq_num: "3",
        //   industry_reflux_info: '{\\"scene_code\\":\\"metro_tradeorder\\",\\"channel\\":\\"xxxx\\",\\"scene_data\\":{\\"asset_name\\":\\"ALIPAY\\"}}',
        //   specified_seller_name: "XXX的跨境小铺",
        //   royalty_freeze: "true",
        //   card_type: "S0JP0000",
        // },
        // business_params: '{"mc_create_trade_ip":"127.0.0.1"}',
        // promo_params: '{"storeIdType":"1"}',
        // integration_type: "PCWEB",
        // request_from_url: "https://",
        // store_id: "NJ_001",
        // merchant_order_no: "20161008001",
        // ext_user_info: {
        //   cert_type: "IDENTITY_CARD",
        //   cert_no: "362334768769238881",
        //   name: "李明",
        //   mobile: "16587658765",
        //   min_age: "18",
        //   need_check_info: "F",
        //   identity_hash: "27bfcd1dee4f22c8fe8a2374af9b660419d1361b1c207e9b41a754a113f38fcc",
        // },
        // invoice_info: {
        //   key_info: {
        //     tax_num: "1464888883494",
        //     is_support_invoice: "true",
        //     invoice_merchant_name: "ABC|003",
        //   },
        //   details: '[{"code":"100294400","name":"服饰","num":"2","sumPrice":"200.00","taxRate":"6%"}]',
        // },
      },
    });
    return {
      url,
      body: {},
    };
  }

  private async createAlipaySdk() {
    const AlipaySdk = await import("alipay-sdk");

    const alipaySdk = new AlipaySdk.AlipaySdk({
      appId: this.access.appId,
      privateKey: this.access.privateKey,
      alipayPublicKey: this.access.alipayPublicKey,
      gateway: "https://openapi.alipay.com/gateway.do",
    });
    return alipaySdk;
  }

  async onNotify(data: any, updateTrade: UpdateTrade) {
    const alipaySdk = await this.createAlipaySdk();
    logger.info(`支付宝notify：${JSON.stringify(data)}`);
    // true | false
    let success = alipaySdk.checkNotifySign(data);
    if (!success) {
      success = alipaySdk.checkNotifySignV2(data);
      if (!success) {
        throw new Error("签名验证失败");
      }
    }
    if (data.trade_status === "TRADE_SUCCESS") {
      await updateTrade({
        tradeNo: data.out_trade_no,
        status: "paid",
        amount: utils.amount.toCent(parseFloat(data.total_amount)),
        payNo: data.trade_no,
        payTime: dayjs().valueOf(),
      });
    } else if (data.trade_status === "TRADE_CLOSED") {
      await updateTrade({
        tradeNo: data.out_trade_no,
        status: "closed",
        payNo: data.trade_no,
      });

      return "success";
    }
  }
}
