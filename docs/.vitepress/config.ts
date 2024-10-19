import {defineConfig} from 'vitepress'
// Import lightbox plugin
import lightbox from "vitepress-plugin-lightbox"

// https://vitepress.dev/reference/site-config
export default defineConfig({
    title: "certd",
    description: "certd帮助文档",
    markdown: {
        config: (md) => {
            // Use lightbox plugin
            md.use(lightbox, {});
        },
    },
    themeConfig: {
        logo: '/images/logo/logo.svg',
        // https://vitepress.dev/reference/default-theme-config
        nav: [
            {text: '首页', link: '/'},
            {text: '指南', link: '/guide/'},
            {text: 'Demo体验', link: 'https://certd.handsfree.work'}
        ],
        sidebar: {
            "/guide/": [
                {
                    text: '入门',
                    items: [
                        {text: '简介', link: '/guide/'},
                        {text: '快速开始', link: '/guide/start.md'},
                        {
                            text: '私有化部署',
                            items: [
                                {text: 'docker部署', link: '/guide/install/docker/'},
                                {text: '宝塔面板部署', link: '/guide/install/baota/'},
                                {text: '1Panel部署', link: '/guide/install/1panel/'},
                                {text: '群晖部署', link: '/guide/use/synology/'},
                                {text: '源码部署', link: '/guide/install/source/'},
                            ]
                        },
                        {text: '演示教程', link: '/guide/tutorial.md'},

                    ]
                },
                {
                    text: '特性',
                    items: [
                        {text: 'CNAME代理校验', link: '/guide/feature/cname/index.md'},
                        {text: '插件列表', link: '/guide/plugins.md'},
                    ]
                },
                {
                    text: '使用说明',
                    items: [
                        {text: '群晖证书部署', link: '/guide/use/synology/'},
                        {text: '腾讯云', link: '/guide/use/tencent/'},
                        {text: '连接windows主机', link: '/guide/use/host/windows.md'},
                        {text: 'google EAB', link: '/guide/use/google/'},
                        {text: '忘记密码', link: '/guide/use/forgotpasswd/'},
                        {text: '数据备份', link: '/guide/use/backup/'},
                    ]
                },
                {
                    text: '其他',
                    items: [
                        {text: '镜像说明', link: '/guide/image.md'},
                        {text: '更新日志', link: '/guide/changelogs/CHANGELOG.md'},
                    ]
                },
            ],
        },
        socialLinks: [
            {icon: 'github', link: 'https://github.com/certd/certd'},
        ]
    }
})
