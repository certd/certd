# 微信支付配置

## 配置步骤

1. 开通Native支付
   * 登录微信支付平台
   * 进入产品中心： https://pay.weixin.qq.com/index.php/extend/product/lists?tid=3
   * 选择开通Native支付

2. 申请证书

   * 进入“账户中心”->“API安全”->“商户API证书”->“管理证书”
   * 根据指引生成证书
   * 得到apiclient证书和私钥
   ![wx-1.png](images/wx-1.png)


3. 填写APIv3密钥

   * 进入“账户中心”->“API安全”->“解密回调”
   * 填写APIv3密钥 
   * 参考文档 https://kf.qq.com/faq/180830E36vyQ180830AZFZvu.html


4. 在Certd后台配置微信支付
   * 进入“系统”->"设置"->“支付设置”
   * 启用微信支付，选择“微信支付配置”，点击添加
   * 填写微信支付商户号、证书（apiclient_cert.pem）、私钥（apiclient_key.pem）、APIv3密钥即可。