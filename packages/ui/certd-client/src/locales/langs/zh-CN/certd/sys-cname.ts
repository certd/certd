export default {
  cnameTitle: "CNAME服务配置",
  cnameDescription: "此处配置的域名作为其他域名校验的代理，当别的域名需要申请证书时，通过CNAME映射到此域名上来验证所有权。好处是任何域名都可以通过此方式申请证书，也无需填写AccessSecret。",
  cnameLinkText: "CNAME功能原理及使用说明",
  cnameDomain: "CNAME域名",
  cnameDomainPlaceholder: "cname.handsfree.work",
  cnameDomainHelper: "需要一个右边DNS提供商注册的域名（也可以将其他域名的dns服务器转移到这几家来）。\nCNAME域名一旦确定不可修改，建议使用一级子域名",
  cnameDomainPattern: "域名不能使用星号",
  cnameProviderSubdomain: "托管子域名",
  cnameProviderSubdomainPlaceholder: "sub.example.com",
  cnameProviderSubdomainHelper: "当CNAME域名本身托管在子域名下时填写，例如 CNAME域名为 cname.sub.example.com，实际DNS托管域为 sub.example.com",
  dnsProvider: "DNS提供商",
  dnsProviderAuthorization: "DNS提供商授权",
};
