---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "Certd"
  text: "开源、免费、全自动的证书管理工具"
  tagline: 让你的网站证书永不过期
  image:
    src: /static/logo/logo.svg
    alt: Certd
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/start.md
    - theme: alt
      text: 演示教程
      link: /guide/tutorial.md
    - theme: alt
      text: demo体验
      link: https://certd.handsfree.work

features:
  - title: 全自动申请证书
    details: 支持所有注册商注册的域名
  - title: 全自动部署证书
    details: 支持部署到主机、阿里云、腾讯云等，目前已支持30+部署插件
  - title: 多域名、泛域名打到一个证书上
    details: 支持通配符域名/泛域名，支持多个域名打到一个证书上
  - title: 多证书格式支持
    details: 支持pem、pfx、der等多种证书格式，支持Google、Letsencrypt、ZeroSSL证书颁发机构
  - title: 支持私有化部署
    details: 保障数据安全
  - title: 多数据库支持
    details: 支持sqlite，postgresql数据库
---
