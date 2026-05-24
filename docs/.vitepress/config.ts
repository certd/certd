import {defineConfig} from "vitepress";
// Import lightbox plugin
import lightbox from "vitepress-plugin-lightbox";

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: "Certd",
    titleTemplate: "开源SSL证书管理工具，证书自动化申请部署，让你的网站证书永不过期",
    description: "Certd帮助文档,Certd是一款开源免费的全自动SSL证书管理工具；证书自动化申请部署流水线；自动证书申请、更新、续期；通配符证书，泛域名证书申请；证书自动化部署到阿里云、腾讯云、主机、群晖、宝塔。",
    markdown: {
        config: (md) => {
            // Use lightbox plugin
            md.use(lightbox, {});
        }
    },
    sitemap: {
        hostname: 'https://certd.docmirror.cn'
    },
    head: [
        // [
        //     'meta',
        //     {
        //         name: 'viewport',
        //         content:
        //           'width=device-width,initial-scale=1,minimfast-cum-scale=1.0,maximum-scale=1.0,user-scalable=no',
        //     },
        // ],
        ["meta", {
            name: "keywords",
            content: "证书自动申请、证书自动更新、证书自动续期、证书自动续签、证书管理工具、Certd、SSL证书自动部署、证书自动化，https证书，pfx证书，der证书，TLS证书，nginx证书自动续签自动部署,SSL平台，证书管理平台，证书流水线"
        }],
        // ["meta", { name: "google-site-verification",content: "V5XLTSnXoT15uQotwpxJoQolUo2d5UbSL-TacsyOsC0"}],
        //<meta name="baidu-site-verification" content="codeva-MiWN8Y07Ua" />
        // ["meta", {name: "baidu-site-verification",content: "codeva-MiWN8Y07Ua"}],
        ["link", {rel: "icon", href: "/static/logo/logo.svg"}]
    ],
    themeConfig: {
        logo: "/static/logo/logo.svg",
        search: {
            provider: "local",
            options: {
                detailedView: true,
                translations: {
                    button: {
                        buttonText: "搜索文档",
                        buttonAriaLabel: "搜索文档"
                    },
                    modal: {
                        noResultsText: "无法找到相关结果",
                        resetButtonTitle: "清除查询条件",
                        footer: {
                            selectText: "选择",
                            closeText: "关闭",
                            navigateText: "切换"
                        }
                    }
                }
            }
        },
        // https://vitepress.dev/reference/default-theme-config
        nav: [
            {text: "首页", link: "/"},
            {text: "指南", link: "/guide/"},
            {text: "Demo体验", link: "https://certd.handfree.work"}
        ],
        sidebar: {
            "/guide/": [
                {
                    text: "入门",
                    items: [
                        {text: "简介", link: "/guide/"},
                        {text: "快速开始", link: "/guide/start.md"},
                        {
                            text: "私有化部署",
                            items: [
                                {text: "docker部署", link: "/guide/install/docker/"},
                                {text: "宝塔面板部署", link: "/guide/install/baota/"},
                                {text: "1Panel部署", link: "/guide/install/1panel/"},
                                {text: "群晖部署", link: "/guide/use/synology/"},
                                {text: "源码部署", link: "/guide/install/source/"}
                            ]
                        },
                        {text: "演示教程", link: "/guide/tutorial.md"},
                        {text: "版本升级", link: "/guide/install/upgrade.md"},
                        {text: "赞助专业版", link: "/guide/donate/"},
                    ]
                },
                {
                    text: "特性",
                    items: [
                        {text: "CNAME代理校验", link: "/guide/feature/cname/index.md"},
                        {text: "多数据库支持", link: "/guide/install/database.md"},
                        {text: "开放接口", link: "/guide/open/index.md"},
                        {
                            text: "站点安全",  link: "/guide/feature/safe/"
                        },
                        {
                            text: "插件列表", items: [
                                {text: "DNS提供商", link: "/guide/plugins/dns-provider.md"},
                                {text: "任务插件", link: "/guide/plugins/deploy.md"},
                                {text: "通知插件", link: "/guide/plugins/notification.md"},
                                {text: "授权提供商", link: "/guide/plugins/access.md"},
                            ]
                        },
                    ]
                },
                {
                    text: "常见问题",
                    items: [
                        {text: "QA", link: "/guide/qa/use.md"},
                        {text: "忘记密码/无法登录", link: "/guide/use/forgotpasswd/"},
                        {text: "群晖证书部署", link: "/guide/use/synology/"},
                        {text: "腾讯云密钥获取", link: "/guide/use/tencent/"},
                        {text: "连接windows主机", link: "/guide/use/host/windows.md"},
                        {text: "Google EAB获取", link: "/guide/use/google/"},
                        {text: "阿里云相关", link: "/guide/use/aliyun/"},
                        {text: "Azure相关", link: "/guide/use/azure/dns.md"},
                        {text: "数据备份", link: "/guide/use/backup/"},
                        {text: "Certd本身的证书更新", link: "/guide/use/https/index.md"},
                        {text: "js脚本插件使用", link: "/guide/use/custom-script/index.md"},
                        {text: "邮箱配置", link: "/guide/use/email/index.md"},
                        {text: "证书复用", link: "/guide/use/pretask/"},
                        {text: "IPv6支持", link: "/guide/use/setting/ipv6.md"},
                        {text: "ESXi", link: "/guide/use/ESXi/index.md"},
                        {text: "宝塔动态IP白名单", link: "/guide/use/baota/white_list.md"},
                        {text: "子域名托管", link: "/guide/use/cert/subdomain.md"},
                        {text: "流水线有效期", link: "/guide/use/pipeline/valid.md"},
                        {text: "IP证书申请", link: "/guide/use/cert/ip.md"},
                        {text: "企业模式", link: "/guide/use/mode/enterprise.md"},
                        {text: "插件开发", link: "/guide/use/dev/plugin.md"},
                    ]
                },
                {
                    text: "商业版配置", link: "/guide/use/comm/", items: [
                        {text: "支付宝配置", link: "/guide/use/comm/payments/alipay.md"},
                        {text: "微信支付配置", link: "/guide/use/comm/payments/wxpay.md"},
                        {text: "彩虹易支付配置", link: "/guide/use/comm/payments/yizhifu.md"},
                    ]
                },
                {
                    text: "其他",
                    items: [
                        {text: "贡献代码", link: "/guide/development/index.md"},
                        {text: "更新日志", link: "/guide/changelogs/CHANGELOG.md"},
                        {text: "镜像说明", link: "/guide/image.md"},
                        {text: "联系我们", link: "/guide/contact/"},
                        {text: "开源协议", link: "/guide/license/"},
                        {text: "我的其他开源项目", link: "/guide/link/"},
                    ]
                }
            ],
        },

        socialLinks: [
            {icon: "github", link: "https://github.com/certd/certd"}
        ],
        footer: {
            message: "Certd帮助文档 |  <a href='https://beian.miit.gov.cn/' target='_blank'>粤ICP备14088435号</a> ",
            copyright: "Copyright © 2021-present <a href='https://handfree.work/' target='_blank'>handfree.work</a> "
        }
    }
});
