# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.39.2](https://github.com/certd/certd/compare/v1.39.1...v1.39.2) (2026-03-16)

### Bug Fixes

* 修复当证书更新后第一次站点检查会报与主站证书过期时间不一致错误的bug ([dd999b6](https://github.com/certd/certd/commit/dd999b60a4fe3507ff5e0109d637b4e891b28bdd))
* 修复京东云报错不准确的bug ([10dd89a](https://github.com/certd/certd/commit/10dd89ae62e438a211a15e729559af823a096583))
* 修复群晖测试时报addSecret undefine错误 ([5eb4aa3](https://github.com/certd/certd/commit/5eb4aa3a0eab9ffa729c8e813cbf973d9683cc13))
* cname provider授权修改为sys级别 ([d01bfbe](https://github.com/certd/certd/commit/d01bfbec96a3a2109ec864953b0c9e8c1f95b97b))

### Performance Improvements

* 查看证书增加证书详情显示，包括域名，过期时间，颁发机构，指纹等 ([0b9933d](https://github.com/certd/certd/commit/0b9933df1e8d1685d14271435a8a7488974cc47b))
* 获取阿里证书订单id组件增加翻页功能，突破50的上限 ([d79db3b](https://github.com/certd/certd/commit/d79db3bd3f0d5ad39664bb47ec3814d43ad93304))
* 优化个人账户页面 ([e506116](https://github.com/certd/certd/commit/e50611666ef731a903d7bdd8eb62333b97e2cc5b))
* 支持批量转移流水线到其他项目 ([8a3841f](https://github.com/certd/certd/commit/8a3841f6382b53ce2343307fb035e74fa5383fef))
* 支持passkey登录 ([10b7644](https://github.com/certd/certd/commit/10b7644bb7ba5f82776537bc0c4f5eb95d5f8e4e))
* dns-provider 支持bind9 ，support bind9 ([76d12d6](https://github.com/certd/certd/commit/76d12d60624c0672fd3717a80a2cfef6845b14b8))

## [1.39.1](https://github.com/certd/certd/compare/v1.39.0...v1.39.1) (2026-03-09)

### Performance Improvements

* 支持迁移个人数据到企业项目中 ([c6ca832](https://github.com/certd/certd/commit/c6ca83273779ed84de1b23b5e477063af043d015))

# [1.39.0](https://github.com/certd/certd/compare/v1.38.12...v1.39.0) (2026-03-07)

### Bug Fixes

* 修复部署到openwrt错误的bug ([2e3d0cc](https://github.com/certd/certd/commit/2e3d0cc57c16c48ad435bc8fde729bacaedde9f5))
* 修复复制流水线保存后丢失分组和排序号的问题 ([bc32648](https://github.com/certd/certd/commit/bc326489abc1d50a0930b4f47aa2d62d3a486798))
* 修复京东云域名申请证书报错的bug ([d9c0130](https://github.com/certd/certd/commit/d9c0130b59997144a3c274d456635b800135e43f))
* 修复偶尔下载证书报未授权的错误 ([316537e](https://github.com/certd/certd/commit/316537eb4dcbe5ec57784e8bf95ee3cdfd21dce7))
* 修复dcdn多个域名同时部署时 可能会出现证书名称重复的bug ([78c2ced](https://github.com/certd/certd/commit/78c2ced43b1a73d142b0ed783b162b97f545ab06))
* 优化dcdn部署上传多次证书 偶尔报 The CertName already exists的问题 ([72f850f](https://github.com/certd/certd/commit/72f850f675b500d12ebff2338d1b99d6fab476e1))
* **cert-plugin:** 优化又拍云客户端错误处理逻辑，当域名已绑定证书时不再抛出异常。 ([92c9ac3](https://github.com/certd/certd/commit/92c9ac382692e6c84140ff787759ab6d39ccbe96))
* esxi部署失败的bug ([1e44115](https://github.com/certd/certd/commit/1e441154617e6516a9a3610412bf597128c62696))

### Features

* 支持企业级管理模式，项目管理，细分权限 ([3734083](https://github.com/certd/certd/commit/37340838b6a61a94b86bfa13cf5da88b26f1315a))

### Performance Improvements

* 站点监控支持指定ip地址检查 ([83d81b6](https://github.com/certd/certd/commit/83d81b64b3adb375366039e07c87d1ad79121c13))

## [1.38.12](https://github.com/certd/certd/compare/v1.38.11...v1.38.12) (2026-02-18)

**Note:** Version bump only for package @certd/ui-server

## [1.38.11](https://github.com/certd/certd/compare/v1.38.10...v1.38.11) (2026-02-16)

### Bug Fixes

* 修复1panel2.1.0新版本测试失败的问题 ([8ef1f2e](https://github.com/certd/certd/commit/8ef1f2e395ea5969a95f55535e6c16a65e2b463b))

### Performance Improvements

* 支持自定义发件人名称，格式：名称<邮箱> ([bab9adc](https://github.com/certd/certd/commit/bab9adce240108d4291eedc67e04abc4a01019e0))

## [1.38.10](https://github.com/certd/certd/compare/v1.38.9...v1.38.10) (2026-02-15)

### Bug Fixes

* 修复1panel 请求失败的bug ([0283662](https://github.com/certd/certd/commit/0283662931ff47d6b5d49f91a30c4a002fe1d108))
* 修复阿里云dcdn使用上传到cas的id引用错误的bug ([61800b2](https://github.com/certd/certd/commit/61800b23e2be324169990810d1176c18decabb23))
* 修复保存站点监控dns设置，偶尔无法保存成功的bug ([8387fe0](https://github.com/certd/certd/commit/8387fe0d5b2e77b8c2788a10791e5389d97a3e41))

### Performance Improvements

* 备份支持scp上传 ([66ac471](https://github.com/certd/certd/commit/66ac4716f2565d7ee827461b625397ae21599451))
* 列表中支持下次执行时间显示 ([a3cabd5](https://github.com/certd/certd/commit/a3cabd5f36ed41225ad418098596e9b2c44e31a1))
* 群晖支持刷新登录有效期 ([42c7ec2](https://github.com/certd/certd/commit/42c7ec2f75947e2b8298d6605d4dbcd441aacd51))
* 所有授权增加测试按钮 ([7a3e68d](https://github.com/certd/certd/commit/7a3e68d656c1dcdcd814b69891bd2c2c6fe3098a))
* 新网互联支持查询域名列表 ([e7e54bc](https://github.com/certd/certd/commit/e7e54bc19e3a734913a93a94e25db3bb06d2ab0f))
* 优化京东云报错详情显示 ([1195417](https://github.com/certd/certd/commit/1195417b9714d2fcb540e43c0a20809b7ee2052b))
* 增加部署证书到certd本身插件 ([3cd1aae](https://github.com/certd/certd/commit/3cd1aaeb035f8af79714030889b2b4dc259b700e))
* 支持next-terminal ([6f3fd78](https://github.com/certd/certd/commit/6f3fd785e77a33c72bdf4115dc5d498e677d1863))
* http校验方式支持scp上传 ([4eb940f](https://github.com/certd/certd/commit/4eb940ffe765a0330331bc6af8396315e36d4e4a))

## [1.38.9](https://github.com/certd/certd/compare/v1.38.8...v1.38.9) (2026-02-09)

### Bug Fixes

* 修复部署到openwrt错误的bug ([9ac33f9](https://github.com/certd/certd/commit/9ac33f9b9ba7727fcbbd320dd866bc048cbb3d72))
* 修复新版本上传到阿里云cas后，其他依赖任务无法部署的bug ([99f5b8e](https://github.com/certd/certd/commit/99f5b8ebc1c64798ceb42042ad71cf71e967beb0))
* esxi部署失败的bug ([6ab1fca](https://github.com/certd/certd/commit/6ab1fcaf894f7ce343af4b5bf4b0d67438df6618))

### Performance Improvements

* 修改sql升级语句，兼容mysql5.7 ([02f89a9](https://github.com/certd/certd/commit/02f89a9c9d77850437285844670aed441e5953c3))
* 优化access授权支持remote-auto-complete ([2f40f79](https://github.com/certd/certd/commit/2f40f795ee6131132d3fab2601f92a567bbdc4b7))
* access 插件支持remote-select等配置 ([d286c04](https://github.com/certd/certd/commit/d286c040a5232dcca829945734affead3ee08b3c))

## [1.38.8](https://github.com/certd/certd/compare/v1.38.7...v1.38.8) (2026-02-06)

### Performance Improvements

* 双重验证显示secret ([febd6d3](https://github.com/certd/certd/commit/febd6d32cfe6d89ccecf26bf15141df7c456e5c6))
* 优化申请证书最大超时时长 ([00f67d8](https://github.com/certd/certd/commit/00f67d86d68f4f83cfafe2fbfeb4af0d86f9d20e))
* 支持设置默认的证书申请地址的反向代理 ([0cfb94b](https://github.com/certd/certd/commit/0cfb94b0ba6a6dc3bb0d0a81a1912068a4e6b6b6))
* 子域名托管域名支持配置通配符 ([3f7ac93](https://github.com/certd/certd/commit/3f7ac939326b0c7ec013a7534b6c0e58fb3e8cb4))

## [1.38.7](https://github.com/certd/certd/compare/v1.38.6...v1.38.7) (2026-02-05)

### Performance Improvements

*  eab从更多参数中挪到外面 ([5ea4f46](https://github.com/certd/certd/commit/5ea4f46de7ae403a7a16e9488dc1d9c7523d019a))
* 第三方登录支持Microsoft ([beb7a4c](https://github.com/certd/certd/commit/beb7a4c99277262bb9681c5594cfcd3e36c52074))
* 优化zerossl申请证书稳定性 ([4d86fb3](https://github.com/certd/certd/commit/4d86fb319b81dbf6fa6485982105725b1b066593))

## [1.38.6](https://github.com/certd/certd/compare/v1.38.5...v1.38.6) (2026-02-04)

### Bug Fixes

* 修复新网找错域名的bug ([bd511f9](https://github.com/certd/certd/commit/bd511f97cb7fbdcaeff7ac899f0460a5c7b41826))

### Performance Improvements

* oauth支持github 和google， 修复头像显示问题 ([693a4a6](https://github.com/certd/certd/commit/693a4a663385ced3176286bf4b5f3566da83d90e))

## [1.38.5](https://github.com/certd/certd/compare/v1.38.4...v1.38.5) (2026-02-02)

### Bug Fixes

* 阿里云esa查询证书限制接口无效，改成配置证书数量上限检查方式进行清理 ([2302567](https://github.com/certd/certd/commit/230256793f8ad87ef8a0738c37108bf7b5ab9853))
* 修复部署到火山引擎vod，获取域名列表为空的bug ([0719f4c](https://github.com/certd/certd/commit/0719f4c99e9198544d03431107b53652e076e881))
* 修复oidc配置取消后获取登出地址失败后无法列出oauth列表的bug ([eb5de15](https://github.com/certd/certd/commit/eb5de150332fd914c56b812c3ba2c2445f902bb7))

### Performance Improvements

* 将重置密码的日志挪到启动成功之后，方便查看 ([0fa9b34](https://github.com/certd/certd/commit/0fa9b344e08cf355aee7a7566f061cc5d95dc374))
* 支持绑定两个url地址 ([a2e9a41](https://github.com/certd/certd/commit/a2e9a41a7e712395c0e3ee6fe55b370aa1fc1f12))

## [1.38.4](https://github.com/certd/certd/compare/v1.38.3...v1.38.4) (2026-01-31)

### Bug Fixes

* 修复阿里云esa超过免费配额之后无法部署证书的bug，改成删除最旧的那张证书 ([32de8d9](https://github.com/certd/certd/commit/32de8d9ccb08d26414adbdde950d7cd405dc344a))

### Performance Improvements

* 当ip证书天数太小时，自动调整更新天数，避免每次运行都重新申请ip证书 ([433e98b](https://github.com/certd/certd/commit/433e98b6450fa7d0491151f159e432bf3dfe4feb))
* 修复旧版本流水线数据发送通知标题为空的bug ([9bee0e4](https://github.com/certd/certd/commit/9bee0e460bfebe8db76742b80b2d52854392f4de))
* 验证码支持 Cloudflare Turnstile ，谨慎启用，国内被墙了 ([ca43c77](https://github.com/certd/certd/commit/ca43c775250154def63c4acd96d65dc95d1c0c2b))
* 优化证书未过期时的任务日志提示 ([ac85488](https://github.com/certd/certd/commit/ac85488245197694560aad7df9425ca215ef7ff7))
* 支持部署到阿里云GA ([1a0d3ee](https://github.com/certd/certd/commit/1a0d3eeb1b0b5ce08f05af84b6161e00c1fe1815))
* 支持部署到华为elb ([60c8ace](https://github.com/certd/certd/commit/60c8ace443e848155d3ce12e95b84766a4610d3a))
* 支持部署到AcePanel ([1661cae](https://github.com/certd/certd/commit/1661caed05e3413dc3e2b14ce62b75aa03ad90e0))

## [1.38.3](https://github.com/certd/certd/compare/v1.38.2...v1.38.3) (2026-01-28)

### Bug Fixes

* 当通知配置被删除时，使用默认通知配置进行发送 ([5398300](https://github.com/certd/certd/commit/53983002b6553a929b72e2c70a26809a9f306e89))
* 站点检查多个ip连接超时的报错显示不出来的bug ([33b284a](https://github.com/certd/certd/commit/33b284afc0ae6391658d573e32b1ce7765e51cb2))

### Performance Improvements

* 部署插件支持ucloud alb ([640950d](https://github.com/certd/certd/commit/640950d4c847c72cae2986e3c2cae10d52a67fdf))
* 多个dns 提供商支持导入域名 ([d3c0914](https://github.com/certd/certd/commit/d3c0914ac16db8ac77f9c60285bb20cfab7a3cb0))
* 输入证书域名时，支持点击导入域名 ([40be424](https://github.com/certd/certd/commit/40be42406c6fd5de11f594fc6913178d9e7d8943))
* 所有的dnsprovider 支持导入域名列表 ([9f21b1a](https://github.com/certd/certd/commit/9f21b1a09797d7dab253e4416c538b55fb8f4488))
* 优化首页统计数据，饼图替换成证书数量统计 ([9fa1c2e](https://github.com/certd/certd/commit/9fa1c2eb3e55ef630333ae24284aa8b54e3414b6))
* 域名导入任务进度条 ([7058d5c](https://github.com/certd/certd/commit/7058d5cb935cab8c75b98493ed497a22dbe70883))
* 证书仓库页面增加到期状态查询条件 ([58c3d70](https://github.com/certd/certd/commit/58c3d7087bb66358d896a741e12005f690b2bd5e))
* 证书流水线创建域名输入框支持获取域名数据进行选择 ([1d5b1c2](https://github.com/certd/certd/commit/1d5b1c239cf350920eb2eb9fd293af74ef412853))
* 支持导入51dns域名 ([7eb9694](https://github.com/certd/certd/commit/7eb96942214aed0dfc9c3c5a669374da67052c49))
* ucloud支持部署到alb ([78004bd](https://github.com/certd/certd/commit/78004bdfb552a3b83298fa09d518ca282a529d90))
* ucloud支持部署到ulb（alb、clb统一成一个） ([c408687](https://github.com/certd/certd/commit/c408687af7669afe733b5506720ca795555acdce))

## [1.38.2](https://github.com/certd/certd/compare/v1.38.1...v1.38.2) (2026-01-22)

### Bug Fixes

* 编辑插件author不允许出现符号 ([5ea2b09](https://github.com/certd/certd/commit/5ea2b09dc30397c086a2498f958f661e7fef10fc))
* 修复插件修改名字和删除后没有注销注册的bug ([61192b9](https://github.com/certd/certd/commit/61192b998a7088a8f446fd224cc242def462a79b))
* 修复流水线复制出错的bug ([418bcdd](https://github.com/certd/certd/commit/418bcddc95bf19d2659d2a9cfe336bc059d157b0))

### Performance Improvements

* 优化流水线创建入口，各种证书申请任务类型拆分成多个按钮 ([f75c73d](https://github.com/certd/certd/commit/f75c73d739ee271fb718148416836dbe09bb3266))
* 域名导入 ([ad64384](https://github.com/certd/certd/commit/ad64384891c13342980b7559924666dcfb2796c2))
* 支持从提供商导入域名列表 ([f442363](https://github.com/certd/certd/commit/f4423638a2ee779d48fc17b3819ce3bee55b0361))
* 支持同步域名过期时间 ([a97cee8](https://github.com/certd/certd/commit/a97cee84f3bfdeeb2083d91f748cac5405fed6ae))
* cname记录支持批量导入和导出 ([607afe8](https://github.com/certd/certd/commit/607afe864a12d6f50993895a4e10f4c9a3dd8fee))

## [1.38.1](https://github.com/certd/certd/compare/v1.38.0...v1.38.1) (2026-01-15)

### Bug Fixes

* 修复自定义插件name丢失author导致找不到插件的bug ([2fbb58e](https://github.com/certd/certd/commit/2fbb58eb2b239eab4864f90aa72b0ef2ada38e8f))

### Performance Improvements

* 自定义插件支持使用_ctx.import("/@/xxx.js")以绝对路径引用模块 ([9eace86](https://github.com/certd/certd/commit/9eace86aeeb48c23b55102fc5d42088294d9eb97))

# [1.38.0](https://github.com/certd/certd/compare/v1.37.17...v1.38.0) (2026-01-13)

### Bug Fixes

* 修复又拍云upyun密码错误没有报错的bug ([235972f](https://github.com/certd/certd/commit/235972f3dabe0b87879a2d9950367dc45edfebe8))
* 修复重启certd后，再启用流水线，不会自动执行的bug ([468ccbf](https://github.com/certd/certd/commit/468ccbf2b725fc4b78ce4b950a114e4a4be57698))

### Features

* 【破坏性更新】插件改为metadata加载模式，plugin-cert、plugin-lib包部分代码转移到certd-server中，影响自定义插件，需要修改相关import引用 ([a3fb249](https://github.com/certd/certd/commit/a3fb24993d7ac8fbb0bb354fa02ef067f609021e))
* 通过metadata加载插件，降低内存占用 ([7634f15](https://github.com/certd/certd/commit/7634f153b7004462f207062c0502d8345e318cc7))

### Performance Improvements

* 流水线页面可以查看证书过期时间 ([be03d8e](https://github.com/certd/certd/commit/be03d8e13752c355dbec158da78b9cb4c3b3bb5d))
* 手机号登录放到前面 ([26ac081](https://github.com/certd/certd/commit/26ac08118219407c5dd3afc35130cdd48b8fab05))
* 新增部署1panel面板证书插件 ([4243622](https://github.com/certd/certd/commit/42436224148d6fffe5da8e5e0185a698e079032b))
* 优化微信支付对接文档 ([64e0d9a](https://github.com/certd/certd/commit/64e0d9a4d54b0d9da028be2c5e0ece7a97b2c250))
* 优化站点监控，支持设置忽略主站证书一致性，支持开启和关闭自动同步ip ([26f75c7](https://github.com/certd/certd/commit/26f75c71ba8866278dbe117f1bfaf671e7f70781))
* 增加邮件发送证书模版配置 ([cabc4da](https://github.com/certd/certd/commit/cabc4da3ac003a8c699c69f5bffea4c149be185c))
* 站点监控增加是否自动同步IP开关 ([5268904](https://github.com/certd/certd/commit/52689049ae8e004e1252ab1e2872fbf676e0295f))
* 支持部署到exsi，openwrt ([dae87e2](https://github.com/certd/certd/commit/dae87e26a3266a2bf26afe1ef4c489a3f6bf41e4))
* 支持公告功能 ([a79fe1f](https://github.com/certd/certd/commit/a79fe1f350f2991af9e5b50825f1776029677fc5))
* 支持webhook触发流水线，新增触发类型图标显示 ([1a29541](https://github.com/certd/certd/commit/1a2954114063a8b994c257a90e5814e0a3a8d924))
* zenlayer证书更新 ([9ba6c83](https://github.com/certd/certd/commit/9ba6c838215d0750cda925778a47002a521f05e9))

## [1.37.17](https://github.com/certd/certd/compare/v1.37.16...v1.37.17) (2025-12-29)

### Bug Fixes

* 发送证书到邮箱插件的邮件模版转为使用邮箱配置中的通用模版 ([c5a3003](https://github.com/certd/certd/commit/c5a3003cf7b640500a90ec2c8961859ffe6fdb18))
* 首页最快到期证书，不包含已禁用的流水线 ([d731956](https://github.com/certd/certd/commit/d731956b066e4dbbe24d4de7b3d3679b355eb97c))
* 修复部署到华为obs 报错的bug ([dd19afc](https://github.com/certd/certd/commit/dd19afce928a7f36312af9df1e7e5ed3eb1e214a))
* 修复从模版创建的流水线不会自动执行的bug ([833808c](https://github.com/certd/certd/commit/833808c5deb716122b241d3d67349d2d6a18bf45))
* 修复流水线列表step数量统计错误的bug ([0e5a4fb](https://github.com/certd/certd/commit/0e5a4fb098d3261b690c551cf2b95198cac487e7))
* 修复用户删除后，用相同的oauth授权登录报错用户不存在的问题 ([e505916](https://github.com/certd/certd/commit/e5059165259e4d757abc811c0c14bbc4a3dbaee9))
* 修复站点ip监控报主站与ip证书过期时间不一致的问题 ([62f8525](https://github.com/certd/certd/commit/62f8525dd5da95dc07ed103f602644c6e5f7f8e3))
* 修复serverchan3 没有选择tags报错的bug ([5bbf210](https://github.com/certd/certd/commit/5bbf210394883c4893c365bd16e999490b6e9b41))

### Performance Improvements

* 批量修改定时时间支持随机时间 ([d0f653d](https://github.com/certd/certd/commit/d0f653da9a2970920e961e7404ff04080bccd343))
* 批量运行优化，支持普通运行和强制重新运行 ([039c62b](https://github.com/certd/certd/commit/039c62b09b37cdda35d33c6ee9adecad62dee75c))
* 升级lego到4.30.1版本 ([136e8dd](https://github.com/certd/certd/commit/136e8dd7c5ff7199ff4b0bcca95b8a03aa847553))
* 腾讯云EO增加请求参数打印 ([5b5deac](https://github.com/certd/certd/commit/5b5deac7d98684eda5c68384241a4d62c48d803b))
* 优化阿里云esa清理证书时机 ([5359a76](https://github.com/certd/certd/commit/5359a7670fac5a18c4294b37a34227308a0deed6))
* 支持部署到goedge ([44bf4b1](https://github.com/certd/certd/commit/44bf4b1cc1aafa2d711c3b8e408009f0ceb413eb))
* 支持授权给管理员查看和下载用户证书 ([1347355](https://github.com/certd/certd/commit/1347355cb117694abe99da385352a19771a32e84))
* 支持执行队列，避免同一时间触发流水线太多导致被限制 ([888d959](https://github.com/certd/certd/commit/888d9591fe9730b529e1c355d71f41e7ec9b479d))
* 支持aws route53 dns ([cbb8319](https://github.com/certd/certd/commit/cbb8319cfa48673e81ec15894adc3376c173c97e))
* 支持ucloud waf（未测试） ([a248367](https://github.com/certd/certd/commit/a248367b154c38661a6797ef64e37ec99d4e2abf))
* 支持ucloud，上传到ussl，部署到ucdn ([e61daae](https://github.com/certd/certd/commit/e61daaee2d0dec19710cd4ec759219a071f2435e))
* 执行队列数量支持设置 ([cd94488](https://github.com/certd/certd/commit/cd944882c3272adad4a2da94a3889a01fe05fe13))
* aws route53 ([8caab1f](https://github.com/certd/certd/commit/8caab1fd9264df548f467b94202d567107b7a30b))

## [1.37.16](https://github.com/certd/certd/compare/v1.37.15...v1.37.16) (2025-12-15)

### Bug Fixes

* 优化西部数据 500 already exists 的问题 ([2bfad9f](https://github.com/certd/certd/commit/2bfad9fc651da208b610abd921fbfb2fbc04203f))

### Performance Improvements

* 批量设置定时，支持清除定时 ([63d8bcf](https://github.com/certd/certd/commit/63d8bcf8823f713365042d3c7aee3cf31d44b044))
* 新增数据库迁移doc说明文档，优化datetime字段平滑迁移 ([45fbce0](https://github.com/certd/certd/commit/45fbce0c2af5fb3ead6d3dd12a42f8cc1714262f))
* 支持彩虹聚合登录 ([6f18693](https://github.com/certd/certd/commit/6f186932ccad4becfdc0087c0539f7b2d0069844))
* 支持邮件模版设置 ([a6c0d2c](https://github.com/certd/certd/commit/a6c0d2c6f1fd6b60e6d7af290487c94564fd91ea))
* oidc支持使用第三方昵称或账号作为certd用户的用户名 ([b6fea0c](https://github.com/certd/certd/commit/b6fea0c8562abf912daa7d72958ceb2e93575d31))

## [1.37.15](https://github.com/certd/certd/compare/v1.37.14...v1.37.15) (2025-12-06)

### Bug Fixes

* oidc 支持nonce ([a5ca411](https://github.com/certd/certd/commit/a5ca41131b308b36b17ca359d9709ea8e9b7cee1))

### Performance Improvements

* 第三方登录支持gitee ([5cee7d4](https://github.com/certd/certd/commit/5cee7d44f17bd36972f477bc1f270999da558d05))
* 邮件模版安全优化 ([adca151](https://github.com/certd/certd/commit/adca151e4f07a4c6a2a753bfa48ee0d4d6469fd2))
* 支持部署到中国移动CDN ([4351304](https://github.com/certd/certd/commit/43513049beff407558d2a234415521464165cebc))
* 支持k8s apply ([d55954a](https://github.com/certd/certd/commit/d55954a36391ebe6a9397ff7dcfb710193ac5e34))

## [1.37.14](https://github.com/certd/certd/compare/v1.37.13...v1.37.14) (2025-12-02)

**Note:** Version bump only for package @certd/ui-server

## [1.37.13](https://github.com/certd/certd/compare/v1.37.12...v1.37.13) (2025-12-02)

### Bug Fixes

* 修复西部数据返回信息乱码问题 ([78b1650](https://github.com/certd/certd/commit/78b1650bdb071c858b3f90d53a700d11ee6de328))
* 修复西部数码使用域名级别的key申请证书失败的问题 ([5edc72d](https://github.com/certd/certd/commit/5edc72d47550b8e3364dabda70a41cce75d87956))

### Performance Improvements

* 第三方登录允许选择logo ([bb3085e](https://github.com/certd/certd/commit/bb3085ef84201ccd2dc632ba8c5097cb00258be4))
* 支持OIDC单点登录 ([fbf12f1](https://github.com/certd/certd/commit/fbf12f16b5eaa7676fd41923587bf6bd2595adba))

## [1.37.12](https://github.com/certd/certd/compare/v1.37.11...v1.37.12) (2025-11-29)

### Bug Fixes

* 修复waf tls版本号小写 ([0adcc6a](https://github.com/certd/certd/commit/0adcc6a8d194469be0c26940ed4837fb34929b68))

### Performance Improvements

* 支持微信扫码登录 ([73325aa](https://github.com/certd/certd/commit/73325aaefb0e750a22aaac40929e7bf3f5864996))

## [1.37.11](https://github.com/certd/certd/compare/v1.37.10...v1.37.11) (2025-11-28)

### Bug Fixes

* 修复阿里云 waf tlsVersion参数缺失导致部署失败的问题 ([2fabee6](https://github.com/certd/certd/commit/2fabee647acf64afe689f5bea3603028cd0ba4a2))
* 修复域名管理无法创建tencent-eo dns授权的bug ([3406bb5](https://github.com/certd/certd/commit/3406bb5a4a56bb310cddc1a1f410c70909fd129b))

### Performance Improvements

* 优化天翼云cdn 等待5秒部署完成 ([53c88ad](https://github.com/certd/certd/commit/53c88ad5afe66a3f7c38b9b759747918913a4edc))
* 支持oidc单点登录 ([ec75afb](https://github.com/certd/certd/commit/ec75afbc44139dbe9da534d8a8c08a5b91f86d3c))

## [1.37.10](https://github.com/certd/certd/compare/v1.37.9...v1.37.10) (2025-11-19)

### Performance Improvements

* 优化dokploy 部署插件，配置选择serverId ([c9709f2](https://github.com/certd/certd/commit/c9709f26981c1cc9f71c14babb204329fcae0db5))

## [1.37.9](https://github.com/certd/certd/compare/v1.37.8...v1.37.9) (2025-11-19)

### Performance Improvements

* 优化阿里云clb 过期证书清理报错的问题 ([d465367](https://github.com/certd/certd/commit/d4653678b2e3643460f918992eeae4044d3a1cc7))

## [1.37.8](https://github.com/certd/certd/compare/v1.37.7...v1.37.8) (2025-11-17)

### Bug Fixes

* **plugins/woai-cdn:** 修正默认接口域名与帮助链接中的路径 ([#576](https://github.com/certd/certd/issues/576)) @LjyLab ([d20046c](https://github.com/certd/certd/commit/d20046c86681ea177ece434423b7c81a76b437fb))

### Performance Improvements

* 修复西数解析记录添加失败的bug，支持部署证书到西数虚拟主机 ([1102952](https://github.com/certd/certd/commit/1102952b4703e8c0bbc17b0700c0ed3ef6f866d3))

## [1.37.7](https://github.com/certd/certd/compare/v1.37.6...v1.37.7) (2025-11-12)

### Performance Improvements

* 支持腾讯云teo dns解析 ([1d23dd2](https://github.com/certd/certd/commit/1d23dd2426bd1e4c4dfea0a9e561d665e045ba9d))

## [1.37.6](https://github.com/certd/certd/compare/v1.37.5...v1.37.6) (2025-11-10)

### Performance Improvements

* server 增加 "@peculiar/x509" 依赖 ([acdf091](https://github.com/certd/certd/commit/acdf0912d452029f158279fb78155086e4fbac17))

## [1.37.5](https://github.com/certd/certd/compare/v1.37.4...v1.37.5) (2025-11-08)

### Bug Fixes

* 修复某些情况下编辑流水线，没有立即展示变更效果的bug ([65e5309](https://github.com/certd/certd/commit/65e53092e8d677eb34b7d04d68c6f738165f5de2))
* 修复批量修改定时没有立即显示生效的bug ([c166602](https://github.com/certd/certd/commit/c16660254b8d637bd3ca100695934b343875fcbf))
* 修复新部署的无法保存公共eab配置的bug ([6b7631e](https://github.com/certd/certd/commit/6b7631ed5e920582d8e2162ec788b9429238ac29))

### Performance Improvements

* cname方式hostRecord增加user校验 ([bc174f7](https://github.com/certd/certd/commit/bc174f70545e487bd549eff250f8ef69c6d343f3))
* doge云插件支持选择CDN域名，以及支持同时部署多个域名 ([041954c](https://github.com/certd/certd/commit/041954c0674fabed54ed2cf5e727fecfb6943d19))
* doge云支持删除过期证书 ([335cf93](https://github.com/certd/certd/commit/335cf9397080a5e09074d5a89d03f59bd051cda5))

## [1.37.4](https://github.com/certd/certd/compare/v1.37.3...v1.37.4) (2025-10-28)

### Performance Improvements

* 优化数据备份效率，流式写入文件 ([c38dbbb](https://github.com/certd/certd/commit/c38dbbb1d72bd00a92fe275b76aea82a791e7199))

## [1.37.3](https://github.com/certd/certd/compare/v1.37.2...v1.37.3) (2025-10-24)

### Bug Fixes

* 修复网络测试，telnet的bug ([c03a70f](https://github.com/certd/certd/commit/c03a70fde23c8e840bd0fdb4fcbca8990f6c65eb))
* 修复站点证书监控，证书已经更新到最新日期了，仍然发出警告通知的bug ([1f42f93](https://github.com/certd/certd/commit/1f42f933f07860b27aa3d016e40916ff2b063eac))

### Performance Improvements

*  注册页面增加手机注册tab页签 ([6b2f1fc](https://github.com/certd/certd/commit/6b2f1fcd3e058061b814c3331cda8ce1b2d80d73))
* 流水线创建时支持添加到证书监控 ([59ba408](https://github.com/certd/certd/commit/59ba4080706548828ef1c0a9cd893c1c9a7d591f))
* 流水线支持有效期设置 ([911e69e](https://github.com/certd/certd/commit/911e69e3bc0cdd48b62953b5d0981d640fc1f8ac))
* 通知支持meow ([c77645e](https://github.com/certd/certd/commit/c77645e1733670214aaca5544cf8759d7e4adda4))
* 站点证书监控增加导出和分组功能 ([2ed12c4](https://github.com/certd/certd/commit/2ed12c429eb58274a4f9dd0ed3b66e160d283ded))
* 证书监控增加批量删除 ([e578c52](https://github.com/certd/certd/commit/e578c52fdf2f838038062aa4209b655fbae461fb))
* esa 自动删除过期证书提示 ([8bf1f82](https://github.com/certd/certd/commit/8bf1f828b9eaa9208f32e8ee7460b86420fed0c7))
* ssh 增加禁止-i参数提示 ([3a8931f](https://github.com/certd/certd/commit/3a8931feeffd7157163ff7d46b693e5e1a434b9c))

## [1.37.2](https://github.com/certd/certd/compare/v1.37.1...v1.37.2) (2025-10-14)

### Bug Fixes

* 修复飞牛证书部署后无法生效的bug ([bf156a1](https://github.com/certd/certd/commit/bf156a13bd443cdadb73c9dff79bbef7231b4401))
* aliyunoss 选择证书接入点选择新加坡无法上传的bug ([e00733a](https://github.com/certd/certd/commit/e00733a34644c23ffe926486b15dc96bf2fa4b57))

### Performance Improvements

* 增加飞牛证书id选择的提示 ([5a4d812](https://github.com/certd/certd/commit/5a4d8121462b1afe921d028465687be8c9679814))
* 证书监控支持设置证书即将过期天数 ([cd35568](https://github.com/certd/certd/commit/cd35568e042e6ab928685efad51cdbed823d2d4f))
* 支持网络测试 ([2bef608](https://github.com/certd/certd/commit/2bef608e07ceb56d52007f290667e0afef401b22))
* 支持新网代理方式 ([f612509](https://github.com/certd/certd/commit/f612509cac87b859e81a7a52fe94b2eaccad22f9))
* dns支持新网互联 ([f415190](https://github.com/certd/certd/commit/f41519048326d971acd9e0a30462231f77a299a6))

## [1.37.1](https://github.com/certd/certd/compare/v1.37.0...v1.37.1) (2025-09-29)

### Bug Fixes

* 修复某些情况下cname申请证书报错主域名不一致的bug ([2671781](https://github.com/certd/certd/commit/2671781e1bb0838981728d85eacf0e1a25a0fa48))

### Performance Improvements

* dns解析支持阿里esa ([9291fa6](https://github.com/certd/certd/commit/9291fa68aa7a88a05c2f888bf3048df36a8fbde3))

# [1.37.0](https://github.com/certd/certd/compare/v1.36.25...v1.37.0) (2025-09-28)

### Features

* dist打包前检查 ([8f6e5bd](https://github.com/certd/certd/commit/8f6e5bd24b3b65fbfcba36c08f532a3abad2d606))

## [1.36.25](https://github.com/certd/certd/compare/v1.36.24...v1.36.25) (2025-09-27)

### Bug Fixes

* 固定midwayjs版本，修复ui-server import 错误的bug ([eb4d125](https://github.com/certd/certd/commit/eb4d125eaf4a41e88c752d0c68993829589f8f27))

## [1.36.24](https://github.com/certd/certd/compare/v1.36.23...v1.36.24) (2025-09-27)

### Bug Fixes

* 修复 ui-server 加载失败问题 ([c2ccdbe](https://github.com/certd/certd/commit/c2ccdbec9dd08bca4688eeb2f34d0105eec43ba1))

### Performance Improvements

* 重置管理员密码同时会关闭验证码，防止验证码失效之后无法登录 ([03899d4](https://github.com/certd/certd/commit/03899d4d9c76fc2077dacc53ab88e2c9ca41af7c))

## [1.36.23](https://github.com/certd/certd/compare/v1.36.22...v1.36.23) (2025-09-26)

### Performance Improvements

* 开启子域名托管之后cname记录支持重置 ([54c8d62](https://github.com/certd/certd/commit/54c8d622437761d350db0f17e07f7517f1911211))
* 验证码支持测试，登录验证码需要测试通过后才能开启 ([83e6476](https://github.com/certd/certd/commit/83e6476408090b741fabb1b542fb458d9a8b4134))

## [1.36.22](https://github.com/certd/certd/compare/v1.36.21...v1.36.22) (2025-09-23)

### Performance Improvements

* 7001绑定::地址 ([7188997](https://github.com/certd/certd/commit/7188997dd1979f1c10fa29b30221015e0bd5fe9e))
* 公共cname支持权限校验 ([9cc5f0f](https://github.com/certd/certd/commit/9cc5f0f889d4362ff36e7a1f0e448e02d32ecee7))
* dns支持新网域名解析 ([cf3a78e](https://github.com/certd/certd/commit/cf3a78e1145ff0505c87fbc485d9e731b1aa88a8))
* gcore flush plugin ssl_id改为必填项 ([4b90972](https://github.com/certd/certd/commit/4b909723411c57505aa13b07d8699fb9ac77c937))

## [1.36.21](https://github.com/certd/certd/compare/v1.36.20...v1.36.21) (2025-09-15)

**Note:** Version bump only for package @certd/ui-server

## [1.36.20](https://github.com/certd/certd/compare/v1.36.19...v1.36.20) (2025-09-13)

### Bug Fixes

* 修复证书监控某些情况下报 options.lookup不能为null的bug ([d2ecfe5](https://github.com/certd/certd/commit/d2ecfe5491b2639eb30b5cae293af6062d58bb9f))
* 修复证书手动托管时新上传的证书无效的bug ([506385e](https://github.com/certd/certd/commit/506385e5a2600887fe30854e0713583caaa2e689))

### Performance Improvements

* 登录支持极验验证码 ([370db62](https://github.com/certd/certd/commit/370db62bf0aece241859244927beabba32d6a257))
* 登录注册、找回密码都支持极验验证码和图片验证码 ([7bdde68](https://github.com/certd/certd/commit/7bdde68ecea29fe2c570fd3cb082139db6c93d93))
* 证书到期剩余天数进度条根据实际证书有效期计算 ([#528](https://github.com/certd/certd/issues/528)) nicheng-he ([2d4586b](https://github.com/certd/certd/commit/2d4586b1c42c39f97d2a95b9453cca4bc8bfbe61))
* add preferred chain option ([#519](https://github.com/certd/certd/issues/519))  @ZeroClover  ([902359f](https://github.com/certd/certd/commit/902359f24ed12eee4f9b65178f1d6a60378351d2))

## [1.36.19](https://github.com/certd/certd/compare/v1.36.18...v1.36.19) (2025-09-05)

### Bug Fixes

* 前置任务输出不存在时输出警告提示 ([b59052c](https://github.com/certd/certd/commit/b59052cc43b7b070fabd8b8e914e4c2a5e0ad61c))
* 修复mysql下购买套餐加量包无效的bug ([c26ad4c](https://github.com/certd/certd/commit/c26ad4c8075f0606d45b8da13915737968d6191a))

### Performance Improvements

* 增加健康检查探针  /health/liveliness 和 /health/readiness ([44019e1](https://github.com/certd/certd/commit/44019e104289fedd32a867db00e9c6cb71b389cc))
* 支持根据id更新证书（证书Id不变接口），不过该接口为白名单功能，普通腾讯云账户无法使用 ([fe9c4f3](https://github.com/certd/certd/commit/fe9c4f3391ff07c01dd9a252225f69a129c39050))
* 支持godaddy ([b7980aa](https://github.com/certd/certd/commit/b7980aad5ab50f58662eaddf5d84aa82876a98eb))
* 支持ssl.com证书颁发机构 ([27b6dfa](https://github.com/certd/certd/commit/27b6dfa4d2ab3bddd284c3a34511a72e1a513a4c))

## [1.36.18](https://github.com/certd/certd/compare/v1.36.17...v1.36.18) (2025-08-28)

### Bug Fixes

* 更新我爱云CDN域名地址，和部分目录结构 [@tyjsjxh](https://github.com/tyjsjxh)  ([#514](https://github.com/certd/certd/issues/514)) ([78e7a81](https://github.com/certd/certd/commit/78e7a81638c2ee779f0ab6c3ba7e5c6f6e064151))
* 修复proxmox某些情况下执行卡住的bug ([ebd6917](https://github.com/certd/certd/commit/ebd6917a1d40ae4d94555c32b7e3c093d0599b94))

### Performance Improvements

* 部署到k8s支持自动创建secret ([c09c962](https://github.com/certd/certd/commit/c09c962cb676ca261610aa9f3e5105c9dae43f43))
* 短信验证码支持腾讯云 ([9108459](https://github.com/certd/certd/commit/9108459ae42bcd95a59acba164a64e82e5f2cfe6))
* 商业版支持自定义插件的参数配置 ([17f23f3](https://github.com/certd/certd/commit/17f23f37516af925d5049291d67d41e4271f81f8))
* 腾讯云插件支持国际版 ([58e82d5](https://github.com/certd/certd/commit/58e82d5dbd4ebf089ef239578ef9b68454d17b30))
* 腾讯云EO插件支持自动获取zoneid和域名列表 ([70fcdc9](https://github.com/certd/certd/commit/70fcdc9ebbfb7c883c0c8a2138f61a0776a9491b))
* 支持部署到阿里云云原生API网关、AI网关 ([2ca20be](https://github.com/certd/certd/commit/2ca20be197720201fceabcce9d927f4dbc1cc872))
* 支持部署到华为云obs ([9feb9d0](https://github.com/certd/certd/commit/9feb9d04b3c56ec95c06fcf4fd071eb0e88ffc6f))
* 支持部署到dokploy ([7dbdeae](https://github.com/certd/certd/commit/7dbdeaebe0bfee7521a863fe5e6b4a712aec5876))
* 支持删除宝塔证书夹中的过期证书 ([3575113](https://github.com/certd/certd/commit/3575113655be751d19f88c64491e98a89042d6a2))
* 支持p7b证书格式 ([d9f4a57](https://github.com/certd/certd/commit/d9f4a5793d68a017a5d80ad5385cbda603c4e165))
* lecdnv2支持api token ([e448934](https://github.com/certd/certd/commit/e4489343fee7754be07bcfc3323969dc3a30e90c))
* openapi返回证书时挑选匹配范围最小的那一个；增加format参数，增加返回值p7b格式，增加detail返回 ([2085bcc](https://github.com/certd/certd/commit/2085bcceb61c3723c9bdfec4c4cc0917631ff5e5))

## [1.36.17](https://github.com/certd/certd/compare/v1.36.16...v1.36.17) (2025-08-17)

### Bug Fixes

* 修复新部署的无法保存公共eab配置的bug ([d5dee75](https://github.com/certd/certd/commit/d5dee75df3bd635a597436e448b2de1407531f3a))

### Performance Improvements

* 阿里云 FC3.0 不在要求证书加密方式为旧版， 修复支持的协议类型可以正常选择 ([a34db74](https://github.com/certd/certd/commit/a34db7449eff6ad1dda01de673bf85579fa3865a))
* 部署到腾讯云cdn，每个域名增加3每秒延迟 ([f7d43ad](https://github.com/certd/certd/commit/f7d43ad5af4663d4be369820a80d1fd9817ca4ab))

## [1.36.16](https://github.com/certd/certd/compare/v1.36.15...v1.36.16) (2025-08-16)

### Performance Improvements

* 百度云支持上传到证书托管，支持部署到负载均衡 ([798a48a](https://github.com/certd/certd/commit/798a48aa9686fd5d11cfffb6cd93eadfc40aacb3))
* 验证码可重试次数设置为3次 ([1bdceee](https://github.com/certd/certd/commit/1bdceeecf4b5daecdd621a05a2596b6eb45ce8ea))
* 增加找回密码的验证码可重试次数 [@nicheng-he](https://github.com/nicheng-he)  ([#496](https://github.com/certd/certd/issues/496)) ([fe03f99](https://github.com/certd/certd/commit/fe03f9942b5662fb90cad86da10782f5dc3603f5))
* 支持阿里云API网关 ([9e1e4ee](https://github.com/certd/certd/commit/9e1e4eeec2859759ca5b07834c9d24cf88a6ad33))
* 支持部署到金山云CDN ([dfa74a6](https://github.com/certd/certd/commit/dfa74a69f7cbb9009d3e20c7eecfa1b905a00cf0))
* 支持更新金山云cdn证书 ([462e22a](https://github.com/certd/certd/commit/462e22a3b0a94887462fe6aa68e4671a365e0737))
* 支持apisix证书部署 ([9b63fb4](https://github.com/certd/certd/commit/9b63fb4ee2c6b56139160c5bf63482dab0869c2b))

## [1.36.15](https://github.com/certd/certd/compare/v1.36.14...v1.36.15) (2025-08-07)

### Bug Fixes

* 修复  https://cas.undefined.aliyuncs.com 的bug ([60e6aa9](https://github.com/certd/certd/commit/60e6aa9b54a761a47e39acee4a1ff947a745be27))
* 修复阿里云clb api接口没有使用region的问题 ([0770f17](https://github.com/certd/certd/commit/0770f174a14313e28d08113e69829ef6cc02d719))
* 修复站点监控使用自定义dns解析域名报错的bug ([eb8cd53](https://github.com/certd/certd/commit/eb8cd53de27991321e36dd14e5ce95f42b51351f))

### Performance Improvements

* 部署到阿里云支持选择bucket和域名 ([013b9c4](https://github.com/certd/certd/commit/013b9c4c7c2adf485d086123ccea448719577fd4))
* 清理数据库备份的临时目录 ([fd95549](https://github.com/certd/certd/commit/fd95549de9a5d8cec09772ee2630bb7521e15e1f))
* 添加免费通知,OneBot V11协议通知支持 ([#491](https://github.com/certd/certd/issues/491)) [@ayakasuki](https://github.com/ayakasuki)  ([be053d4](https://github.com/certd/certd/commit/be053d47e41084f817882400882b64143d036d1a))
* 支持webhook部署证书 ([cbe0b1c](https://github.com/certd/certd/commit/cbe0b1c5a6538f232e9a63f1693d20d5acf0a306))
* 注册时支持填写用户名 ([fdcfcc7](https://github.com/certd/certd/commit/fdcfcc77a0db87954e0b026635d3ccdd9bc6cee8))

## [1.36.14](https://github.com/certd/certd/compare/v1.36.13...v1.36.14) (2025-07-28)

### Performance Improvements

* 授权管理支持模糊查询 ([866eb62](https://github.com/certd/certd/commit/866eb6241baa7b21f6eddc649966324c188236c6))
* 新增找回密码功能 [@nicheng-he](https://github.com/nicheng-he) ([81ac240](https://github.com/certd/certd/commit/81ac240ac84db0af2f56b6352e227ecb49f38377))
* 运行主机脚本插件支持选择运行策略 ([86b3df1](https://github.com/certd/certd/commit/86b3df194126476e1f58e0952a77e986f62eecce))

## [1.36.13](https://github.com/certd/certd/compare/v1.36.12...v1.36.13) (2025-07-23)

### Performance Improvements

* 阿里云部分插件优化  [@nicheng-he](https://github.com/nicheng-he) ([e3738f6](https://github.com/certd/certd/commit/e3738f6422270d75ec414c15a343248cc4cad6e1))

## [1.36.12](https://github.com/certd/certd/compare/v1.36.11...v1.36.12) (2025-07-22)

### Bug Fixes

* 上传到阿里云cas，证书前缀无效的bug ([b382351](https://github.com/certd/certd/commit/b382351c7b91ec10e1f61d94bec5aad075207ec8))

### Performance Improvements

* 部署到k8s，tke，ack忽悠证书校验 ([ab84835](https://github.com/certd/certd/commit/ab848353621869464a2c9a45fdb5e28d998b8a58))

## [1.36.11](https://github.com/certd/certd/compare/v1.36.10...v1.36.11) (2025-07-22)

### Bug Fixes

* 安全更新，备份数据库插件仅限管理员运行 ([13dfca1](https://github.com/certd/certd/commit/13dfca1749275526c82465a17c482b607c820fdd))

## [1.36.10](https://github.com/certd/certd/compare/v1.36.9...v1.36.10) (2025-07-18)

### Bug Fixes

* 企业微信通知改成text类型，因为markdown类型不支持@用户 ([747d266](https://github.com/certd/certd/commit/747d26674248082e678a3fd5ecc94712641a2716))
* api接口获取不到证书的bug ([05a33a0](https://github.com/certd/certd/commit/05a33a0ec9999e2802f6c7b23cc1c61a2b9e963d))

### Performance Improvements

* 部署到阿里云oss插件支持选择上传到阿里云cas中的证书 ([2ea2c8c](https://github.com/certd/certd/commit/2ea2c8c05fc40f79595f1bbde67c1413558bf684))
* 账号即将过期通知 ([e403450](https://github.com/certd/certd/commit/e40345095f31e2fb8e2333a6647466659133fa0c))
* 子域名托管重复域名不允许添加 ([ffc0c7b](https://github.com/certd/certd/commit/ffc0c7bb7b16d9904fd2d905d1c4e1d4854e92a9))

## [1.36.9](https://github.com/certd/certd/compare/v1.36.7...v1.36.9) (2025-07-15)

**Note:** Version bump only for package @certd/ui-server

## [1.36.7](https://github.com/certd/certd/compare/v1.36.6...v1.36.7) (2025-07-15)

### Bug Fixes

* 修复流水线列表页报length错误的bug ([9864792](https://github.com/certd/certd/commit/9864792bbfd149e770d6e1ffa809573694f99dd3))
* 修复流水线页面状态没有刷新的bug ([93e9498](https://github.com/certd/certd/commit/93e9498b410353f504e11e264db62468895d7290))
* 修复自定义证书检查时间重启之后不生效的bug ([38e867c](https://github.com/certd/certd/commit/38e867c917bbc68bd228bdd8064f3e7358d6413d))

### Performance Improvements

* 支持上传证书到各种对象存储，oss、cos、七牛、s3、minio等 ([1da8617](https://github.com/certd/certd/commit/1da8617a53a675776635bbc3bcb3c6d7dff83e27))
* 支持邮箱发送证书 ([95332d5](https://github.com/certd/certd/commit/95332d5db96cd54ddab6ab737332417a09169b39))

## [1.36.6](https://github.com/certd/certd/compare/v1.36.5...v1.36.6) (2025-07-14)

### Performance Improvements

* 优化流水线列表页面、详情页面性能，精简返回数据 ([609ac9c](https://github.com/certd/certd/commit/609ac9c9a2dde605eb09834ae59693c1cb238765))
* 支持自动选择校验方式申请证书 ([3f99432](https://github.com/certd/certd/commit/3f9943270cfb12946e38e6272bc5e8d95ad6ab9e))
* OpenAPI支持autoApply参数 ([42f4d14](https://github.com/certd/certd/commit/42f4d1477dc791520a874aed56035abcbc8c433b))

## [1.36.5](https://github.com/certd/certd/compare/v1.36.4...v1.36.5) (2025-07-11)

### Bug Fixes

* 某些插件找不到的bug ([4b3f4a8](https://github.com/certd/certd/commit/4b3f4a868a8b0800c5c59de9d0f47bddc079e7b3))

## [1.36.4](https://github.com/certd/certd/compare/v1.36.3...v1.36.4) (2025-07-10)

### Performance Improvements

* 站点证书即将过期通知标题颜色优化为红色 ([80c5331](https://github.com/certd/certd/commit/80c5331a5d4c320323d9b9b800e4ea3b72577b33))
* 支持部署到阿里云vod ([98da4e1](https://github.com/certd/certd/commit/98da4e1791ed8bb21daf2a9914fda875d14633c9))
* 支持部署证书到网宿CDN ([c3da026](https://github.com/certd/certd/commit/c3da026b33106f5195959825a68cadbe49efef00))
* 重置管理员密码同时可以清除管理员的2FA设置 ([1ece091](https://github.com/certd/certd/commit/1ece0915f172d5f8b8adb866434e7efcc5c8c46d))
* output-selector from参数支持更丰富的过滤规则 ([87853a2](https://github.com/certd/certd/commit/87853a201535f3bfe8505c40f8f5229d82ffcc73))

## [1.36.3](https://github.com/certd/certd/compare/v1.36.2...v1.36.3) (2025-07-07)

### Performance Improvements

* 优化部署到腾讯TKE插件，支持Opaque类型选择，优化填写说明 ([1445325](https://github.com/certd/certd/commit/144532530a865b634e68539e4888e26f52f73492))

## [1.36.2](https://github.com/certd/certd/compare/v1.36.1...v1.36.2) (2025-07-06)

### Bug Fixes

* 优化更新飞牛os证书有效期，修复某些情况下部署证书后飞牛无法访问https的bug ([610c919](https://github.com/certd/certd/commit/610c919c72037becc0ed326f5d5b18c963dfcb3a))

### Performance Improvements

* 证书检查支持自定义dns服务器 ([c53bb7c](https://github.com/certd/certd/commit/c53bb7cf677faa32729709ae0c10359db5194d7a))

## [1.36.1](https://github.com/certd/certd/compare/v1.36.0...v1.36.1) (2025-07-02)

### Performance Improvements

* 支持部署到七牛云DCDN ([bde601b](https://github.com/certd/certd/commit/bde601bfffb4f7345d97e1e3b064520816d31555))

# [1.36.0](https://github.com/certd/certd/compare/v1.35.5...v1.36.0) (2025-07-01)

### Bug Fixes

* 支持自定义证书生成插件 ([481cc02](https://github.com/certd/certd/commit/481cc029fafaf280aa844cd3ca30f4653ec35d55))

### Features

* 支持模版创建流水线 ([2559f0e](https://github.com/certd/certd/commit/2559f0e822db095d1d26a7f1d517622dce22a5c2))

### Performance Improvements

* 阿里云waf cname站点选择支持翻页及域名查询 ([4cf9858](https://github.com/certd/certd/commit/4cf98584dacc5999752732f136246647a2f1f07d))
* 部署到ssh主机命令支持前置命令 ([991b741](https://github.com/certd/certd/commit/991b741cbe223b342f534157da63b71e81661f8e))
* 模版导入流水线 ([dcc8c56](https://github.com/certd/certd/commit/dcc8c569693432579709ce63656665a76bcf9a44))
* 添加用户资料编辑功能 ([7c0f43c](https://github.com/certd/certd/commit/7c0f43c8a3052f73afee3e93c9fcbc43c44ab690))
* 优化阿里云waf的日志信息 ([821c6d8](https://github.com/certd/certd/commit/821c6d807d4b3cc5092d09a6282b8cbafb9e7c9f))
* 站点IP监控前先同步一下IP ([a080b60](https://github.com/certd/certd/commit/a080b606ab6e289d96b17ef7d2879b4603f889ba))
* 支持选择运行策略设置 ([60f055f](https://github.com/certd/certd/commit/60f055f293ce237c21cd9050333dad9609eceac1))

## [1.35.5](https://github.com/certd/certd/compare/v1.35.4...v1.35.5) (2025-06-20)

### Bug Fixes

* 腾讯云授权支持设置是否国际站，部署到EO插件支持国际站 ([5cd3968](https://github.com/certd/certd/commit/5cd3968929acef333cf30d3b20cf21cea6c82c5f))

### Performance Improvements

* 支持批量修改通知和定时 ([e11b3be](https://github.com/certd/certd/commit/e11b3becfd4abe6547e84d09adc38ebd6e1c4b87))

## [1.35.4](https://github.com/certd/certd/compare/v1.35.3...v1.35.4) (2025-06-13)

### Performance Improvements

* 支持s3 access做测试 ([f00aeac](https://github.com/certd/certd/commit/f00aeacb8b5c81f0bafa4c1b76723dec2b6b7784))

## [1.35.3](https://github.com/certd/certd/compare/v1.35.2...v1.35.3) (2025-06-12)

### Bug Fixes

* 修复重试次数设置无效的bug ([e2099ac](https://github.com/certd/certd/commit/e2099ac9ca344bc70bfa4219002e9138708973ae))

### Performance Improvements

* 支持雨云dns解析 ([8354348](https://github.com/certd/certd/commit/83543487e7418683bd79cfe3b9e0d792bdb977f7))
* 支持雨云dns解析以及雨云证书更新 ([43c7a19](https://github.com/certd/certd/commit/43c7a1984926f5d4647760cc134bb0aede3a7b7a))
* github 版本检查支持执行脚本 ([bad3504](https://github.com/certd/certd/commit/bad3504d4a15e6989b967b66aa9da8c6981f25bf))

## [1.35.2](https://github.com/certd/certd/compare/v1.35.1...v1.35.2) (2025-06-09)

### Bug Fixes

* 修复阿里云新加坡clb无法部署证书的bug ([c1fbc8c](https://github.com/certd/certd/commit/c1fbc8cd68ae020ef342e4e92f4d9b4869ca1ead))
* 修复阿里云新加坡clb无法部署证书的bug ([3e84e11](https://github.com/certd/certd/commit/3e84e116e863b54c6b4d7db160af372dacc5857f))
* 修复检查github release 插件无法保存最后版本的bug ([a92107c](https://github.com/certd/certd/commit/a92107cc47133883b099d5228b06373e84c8bb50))
* 修复站点监控定时器多次添加的bug ([9361679](https://github.com/certd/certd/commit/936167972fe83e519bc01a0dd961d9c0635d24ab))

### Performance Improvements

* 阿里云dns操作增加重试机制 ([424fd96](https://github.com/certd/certd/commit/424fd96615c05e949af8c837c261c1400bdffba2))
* 优化阿里云nlb支持部署扩展证书 ([9cbdfda](https://github.com/certd/certd/commit/9cbdfda829b231733d54c66c5024d46e6fc11af3))
* history增加触发类型显示 ([7f6070c](https://github.com/certd/certd/commit/7f6070c960ed7bf02add5ab36436de6573f2f1fa))

## [1.35.1](https://github.com/certd/certd/compare/v1.35.0...v1.35.1) (2025-06-07)

### Bug Fixes

* 修复站点监控通知渠道设置无效的bug ([a00453c](https://github.com/certd/certd/commit/a00453c83a58114ce2873dd6e6aaf313f1ce0f87))

### Performance Improvements

* 修改 HTTPS 服务器监听地址 ([e1cf64a](https://github.com/certd/certd/commit/e1cf64ae16d4abfe4299ff16d5088c30cf3c6365))
* 优化流水线页面，增加下次执行时间、查看证书显示 ([c820315](https://github.com/certd/certd/commit/c8203154094fae3d17198747f49f5f41ddf29a4e))
* 站点证书监控支持定时设置，重试次数设置 ([d3c2f8e](https://github.com/certd/certd/commit/d3c2f8eb436e670772d14a54acd6b541c5aa3978))
* aliyun alb支持部署扩展证书 ([2a19b61](https://github.com/certd/certd/commit/2a19b61b7a78620c06396c2cc37cc77d738b6d12))

# [1.35.0](https://github.com/certd/certd/compare/v1.34.11...v1.35.0) (2025-06-05)

### Features

* 完善注释 ([6702ca1](https://github.com/certd/certd/commit/6702ca10a17f5d7dbff789b039f7269496f66b97))
* AWS 中国区 CloudFront 证书部署（IAM 证书） ([8a55bed](https://github.com/certd/certd/commit/8a55beda924b3be2a53b9ba80d9487cefa8bf887))

## [1.34.11](https://github.com/certd/certd/compare/v1.34.10...v1.34.11) (2025-06-05)

### Bug Fixes

* 修复用户最大流水线数量校验的问题 ([919f70a](https://github.com/certd/certd/commit/919f70a5fd2842ca69f96f1659bb5a7ba3f73776))
* 修复中文域名使用cname方式校验无法通过的问题 ([f7d5baa](https://github.com/certd/certd/commit/f7d5baa6d04cb83c572b06e62f885890cfa0143a))
* 修复cv4pve sdk (proxmox插件连接失败时无法正常结束任务的bug) ([49f26b4](https://github.com/certd/certd/commit/49f26b4049a0549b0270395157e96e8f04a68bc4))
* 修复flexcdn部署证书的顶级CA名称显示 ([6467edb](https://github.com/certd/certd/commit/6467edb84324d7c80a85212675dbacedc459df83))
* 修复flexcdn证书commonNames错误的问题 ([ace363f](https://github.com/certd/certd/commit/ace363fa355436e769b27f71cc487d30d6441780))

### Performance Improvements

* 分组选择支持清空选项 ([03e2e99](https://github.com/certd/certd/commit/03e2e9949837b34eb3ea56d14a9e8a5dabc96063))
* 优化cname检查，当有冲突的cname记录时，给出提示 ([e639a8f](https://github.com/certd/certd/commit/e639a8f9f12640ffcca69f1a6a0324459924afbd))
* 站点监控支持批量导入域名和ip ([2d7729d](https://github.com/certd/certd/commit/2d7729dbe98f29088f5f317db2b52cc1ede223a6))
* 支持设置用户有效期 ([6ac3bc5](https://github.com/certd/certd/commit/6ac3bc564f407dad2cd0b0b0744e887387aa5da3))

## [1.34.10](https://github.com/certd/certd/compare/v1.34.9...v1.34.10) (2025-06-03)

### Bug Fixes

* **flexcdn:** fix cert upload and skipSslVerify required ([c48da5d](https://github.com/certd/certd/commit/c48da5dea7f0f0cdeae643b106b4a678acc3b14b))

### Performance Improvements

* 阿里云CLB支持部署到扩展域名 ([0e8339c](https://github.com/certd/certd/commit/0e8339c70190890d449099e1d26e5ed06ff135fb))
* 支持部署到飞牛OS ([ddfd0fb](https://github.com/certd/certd/commit/ddfd0fb81d6638352920261065f1ab8e27bdd564))
* 支持日志写入文件 ([37edbf5](https://github.com/certd/certd/commit/37edbf5824d6aaae68ea1ef7259c6f739d418d2c))

## [1.34.9](https://github.com/certd/certd/compare/v1.34.8...v1.34.9) (2025-05-30)

### Bug Fixes

* 修复Farcdn证书有效期错误的问题 ([1fe4c36](https://github.com/certd/certd/commit/1fe4c367f7128de9ba5e3395ae06bc81e63a7d5a))

### Performance Improvements

* 不止证书自动化，插件解锁无限可能 ([a9b302e](https://github.com/certd/certd/commit/a9b302e38d3328d75df8b2da3d8b914851e55e9c))
* 邮箱支持保存和选择 ([f7b0b44](https://github.com/certd/certd/commit/f7b0b44ef6044bec36510a6f0b06d8dca5bfce49))
* 支持github 新版本检查并发布通知 ([356703c](https://github.com/certd/certd/commit/356703c83ea18c6efb8931402e181280d7b7e696))

## [1.34.8](https://github.com/certd/certd/compare/v1.34.7...v1.34.8) (2025-05-28)

### Bug Fixes

* 更新 1panel API 版本支持v1/v2设置 ([e6195ad](https://github.com/certd/certd/commit/e6195ade3ec54b138825b8d6738f86eb8afdd720))
* 同步更新namesilo接口，修复无法创建和删除dns记录的问题 ([36b02c2](https://github.com/certd/certd/commit/36b02c2cec145c13d4ef29d49aba5b6b4f697df2))
* 修复阿里云 esa 证书获取站点列表错误的问题 ([0c2ea5d](https://github.com/certd/certd/commit/0c2ea5da4c836f8a0df132a3f22d399bd9ee1de9))
* 修复部署到华为cdn，子账号ak查询不到域名的bug ([ebb292a](https://github.com/certd/certd/commit/ebb292a2f7a425c1bc810f59468beb3f1d5bc3f0))

### Performance Improvements

* 关闭腾讯云证书通知提醒 ([231a875](https://github.com/certd/certd/commit/231a875bb481420c39bf76ec9ff4e50954ab9fe4))
* 优化站点选择组件，切换选择时不刷新列表 ([3a14714](https://github.com/certd/certd/commit/3a147141b1a5d67c92a5ce88a5313eaa62859e03))
* 优化站点ip检查 ([a463711](https://github.com/certd/certd/commit/a463711b03a20120f2a298be15d71ca152d27f21))
* 站点监控支持监控IP ([9cc4c01](https://github.com/certd/certd/commit/9cc4c017ae646a18284e732769b82636feda01d3))
* 支持批量重新运行 ([8189982](https://github.com/certd/certd/commit/818998259ddc75e722196ac5c365038818539b9b))
* farcdn优化 ([a06ef07](https://github.com/certd/certd/commit/a06ef07178ed73c537e21c7d57e5e5144d2c056d))

## [1.34.7](https://github.com/certd/certd/compare/v1.34.6...v1.34.7) (2025-05-26)

### Performance Improvements

* 优化阿里云DCDN插件，支持多选 ([b091657](https://github.com/certd/certd/commit/b091657b5c537acf2442a2bfc345d0a77f5e2c50))
* 支持部署到farcdn ([e08cf57](https://github.com/certd/certd/commit/e08cf57b72128998f487ab6469868052fbce0dba))

## [1.34.6](https://github.com/certd/certd/compare/v1.34.5...v1.34.6) (2025-05-25)

### Bug Fixes

* 修复又拍云 CDN 设置证书参数和强制 HTTPS 配置报错的bug ([7984b62](https://github.com/certd/certd/commit/7984b625ba6727132f205db8e25f790bce27b2f7))

### Performance Improvements

* 添加阿里云 ESA证书部署插件 ([1db1ffd](https://github.com/certd/certd/commit/1db1ffde99ac7e4684fa606ebc4c327f829b3a26))
* 站点证书监控增加通知设置 ([3422a1a](https://github.com/certd/certd/commit/3422a1a59fd0d2c0f17fa9c7e8988ac527ecfdd9))

## [1.34.5](https://github.com/certd/certd/compare/v1.34.4...v1.34.5) (2025-05-19)

### Performance Improvements

* 1panel增加授权测试按钮 ([566b12f](https://github.com/certd/certd/commit/566b12f5d14ce10e8f5cf1807c58f7bf27f0d199))
* 优化钉钉通知标题颜色 ([a560999](https://github.com/certd/certd/commit/a560999d13eed18d08dd32ee530166569e3f8746))
* 优化飞书通知为卡片模式 ([a818a3d](https://github.com/certd/certd/commit/a818a3d293e22fb46979bc77055c05621a6fed81))

## [1.34.4](https://github.com/certd/certd/compare/v1.34.3...v1.34.4) (2025-05-16)

### Bug Fixes

* 修复部署flexcdn问题 ([76b19a4](https://github.com/certd/certd/commit/76b19a4980f8edba5238543b82a7811e1003746c))
* 修复插件导入的bug ([677fec0](https://github.com/certd/certd/commit/677fec0a0b6fceb4966705e471bbfeeda91610c7))
* 修复导入在线插件不生效的bug ([fcf8309](https://github.com/certd/certd/commit/fcf8309c238208281ecb4575b2c3cfe50c11d783))
* 修复自建插件保存丢失部署策略的bug ([863e74d](https://github.com/certd/certd/commit/863e74dd2e3912f950ff5025b5ed0070aeb37035))

## [1.34.3](https://github.com/certd/certd/compare/v1.34.2...v1.34.3) (2025-05-15)

### Performance Improvements

* 添加 FlexCDN 更新证书插件 ([bf040d4](https://github.com/certd/certd/commit/bf040d4c428d29c06fbaca5e29100e0c583b2b0b))

## [1.34.2](https://github.com/certd/certd/compare/v1.34.1...v1.34.2) (2025-05-11)

### Bug Fixes

* 修复部署到又拍云强制https无效的bug ([2397097](https://github.com/certd/certd/commit/2397097e4ddcb6f593210598e8779ffd44ac3f8f))

## [1.34.1](https://github.com/certd/certd/compare/v1.34.0...v1.34.1) (2025-05-05)

### Bug Fixes

* 根据SOA记录判断子域名托管有缺陷，改回手动配置子域名托管记录的方式 ([1b280a2](https://github.com/certd/certd/commit/1b280a2940f9e2d919b0bf23b89cc185be1fa498))

### Performance Improvements

* 支持部署证书到火山dcdn ([5f85219](https://github.com/certd/certd/commit/5f852194953dc1b4e6336770f417507b8f5a33ad))
* 支持部署证书到unicloud ([a63d687](https://github.com/certd/certd/commit/a63d687f1c573159f0857693f37602b0e1e44072))

# [1.34.0](https://github.com/certd/certd/compare/v1.33.8...v1.34.0) (2025-04-28)

### Bug Fixes

* 修复二次认证登录进入错误账号的bug ([e3930e0](https://github.com/certd/certd/commit/e3930e07172dd7903cb0f6ff26e0e3e828ba3e77))

### Features

* 从yaml文件注册插件 ([deb3893](https://github.com/certd/certd/commit/deb38938204b29543f36d3266249958faaaa6b66))

### Performance Improvements

* 优化cdnfly插件，支持自动匹配域名部署 ([afd59e9](https://github.com/certd/certd/commit/afd59e9933b2650f41c5d47684c171b93b962065))

## [1.33.8](https://github.com/certd/certd/compare/v1.33.7...v1.33.8) (2025-04-26)

### Performance Improvements

* 数据库备份支持oss ([308d460](https://github.com/certd/certd/commit/308d4600efe2002f199c33b4594d3071784e58ea))
* 支持反向代理增加contextPath路径 ([0088929](https://github.com/certd/certd/commit/0088929622160cc922995de9a563e8061686ff34))
* 支持中文域名 ([162ebfd](https://github.com/certd/certd/commit/162ebfd4e0c25727efb33952d3bbf7420a02e2c3))

## [1.33.7](https://github.com/certd/certd/compare/v1.33.6...v1.33.7) (2025-04-22)

### Performance Improvements

* 添加部署证书至火山 Live ([abea80e](https://github.com/certd/certd/commit/abea80e3ab9b1672aebe1c5d5e856693b29931a8))
* 证书申请支持51dns ([8638fc9](https://github.com/certd/certd/commit/8638fc91ff34fccaf12ff9874fd3fa9d2a8c18b7))
* 支持51dns ([96a0900](https://github.com/certd/certd/commit/96a0900edc95dcfd9acccf9d13592f12f5a09b3d))

## [1.33.6](https://github.com/certd/certd/compare/v1.33.5...v1.33.6) (2025-04-20)

### Bug Fixes

* 上传商用证书，直接粘贴文本报错的问题；修复无法上传ec加密证书的bug ([5750bb7](https://github.com/certd/certd/commit/5750bb706779da274d8e7a87e71416cb64d2df79))
* 修复下载证书时提示token已过期的问题 ([0e07ae6](https://github.com/certd/certd/commit/0e07ae6ce84dcb9279d3c44060d621566afa593c))

### Performance Improvements

* 新增部署到火山引擎ALB/CLB、上传到证书中心 ([c9a3e3d](https://github.com/certd/certd/commit/c9a3e3d9d26f964c7af7b56667936f1414fbf42a))
* 优化/api缓存为0 ([dc05cd4](https://github.com/certd/certd/commit/dc05cd481f186b13375192be965000e6b4b429a5))
* 优化华为cdn插件引用ccm证书 ([b565b4b](https://github.com/certd/certd/commit/b565b4b3b919b71b98ea2517670bc1ef00e00dc9))

## [1.33.5](https://github.com/certd/certd/compare/v1.33.4...v1.33.5) (2025-04-17)

### Performance Improvements

* 登录支持双重认证 ([48aef25](https://github.com/certd/certd/commit/48aef25b3f6499d674ca4e4ef16f4c62399fb735))
* 多重认证登录 ([0f82cf4](https://github.com/certd/certd/commit/0f82cf409bc60706ab07e4ca4f272b9a1ca7eecb))
* 优化部署到华为云CDN，支持先上传到ccm，再使用证书id部署，修复offline状态下导致部署报错的bug ([79df39a](https://github.com/certd/certd/commit/79df39acabab10ae7e1864dadcdc186bb007a3c5))

## [1.33.4](https://github.com/certd/certd/compare/v1.33.3...v1.33.4) (2025-04-15)

### Bug Fixes

* 补充类型断言 ([2143dff](https://github.com/certd/certd/commit/2143dff2ae96e6a78bef9f0498e36f8cd9e6941f))
* 修复腾讯云部署到任意资源插件，无法使用之前已上传的腾讯云证书问题 ([32c714d](https://github.com/certd/certd/commit/32c714d1b6e68c71a74a7452115040c87ac4bfdc))

### Performance Improvements

* 插件支持导入导出 ([cf8abb4](https://github.com/certd/certd/commit/cf8abb45282070c8ba91469f93fd379fabf1f74a))
* 支持上传证书到华为云CCM ([cfd3b66](https://github.com/certd/certd/commit/cfd3b66be9ebf53a26693057e70ed60c3f116be9))

## [1.33.3](https://github.com/certd/certd/compare/v1.33.2...v1.33.3) (2025-04-14)

### Bug Fixes

* 修复登录错误次数过多阻止再次登录逻辑 ([bf4d191](https://github.com/certd/certd/commit/bf4d191c8bd2f9209eb6768f662b9c77de99e998))

## [1.33.2](https://github.com/certd/certd/compare/v1.33.1...v1.33.2) (2025-04-12)

### Performance Improvements

* 修复内置插件分页查询逻辑 ([a2710dd](https://github.com/certd/certd/commit/a2710ddc2525e4e637fd157f0180e6d3b801c8be))

## [1.33.1](https://github.com/certd/certd/compare/v1.33.0...v1.33.1) (2025-04-12)

### Bug Fixes

* 修复阿里云cdn证书部署失败问题，增加certname参数传入 ([965dc2c](https://github.com/certd/certd/commit/965dc2cb476f690af716f291c6b20ba98be0c8f0))

# [1.33.0](https://github.com/certd/certd/compare/v1.32.0...v1.33.0) (2025-04-11)

### Bug Fixes

* 升级mysql驱动，支持mysql8最新版本的认证 ([2f5ed3a](https://github.com/certd/certd/commit/2f5ed3aead97641f2c80d692a50226839016df0b))

### Features

* 支持在线自定义插件，无需源码开发 ([d0d9d68](https://github.com/certd/certd/commit/d0d9d68fe6740f6ff49fe40b7c9917c5a2e4b442))

### Performance Improvements

* 隐藏运行策略选项 ([2951df0](https://github.com/certd/certd/commit/2951df0cd94c23e2efee84ff1b843055aac56cae))

# [1.32.0](https://github.com/certd/certd/compare/v1.31.11...v1.32.0) (2025-04-04)

### Bug Fixes

* 创建cname记录移除域名两端的空格 ([903a413](https://github.com/certd/certd/commit/903a4131ab5f42c8286cd2150ed1032d486fda2f))

### Performance Improvements

* 优化华为dns解析记录创建和删除问题 ([0948c5b](https://github.com/certd/certd/commit/0948c5bc691d2ee6eb47c72a85da1b7453361878))
* 又拍云支持云存储 ([9339b78](https://github.com/certd/certd/commit/9339b78f801d193472c0af25749e8e7a27ffb7af))
* 又拍云支持云存储 ([8449f85](https://github.com/certd/certd/commit/8449f8580da90c1f6b5d02d07c3236ebaf6cf161))

## [1.31.11](https://github.com/certd/certd/compare/v1.31.10...v1.31.11) (2025-04-02)

### Performance Improvements

* 支持部署到京东云cdn ([6f17c70](https://github.com/certd/certd/commit/6f17c700b84965baa01b40fe2abaa0a91bcbaffd))
* 支持京东云dns申请证书 ([04d79f9](https://github.com/certd/certd/commit/04d79f9117670be504960b018fd49ae3bf7c1c11))

## [1.31.10](https://github.com/certd/certd/compare/v1.31.9...v1.31.10) (2025-03-29)

### Performance Improvements

* 升级lego版本到4.22.2 ([4e15556](https://github.com/certd/certd/commit/4e15556e5e8100719497edb1729570d5a29668e1))

## [1.31.9](https://github.com/certd/certd/compare/v1.31.8...v1.31.9) (2025-03-28)

### Bug Fixes

* 修复华为云dns接口请求出错的bug ([caa15b4](https://github.com/certd/certd/commit/caa15b47355363cbb8847f415ff12363cd53eeda))
* 修复某些情况下站点证书监控报undefined.includes的错误 ([0b6618f](https://github.com/certd/certd/commit/0b6618ff709322a0eeba78953c8c6e9d073d083a))

### Performance Improvements

* 站点监控保存时异步检查 ([993bc74](https://github.com/certd/certd/commit/993bc7432fce2d954e9897ed85b54f22150bfc7e))
* dns支持火山引擎 ([99ff879](https://github.com/certd/certd/commit/99ff879d93658c29ea493a4bde7e9e3f85996d64))

## [1.31.8](https://github.com/certd/certd/compare/v1.31.7...v1.31.8) (2025-03-26)

### Bug Fixes

* 修复编辑通知勾选默认，导致出现多个默认通知的bug ([6cd7bdd](https://github.com/certd/certd/commit/6cd7bddc37da8b0d7b9860fd9a26ddfe84c869a7))

### Performance Improvements

* 优化scp上传 ([e51123a](https://github.com/certd/certd/commit/e51123a95131cc76d655937488caf08956a67020))
* 支持又拍云cdn ([fd0536b](https://github.com/certd/certd/commit/fd0536bd4b41f15b6b5d42e0b447f0dcbf73b8a8))
* 支持又拍云cdn ([57389a7](https://github.com/certd/certd/commit/57389a79a1a61c45d081712562f8b33c9633158e))

## [1.31.7](https://github.com/certd/certd/compare/v1.31.6...v1.31.7) (2025-03-24)

### Performance Improvements

* 支持部署到lucky ([e18e399](https://github.com/certd/certd/commit/e18e399ce6529e8c7e36b56c5f674cfdbbd3d3d1))

## [1.31.6](https://github.com/certd/certd/compare/v1.31.5...v1.31.6) (2025-03-24)

### Bug Fixes

* 修复dns.la无法申请证书的bug ([90b045a](https://github.com/certd/certd/commit/90b045af6d1a4f46986e4b118885c1f050df067c))

### Performance Improvements

* 上传到主机支持scp方式 ([05b6159](https://github.com/certd/certd/commit/05b6159802b9e85b6a410361b60b5c28875b48e7))
* 优化图标 ([c56f48c](https://github.com/certd/certd/commit/c56f48c1e3c54c4e203fafb380d9091d75681b7e))

## [1.31.5](https://github.com/certd/certd/compare/v1.31.4...v1.31.5) (2025-03-22)

**Note:** Version bump only for package @certd/ui-server

## [1.31.4](https://github.com/certd/certd/compare/v1.31.3...v1.31.4) (2025-03-21)

### Bug Fixes

* 修复站点监控通知通过webhook发送失败的bug ([9be1ecc](https://github.com/certd/certd/commit/9be1ecc8aab3ea23dd0dc2dab3688f4edb90ef2c))
* 修复dns.la域名申请失败的bug ([1de8eee](https://github.com/certd/certd/commit/1de8eee6ea8307f3c11626af75303d3cc104bb95))

### Performance Improvements

* 流水线增加上传证书快捷方式 ([425bba6](https://github.com/certd/certd/commit/425bba67c539b734e2a85a83a4f9ecc9b2434fb4))
* 手动上传证书部署流水线 ([fbb66f3](https://github.com/certd/certd/commit/fbb66f3c4389489aa8a43b194d82bc8cf391607b))
* 站点监控，手动测试也发通知 ([729b19c](https://github.com/certd/certd/commit/729b19c8da60d5efb5baef7cf8df0518e7f6b471))
* 站点证书监控支持模糊查询 ([0069c0e](https://github.com/certd/certd/commit/0069c0e3992946a8dd6410f299d4fc974ef0e76b))
* 支持飞书通知 ([b82e1dc](https://github.com/certd/certd/commit/b82e1dcd6217b09a7d7e21cd648bb31de320cadf))
* 支持手动上传证书并部署 ([a9fffa5](https://github.com/certd/certd/commit/a9fffa5180c83da27b35886aa2e858a92a2c5f94))

## [1.31.3](https://github.com/certd/certd/compare/v1.31.2...v1.31.3) (2025-03-13)

### Bug Fixes

* 修复阿里云fc获取不到列表的bug ([474b337](https://github.com/certd/certd/commit/474b3372d8ce98e6d45900bf8046bc0b3f220686))

### Performance Improvements

* 支持dns.la ([ee8af18](https://github.com/certd/certd/commit/ee8af18d0ac0af82544d6dda1e4b4c678b733041))
* cf授权支持配置http代理 ([27386ea](https://github.com/certd/certd/commit/27386ea04d3c1a5aebe3cfdd7ac48185eaa76629))

## [1.31.2](https://github.com/certd/certd/compare/v1.31.1...v1.31.2) (2025-03-12)

### Bug Fixes

* 修复cname记录查找bug ([95fb4e3](https://github.com/certd/certd/commit/95fb4e3e8be6ca13cc43b451f6141d62190ba453))

## [1.31.1](https://github.com/certd/certd/compare/v1.31.0...v1.31.1) (2025-03-11)

**Note:** Version bump only for package @certd/ui-server

# [1.31.0](https://github.com/certd/certd/compare/v1.30.6...v1.31.0) (2025-03-10)

### Bug Fixes

* 修复CDN插件我爱云因更换接口导致部署失败的问题 ([5641c19](https://github.com/certd/certd/commit/5641c19502970f67af19709bddf8c781b1a25bdc))
* 修复webhook headers value中带等号是解析错误的bug ([1fe3365](https://github.com/certd/certd/commit/1fe3365e10c464c4c60c82f424cf74fe35b883e0))
* ProxmoxUploadCert 增加强制部署证书 ([441b15e](https://github.com/certd/certd/commit/441b15ed2fe5a143a5bd5508613b3816ddbff596))

### Performance Improvements

* 历史记录查看详情，可以切换到对应的历史记录日志上去 ([082802e](https://github.com/certd/certd/commit/082802e1197156837800f814728ee0f6b300b18c))
* 升级midwayjs版本 ([057b0b4](https://github.com/certd/certd/commit/057b0b4565e19bb93195633f767b2942e8e40e59))
* 是否允许爬虫爬取增加ui设置选项 ([779db9d](https://github.com/certd/certd/commit/779db9da705d2dfef36fec21f52bd38af9fc5f2e))
* 通知支持钉钉群聊机器人 ([fc8bef5](https://github.com/certd/certd/commit/fc8bef5aae522d75d408d8c3aa74543269da5398))

## [1.30.6](https://github.com/certd/certd/compare/v1.30.5...v1.30.6) (2025-02-24)

### Performance Improvements

* 上传到阿里云证书名称后缀增加毫秒时间戳 ([9f0ee21](https://github.com/certd/certd/commit/9f0ee219d02907ffe128a5cf10173397d934ccd7))
* 支持部署到阿里云FC3.0 ([bcaf54d](https://github.com/certd/certd/commit/bcaf54d4cb7bc469486aae6cdb127ae017eb3abb))

## [1.30.5](https://github.com/certd/certd/compare/v1.30.4...v1.30.5) (2025-02-14)

**Note:** Version bump only for package @certd/ui-server

## [1.30.4](https://github.com/certd/certd/compare/v1.30.3...v1.30.4) (2025-02-14)

### Bug Fixes

* 适配最新版1panel密码编码方式 ([78044c0](https://github.com/certd/certd/commit/78044c062e20cdd04f08baef9fb6745bf25eddcf))

## [1.30.3](https://github.com/certd/certd/compare/v1.30.2...v1.30.3) (2025-02-13)

### Bug Fixes

* 修复腾讯云CLB多域名同证书部署报错的bug ([c3a5542](https://github.com/certd/certd/commit/c3a55429357e78f4b78c9592d3e5897db2d4d549))

## [1.30.2](https://github.com/certd/certd/compare/v1.30.1...v1.30.2) (2025-02-09)

### Bug Fixes

* 修复cloudflare删除解析记录报错的bug ([00c2da4](https://github.com/certd/certd/commit/00c2da444f84adb89f3f1226d03294d7c6e3e4f1))

### Performance Improvements

* 上传自定义证书 ([75a38d9](https://github.com/certd/certd/commit/75a38d95f305b4271d9106babe7cffc1c89ae8f3))

## [1.30.1](https://github.com/certd/certd/compare/v1.30.0...v1.30.1) (2025-01-20)

### Bug Fixes

* 修复部署到阿里云ALB、NLB插件加载混乱的bug ([6ab83b6](https://github.com/certd/certd/commit/6ab83b662a2c5e715b9cb7eb1244de2ebb7f47b0))
* 修复腾讯clb重复执行会报错的bug ([e95d29f](https://github.com/certd/certd/commit/e95d29f446d06eced315a3087fc9e105a30b20bd))
* 修复tg消息内容中存在.和*就会发送失败的bug ([ae5dfc3](https://github.com/certd/certd/commit/ae5dfc3bee950267123ae2fbd1c11e7ce36626ea))

### Performance Improvements

* http方式校验，选择sftp时，支持修改文件访问权限比如777 ([15d6eaf](https://github.com/certd/certd/commit/15d6eaf5532ed25acd4f8d58c429353a2f44206c))

# [1.30.0](https://github.com/certd/certd/compare/v1.29.5...v1.30.0) (2025-01-19)

### Bug Fixes

* 修复namesilo ttl太短的问题 ([865f26d](https://github.com/certd/certd/commit/865f26d75c0d3dd4dc8b41448f8830068e45957c))

### Features

* 支持open api接口，根据域名获取证书 ([52a4fd3](https://github.com/certd/certd/commit/52a4fd33180e9b3f71b8dc9f7671d7cd8e448c3b))

### Performance Improvements

* 证书仓库 ([91e7f45](https://github.com/certd/certd/commit/91e7f45a1c5ea1e0ec0aa3236b80028f03a6d0aa))
* 支持部署到阿里云ALB ([653940a](https://github.com/certd/certd/commit/653940a0ca64fc380178c1b0b58ae0af64dfaf07))
* 支持部署到阿里云NLB、SLB ([c085bac](https://github.com/certd/certd/commit/c085bac5d877c4250a8a79e17eb8673b8e4fc89c))
* 支持部署到腾讯云直播 ([417d37b](https://github.com/certd/certd/commit/417d37b199b79a42f790f9edab8f178eedf8fbf7))
* 支持部署证书到proxmox ([d10795e](https://github.com/certd/certd/commit/d10795ecd97eb8cf2ffa46aabfdbfc6812636396))

## [1.29.5](https://github.com/certd/certd/compare/v1.29.4...v1.29.5) (2025-01-07)

### Bug Fixes

* 修复复制到本机插件，pfx格式复制时报错的bug ([f57116d](https://github.com/certd/certd/commit/f57116d2bebf33e47ad93e0b39c4efe8e4aea25c))

## [1.29.4](https://github.com/certd/certd/compare/v1.29.3...v1.29.4) (2025-01-06)

### Performance Improvements

* 优化腾讯云CLB插件，支持非sni情况，sni情况支持填写多个域名 ([635b042](https://github.com/certd/certd/commit/635b042690637bff85e97e07c7aac4b87a8a124b))

## [1.29.3](https://github.com/certd/certd/compare/v1.29.2...v1.29.3) (2025-01-04)

### Bug Fixes

* 修复系统级授权无法查看密钥的bug ([8644348](https://github.com/certd/certd/commit/8644348fc41ae2e1672f946ca37e5d3a674e0218))

### Performance Improvements

* 优化站点证书检查页面，检查增加3次重试 ([e6dd7cd](https://github.com/certd/certd/commit/e6dd7cd54a3e23897031b5df6e0c3cdc0545d35a))
* 支持http校验方式申请证书 ([405591c](https://github.com/certd/certd/commit/405591c5d08fa1a3b228ee3980199e7731cfec4a))
* http校验方式，支持七牛云oss、阿里云oss、腾讯云cos ([3f74d4d](https://github.com/certd/certd/commit/3f74d4d9e5f5d0e629b44cff1895b3f7a8fbcafc))

## [1.29.2](https://github.com/certd/certd/compare/v1.29.1...v1.29.2) (2024-12-25)

### Bug Fixes

* 修复套餐关闭状态下，仍然限制用户流水线数量的bug ([66fb9e5](https://github.com/certd/certd/commit/66fb9e5f49491f9c159363b48af14720a37673b1))

## [1.29.1](https://github.com/certd/certd/compare/v1.29.0...v1.29.1) (2024-12-25)

### Performance Improvements

* 用户创建证书流水线没有购买套餐或者超限时提前报错 ([472f06c](https://github.com/certd/certd/commit/472f06c2d190d0ae48e8b53c18bc278437656a1c))
* 优化插件名称显示 ([26adf7d](https://github.com/certd/certd/commit/26adf7d437e674385f26a8f92fded6521a620671))

# [1.29.0](https://github.com/certd/certd/compare/v1.28.4...v1.29.0) (2024-12-24)

### Bug Fixes

* 修复左侧菜单收起时无法展开子菜单的bug ([0056223](https://github.com/certd/certd/commit/005622307e612717a5408aa1484717ef03003a22))

### Features

* 基础版不再限制流水线数量 ([cb27d4b](https://github.com/certd/certd/commit/cb27d4b4906b2782eaceb0a95bbdc5d0534370d2))
* 套餐购买支持易支付、支付宝支付 ([faa28f8](https://github.com/certd/certd/commit/faa28f88f954cba4c1dd29125562e5acd2fd99af))
* 用户套餐，用户支付功能 ([a019956](https://github.com/certd/certd/commit/a019956698acaf2c4beb620b5ad8c18918ead6a1))
* 站点证书监控 ([9c8c7a7](https://github.com/certd/certd/commit/9c8c7a781223f4217f45510db1e89495600e3cd5))
* 支持微信支付 ([45d6347](https://github.com/certd/certd/commit/45d6347f5b6199493b11aabdd74177f6dca2cea4))

### Performance Improvements

* 同一时间只允许一个套餐生效 ([8ebf95a](https://github.com/certd/certd/commit/8ebf95a222a900d1707716c7b1f3b39f8a6d8f94))
* 用户名支持修改 ([89c7f07](https://github.com/certd/certd/commit/89c7f070343e86453c84677ebe1669f9b266d871))
* 站点证书监控通知发送，每天定时检查 ([bb4910f](https://github.com/certd/certd/commit/bb4910f4e57234e42b44505f4620ae7af66025c5))
* 支持一体证书 ([53c38cf](https://github.com/certd/certd/commit/53c38cf714a6f7486abbf1d71c9f48f56a790100))

## [1.28.4](https://github.com/certd/certd/compare/v1.28.3...v1.28.4) (2024-12-12)

**Note:** Version bump only for package @certd/ui-server

## [1.28.3](https://github.com/certd/certd/compare/v1.28.2...v1.28.3) (2024-12-12)

### Bug Fixes

* mysql下access.setting字段改成text ([b7f5740](https://github.com/certd/certd/commit/b7f5740c57743914f754f3b4fdd94b59a2e8338c))

### Performance Improvements

* 通知标题优化 ([ff083ce](https://github.com/certd/certd/commit/ff083ce6848a8bee3c8248e4b881086ae1517c28))
* 支持腾讯虚拟机开关机([@wujingke](https://github.com/wujingke)) ([8039e8b](https://github.com/certd/certd/commit/8039e8baf83c82d03f1a6198cf61c372026b962b))
* 支持aws cloudfront ([0ae39f1](https://github.com/certd/certd/commit/0ae39f160a7c6b6696b3bf513d68aa28905810ad))

## [1.28.2](https://github.com/certd/certd/compare/v1.28.1...v1.28.2) (2024-12-09)

### Bug Fixes

* 修复创建流水线通知设置无效的bug ([498cf34](https://github.com/certd/certd/commit/498cf34999fddfa24ce088e2e678469fa669abb8))
* 修复流水线分组可以被所有人看见的bug ([a0e838d](https://github.com/certd/certd/commit/a0e838d1eec918e5dc92fe95dc72ac14facb930e))

### Performance Improvements

* 优化数据表索引 ([228fdf0](https://github.com/certd/certd/commit/228fdf0a0d28013f5dd156a97bbde80537e8e97e))
* 支持mysql ([7cde1fd](https://github.com/certd/certd/commit/7cde1fdc4a9ed851900d231a5460c8dbfbcd148e))

## [1.28.1](https://github.com/certd/certd/compare/v1.28.0...v1.28.1) (2024-12-08)

### Performance Improvements

* 通知选择器优化 ([2c0cbdd](https://github.com/certd/certd/commit/2c0cbdd29ecb74cc939b2ae7ee86b8d40f70ba31))
* 新增七牛云插件分组 ([49e7dc5](https://github.com/certd/certd/commit/49e7dc56e1a95fbdea3e30cdeb945b48415b69e3))
* 新增server酱3通知 ([6aa4872](https://github.com/certd/certd/commit/6aa487269c9f6862e188b37a0d6c73f79c937d94))
* 支持易发云短信 ([94fa77f](https://github.com/certd/certd/commit/94fa77fcd2b9bea294fb05736c0d8cdc81f56103))
* cname value优化 ([e8c9c2a](https://github.com/certd/certd/commit/e8c9c2a47d47048ae743b16f7bc932dbe18a89e9))
* favicon支持自定义 ([8b9c47d](https://github.com/certd/certd/commit/8b9c47daf194515006689a212ae9cf586bdf5993))

# [1.28.0](https://github.com/certd/certd/compare/v1.27.9...v1.28.0) (2024-11-30)

### Bug Fixes

* 修复自定义webhook contextType的bug ([7e5ea0c](https://github.com/certd/certd/commit/7e5ea0cee003acda952d922ca70592f1e8a2ed80))

### Features

* 手机号登录、邮箱验证码注册 ([7b55337](https://github.com/certd/certd/commit/7b55337c5edb470cca7aa62201eda8d274784004))

### Performance Improvements

* 部署到IIS插件 ([1534f45](https://github.com/certd/certd/commit/1534f4523633265d219d7b3a249a9ea1af99c512))
* 登录失败增加重试次数限制及冷却时间 ([954b6df](https://github.com/certd/certd/commit/954b6df3608695fe074130f8149a33e311d80cc4))
* 流水线支持批量修改分组，批量删除 ([a847e66](https://github.com/certd/certd/commit/a847e66c4fc843b98f1520b2b8072d3586ce8b81))
* 首页新增修改密码提示 ([0772d3b](https://github.com/certd/certd/commit/0772d3b3fd24afdde4086d9f09ef19d037b431b4))
* 选项显示图标 ([aedc462](https://github.com/certd/certd/commit/aedc46213571a3bd93809b7af7fa17a08d546237))
* 优化七牛云cdn，获取域名列表可以选择 ([5a20242](https://github.com/certd/certd/commit/5a20242111d6bd255b25dac86fe1f062c8543096))
* 优化七牛云cdn部署，保持http2和forceHttp设置，当未开启https时，主动开启https ([196f7d9](https://github.com/certd/certd/commit/196f7d9dc23d7dd96b663c686542e85270b81aef))
* 优化证书申请成功通知发送方式 ([8002a56](https://github.com/certd/certd/commit/8002a56efc5998aa03db5711ae87f9eb4bc9e160))
* 支持短信验证码登录 ([387bcc5](https://github.com/certd/certd/commit/387bcc5fa418cdeea81a06da5e3f8cd6b43cd082))
* 支持威联通证书部署 ([0d8913e](https://github.com/certd/certd/commit/0d8913ea2f56fdebbcc9bb207eae59e8ddbb8cad))
* 自定义webhook显示详细的错误信息 ([3254afc](https://github.com/certd/certd/commit/3254afc75640eed3729d0fc02a818fefbe5c7fc3))

## [1.27.9](https://github.com/certd/certd/compare/v1.27.8...v1.27.9) (2024-11-26)

### Performance Improvements

* 通知支持自定义webhook、anpush、iyuu、server酱 ([cbccd9e](https://github.com/certd/certd/commit/cbccd9e3d0a4c24aba772af62734666d40b22c57))
* 通知支持vocechat、bark、telegram、discord、slack ([642f57f](https://github.com/certd/certd/commit/642f57ff6d7152a9e14f59c7fc0e32a6b1751fb7))

## [1.27.8](https://github.com/certd/certd/compare/v1.27.7...v1.27.8) (2024-11-25)

**Note:** Version bump only for package @certd/ui-server

## [1.27.7](https://github.com/certd/certd/compare/v1.27.6...v1.27.7) (2024-11-25)

### Bug Fixes

* 修复关键字查询bug ([fab6660](https://github.com/certd/certd/commit/fab66606b35a540fac31fee902331ba1ffdebc16))
* 修复CNAME时子域名级数超出限制的问题 ([3af6d96](https://github.com/certd/certd/commit/3af6d96e6e353c9b2111cff81679b79c55195a0a))

### Performance Improvements

* 华为云密钥获取提示及访问链接 ([de43391](https://github.com/certd/certd/commit/de43391e4c12dc3ad976f8fa8787f4eb70a41e75))
* 通知管理 ([d9a00ee](https://github.com/certd/certd/commit/d9a00eeaf72735ced67c59d7983d84e3c730064a))
* 通知渠道支持测试按钮 ([b54ae27](https://github.com/certd/certd/commit/b54ae272ebc2d31b32b049d44e2299a6be7f153c))
* 优化插件开发，dnsProvider无需写http logger 变量 ([fcbb5e4](https://github.com/certd/certd/commit/fcbb5e46a112174150a62648319b8224fce3b7ed))
* 支持部署到阿里云WAF ([c96fcb7](https://github.com/certd/certd/commit/c96fcb7afced979435cffa73591275008033c90d))
* 支持企业微信群聊机器人通知 ([b805a29](https://github.com/certd/certd/commit/b805a2925984144a31575b8aaa622f0c30d41b56))

## [1.27.6](https://github.com/certd/certd/compare/v1.27.5...v1.27.6) (2024-11-19)

### Bug Fixes

* .env 读取 \r 问题 ([0e33dfa](https://github.com/certd/certd/commit/0e33dfa019a55ea76193c428ec756af386adeb9d))

## [1.27.5](https://github.com/certd/certd/compare/v1.27.4...v1.27.5) (2024-11-18)

### Bug Fixes

* 修复角色无法删除的bug ([66629a5](https://github.com/certd/certd/commit/66629a591aecc2d8364ea415c7afc3f9d0406562))

### Performance Improvements

* 新手导航在非编辑模式下不显示 ([18bfcc2](https://github.com/certd/certd/commit/18bfcc24ad0bde57bb04db8a4209861ec6b8ff1d))
* 优化腾讯云 cloudflare 重复解析记录时的返回值 ([90d1b68](https://github.com/certd/certd/commit/90d1b68bd6cf232fbe085234efe07d29b7690044))
* 支持namesilo ([80159ec](https://github.com/certd/certd/commit/80159ecca895103d0495f3217311199e66056572))
* 专业版试用，无需绑定账号 ([c7c4318](https://github.com/certd/certd/commit/c7c4318c11b65a76089787aa58939832d338a232))

## [1.27.4](https://github.com/certd/certd/compare/v1.27.3...v1.27.4) (2024-11-14)

### Performance Improvements

* 公共cname服务支持关闭 ([f4ae512](https://github.com/certd/certd/commit/f4ae5125dc4cd97816976779cb3586b5ee78947e))

## [1.27.3](https://github.com/certd/certd/compare/v1.27.2...v1.27.3) (2024-11-13)

### Bug Fixes

* 修复偶发性cname一直验证超时的bug ([d2ce72e](https://github.com/certd/certd/commit/d2ce72e4aaacdf726ba8b91fcd71db40a27714ba))
* 修复邮件配置，忽略证书校验设置不生效的bug ([66a9690](https://github.com/certd/certd/commit/66a9690dc958732e1b3c672d965db502296446f9))

### Performance Improvements

* 优化上传到主机插 路径选择，根据证书格式显示 ([8c3f86c](https://github.com/certd/certd/commit/8c3f86c6909ed91f48bb2880e78834e22f6f6a29))

## [1.27.2](https://github.com/certd/certd/compare/v1.27.1...v1.27.2) (2024-11-08)

### Bug Fixes

* 修复删除腾讯云过期证书时间判断上的bug，导致已过期仍然没有删除证书 ([1ba1007](https://github.com/certd/certd/commit/1ba10072615015d91b81fc56a3b01dae6a2ae9d1))

### Performance Improvements

* 优化部署到阿里云CDN插件，支持多域名，更易用 ([80c500f](https://github.com/certd/certd/commit/80c500f618b169a1f64c57fe442242a4d0d9d833))
* 优化流水线页面切换回来不丢失查询条件 ([4dcf6e8](https://github.com/certd/certd/commit/4dcf6e87bc5f7657ce8a56c5331e8723a0fee8ee))
* 支持公共cname服务 ([3c919ee](https://github.com/certd/certd/commit/3c919ee5d1aef5d26cf3620a7c49d920786bc941))
* 执行历史支持点击查看流水线详情 ([8968639](https://github.com/certd/certd/commit/89686399f90058835435b92872fc236fac990148))
* 专业版7天试用 ([c58250e](https://github.com/certd/certd/commit/c58250e1f065a9bd8b4e82acc1df754504c0010c))

## [1.27.1](https://github.com/certd/certd/compare/v1.27.0...v1.27.1) (2024-11-04)

### Performance Improvements

* 优化时间选择器，自动填写分钟和秒钟 ([396dc34](https://github.com/certd/certd/commit/396dc34a841c7d016b033736afdba8366fb2d211))
* cname 域名映射记录可读性优化 ([b1117ed](https://github.com/certd/certd/commit/b1117ed54a3ef015752999324ff72b821ef5e4b9))

# [1.27.0](https://github.com/certd/certd/compare/v1.26.16...v1.27.0) (2024-10-31)

### Bug Fixes

* 修复历史记录不能按名称查询的bug ([6113c38](https://github.com/certd/certd/commit/6113c388b7fc58b11ca19ff05cc1286d096c8d28))

### Features

* 首页全新改版 ([63ec5b5](https://github.com/certd/certd/commit/63ec5b5519c760a3330569c0da6dac157302a330))

### Performance Improvements

* 管理控制台数据统计 ([babd589](https://github.com/certd/certd/commit/babd5897ae013ff7c04ebfcbfac8a00d84dd627c))
* lego 升级到 4.19.2 ([129bf53](https://github.com/certd/certd/commit/129bf53edc9bbb001fe49fbd7e239bd1d09cc128))

## [1.26.16](https://github.com/certd/certd/compare/v1.26.15...v1.26.16) (2024-10-30)

### Performance Improvements

* 支持华为云cdn ([81a3fdb](https://github.com/certd/certd/commit/81a3fdbc29b71f380762008cc151493ec97458f9))

## [1.26.15](https://github.com/certd/certd/compare/v1.26.14...v1.26.15) (2024-10-28)

### Performance Improvements

* 默认证书更新时间设置为35天，增加腾讯云删除过期证书插件，可以避免腾讯云过期证书邮件 ([51b6fed](https://github.com/certd/certd/commit/51b6fed468eaa6f28ce4497ce303ace1a52abb96))
* 授权加密支持解密查看 ([5575c83](https://github.com/certd/certd/commit/5575c839705f6987ad2bdcd33256b0962c6a9c6a))
* 重置管理员密码同时启用管理员账户，避免之前禁用了，重置密码还是登录不进去 ([f92d918](https://github.com/certd/certd/commit/f92d918a1e28e29b794ad4754661ea760c18af46))

## [1.26.14](https://github.com/certd/certd/compare/v1.26.13...v1.26.14) (2024-10-26)

### Bug Fixes

* 修复阿里云部署大杀器报插件_还未注册错误的bug ([abd2dcf](https://github.com/certd/certd/commit/abd2dcf2e85a545321bae6451406d081f773b132))
* 修复启动时自签证书无法保存的bug ([526c484](https://github.com/certd/certd/commit/526c48450bcd37b3ccded9b448f17de8140bdc6e))

### Performance Improvements

* 禁用readonly用户 ([d10d42e](https://github.com/certd/certd/commit/d10d42e20619bb55a50d636b8867ff33db4e3b4b))
* 限制其他用户流水线数量 ([315e437](https://github.com/certd/certd/commit/315e43746baf01682737f82e41579237a48409af))
* 用户管理优化头像上传 ([661293c](https://github.com/certd/certd/commit/661293c189a3abf3cdc953b5225192372f57930d))

## [1.26.13](https://github.com/certd/certd/compare/v1.26.12...v1.26.13) (2024-10-26)

### Performance Improvements

* 更新certd本身的证书文档说明 ([0c50ede](https://github.com/certd/certd/commit/0c50ede129337b82df54575cbd2f4c2a783a0732))
* 支持同时监听https端口，7002 ([d5a17f9](https://github.com/certd/certd/commit/d5a17f9e6afd63fda2df0981118480f25a1fac2e))

## [1.26.12](https://github.com/certd/certd/compare/v1.26.11...v1.26.12) (2024-10-25)

### Performance Improvements

* 部署到阿里云任意云资源，阿里云部署大杀器 ([4075be7](https://github.com/certd/certd/commit/4075be7849b140acb92bd8da8a9acbf4eef85180))
* 文件名特殊字符限制输入 ([c4164c6](https://github.com/certd/certd/commit/c4164c66e29f3ec799f98108a344806ca61e94ff))
* 新增部署到百度云CDN插件 ([f126f9f](https://github.com/certd/certd/commit/f126f9f932d37fa01fff1accc7bdd17d349f8db5))
* 新增部署到腾讯云CDN-v2，推荐使用 ([d782655](https://github.com/certd/certd/commit/d782655cb4dfbb74138178afbffeee76fc755115))
* 支持部署到腾讯云COS ([a8a45d7](https://github.com/certd/certd/commit/a8a45d7f757820990e278533277a3deda5ba48f3))
* 支持配置公共ZeroSSL授权 ([a90d1e6](https://github.com/certd/certd/commit/a90d1e68ee9cbc3705223457b8a86f071b150968))

## [1.26.11](https://github.com/certd/certd/compare/v1.26.10...v1.26.11) (2024-10-23)

### Bug Fixes

* 允许七牛云cdn插件输入.号开头的通配符域名 ([18ee87d](https://github.com/certd/certd/commit/18ee87daff6eafc2201b58e28d85aafd3cb7a5b9))

### Performance Improvements

* 优化证书申请速度和成功率，反代地址优化，google基本可以稳定请求。增加请求重试。 ([41d9c3a](https://github.com/certd/certd/commit/41d9c3ac8398def541e65351cbe920d4a927182d))

## [1.26.10](https://github.com/certd/certd/compare/v1.26.9...v1.26.10) (2024-10-20)

### Bug Fixes

* 修复cname服务普通用户access访问权限问题 ([c1e3e2e](https://github.com/certd/certd/commit/c1e3e2ee1f923ee5806479dd5f178c3286a01ae0))

## [1.26.9](https://github.com/certd/certd/compare/v1.26.8...v1.26.9) (2024-10-19)

### Bug Fixes

* 修复普通用户无法校验cname配置的bug ([6285497](https://github.com/certd/certd/commit/62854978bf0bdbe749b42f8e40ab227ab31ec92f))

### Performance Improvements

* 触发证书重新申请input变化对比规则优化，减少升级版本后触发申请证书的情况 ([c46a2a9](https://github.com/certd/certd/commit/c46a2a9a399c2a9a8bb59a48b9fb6e93227cce9b))
* 授权配置去除前后空格 ([57d8d48](https://github.com/certd/certd/commit/57d8d48046fbf51c52b041d2dec03d51fb018587))
* 数据库备份插件，先压缩再备份 ([304ef49](https://github.com/certd/certd/commit/304ef494fd5787c996ad0dcb6edd2f517afce9e2))

## [1.26.8](https://github.com/certd/certd/compare/v1.26.7...v1.26.8) (2024-10-15)

### Bug Fixes

* 修复无法设置角色的bug ([02fe704](https://github.com/certd/certd/commit/02fe704769edb25fea5ffd85a51a5530864b37b3))

### Performance Improvements

* 角色删除安全 ([28bb485](https://github.com/certd/certd/commit/28bb4856bee03569153f6471527c9b9f28cb3d14))
* 密钥备份 ([1c6028a](https://github.com/certd/certd/commit/1c6028abcf8849163462bb2f8441b6838357e09b))
* 证书直接查看 ([5dde5bd](https://github.com/certd/certd/commit/5dde5bd3f76db3959d411619d29bfb8064e3b307))
* sqlite数据库备份插件 ([77f1631](https://github.com/certd/certd/commit/77f163144f7dcfb0431475c55508fecfd6d969f8))

## [1.26.7](https://github.com/certd/certd/compare/v1.26.6...v1.26.7) (2024-10-14)

**Note:** Version bump only for package @certd/ui-server

## [1.26.6](https://github.com/certd/certd/compare/v1.26.5...v1.26.6) (2024-10-14)

### Bug Fixes

* 修复排序失效的bug ([1f0742e](https://github.com/certd/certd/commit/1f0742ef9f0caae0c7e713acf0fd3cebf5d63875))

## [1.26.5](https://github.com/certd/certd/compare/v1.26.4...v1.26.5) (2024-10-14)

### Bug Fixes

* 修复版本号获取错误的bug ([8851870](https://github.com/certd/certd/commit/8851870400df86e496198ad509061b8989fcc44f))

## [1.26.4](https://github.com/certd/certd/compare/v1.26.3...v1.26.4) (2024-10-14)

### Performance Improvements

* [comm] 支持插件管理 ([e8b617b](https://github.com/certd/certd/commit/e8b617b80ce882dd63006f0cfc719a80a1cc6acc))
* 新增代理设置功能 ([273ab61](https://github.com/certd/certd/commit/273ab6139f5807f4d7fe865cc353b97f51b9a668))
* EAB授权支持绑定邮箱，支持公共EAB设置 ([07043af](https://github.com/certd/certd/commit/07043aff0ca7fd29c56dd3c363002cb15d78b464))

## [1.26.3](https://github.com/certd/certd/compare/v1.26.2...v1.26.3) (2024-10-12)

### Performance Improvements

* 优化系统设置加载时机 ([7396253](https://github.com/certd/certd/commit/73962536d5a4769902d760d005f3f879465addcc))

## [1.26.2](https://github.com/certd/certd/compare/v1.26.1...v1.26.2) (2024-10-11)

### Bug Fixes

* 修复某些情况下bindUrl失败的bug ([91fc1cd](https://github.com/certd/certd/commit/91fc1cd7353be4a22be951239ed70b38baebc74e))

### Performance Improvements

* 邮箱设置改为系统设置，普通用户无需配置发件邮箱 ([4244569](https://github.com/certd/certd/commit/42445692117184a3293e63bef84a74cbb5984b0e))

## [1.26.1](https://github.com/certd/certd/compare/v1.26.0...v1.26.1) (2024-10-10)

**Note:** Version bump only for package @certd/ui-server

# [1.26.0](https://github.com/certd/certd/compare/v1.25.9...v1.26.0) (2024-10-10)

### Bug Fixes

* 修复管理员编辑其他用户流水线任务时归属userid也被修改的bug ([e85c477](https://github.com/certd/certd/commit/e85c47744cf740b4af3b93dca7c2f0ccc818ec2f))

### Features

* 域名验证方法支持CNAME间接方式，此方式支持所有域名注册商，且无需提供Access授权，但是需要手动添加cname解析 ([f3d3508](https://github.com/certd/certd/commit/f3d35084ed44f9f33845f7045e520be5c27eed93))
* 站点个性化设置 ([11a9fe9](https://github.com/certd/certd/commit/11a9fe9014d96cba929e5a066e78f2af7ae59d14))

### Performance Improvements

* 调整静态资源到static目录 ([0584b36](https://github.com/certd/certd/commit/0584b3672b40f9042a2ed87e5627022606d046cd))
* 调整全部静态资源到static目录 ([a218890](https://github.com/certd/certd/commit/a21889080d6c7ffdf0af526a3a21f0b2d1c77288))
* 检查cname是否正确配置 ([b5d8935](https://github.com/certd/certd/commit/b5d8935159374fbe7fc7d4c48ae0ed9396861bdd))
* 七牛云cdn支持配置多个域名 ([88d745e](https://github.com/certd/certd/commit/88d745e29063a089864fb9c6705be7b8d4c2669a))
* 上传到主机插件支持注入环境变量 ([81fac73](https://github.com/certd/certd/commit/81fac736f9ccc8d1cda7ef4178752239cec20849))
* 优化缩短首页缓存时间 ([49395e8](https://github.com/certd/certd/commit/49395e8cb65f4b30c0145329ed5de48be4ef3842))

## [1.25.9](https://github.com/certd/certd/compare/v1.25.8...v1.25.9) (2024-10-01)

### Bug Fixes

* 修复西部数码账户级别apikey不可用的bug ([f8f3e8b](https://github.com/certd/certd/commit/f8f3e8b43fd5d815887bcb53b95f46dc96424b79))

### Performance Improvements

* 增加等待插件 ([3ef0541](https://github.com/certd/certd/commit/3ef0541cc85ab6abf698ead3b258ae1ac156ef98))

## [1.25.8](https://github.com/certd/certd/compare/v1.25.7...v1.25.8) (2024-09-30)

**Note:** Version bump only for package @certd/ui-server

## [1.25.7](https://github.com/certd/certd/compare/v1.25.6...v1.25.7) (2024-09-29)

### Bug Fixes

* 修复某些地区被屏蔽无法激活专业版的bug ([7532a96](https://github.com/certd/certd/commit/7532a960851b84d4f2cc3dba02353c5235e1a364))

### Performance Improvements

* 上传到主机，支持socks代理 ([d91026d](https://github.com/certd/certd/commit/d91026dc4fbfe5fedc4ee8e43dc0d08f1cf88356))
* 支持上传到七牛云oss ([bf024bd](https://github.com/certd/certd/commit/bf024bdda8bc2a463475be5761acf0da7317a08a))

## [1.25.6](https://github.com/certd/certd/compare/v1.25.5...v1.25.6) (2024-09-29)

### Bug Fixes

* 修复中间证书复制错误的bug ([76e86ea](https://github.com/certd/certd/commit/76e86ea283ecbe4ec76cdc92b98457d0fef544ac))

### Performance Improvements

* 部署支持1Panel ([d047234](https://github.com/certd/certd/commit/d047234d98d31504f2e5a472b66e1b75806af26e))

## [1.25.5](https://github.com/certd/certd/compare/v1.25.4...v1.25.5) (2024-09-26)

**Note:** Version bump only for package @certd/ui-server

## [1.25.4](https://github.com/certd/certd/compare/v1.25.3...v1.25.4) (2024-09-25)

### Bug Fixes

* 修复启动报授权验证失败的bug ([3460d3d](https://github.com/certd/certd/commit/3460d3ddca222ea702816ab805909d489eff957f))

## [1.25.3](https://github.com/certd/certd/compare/v1.25.2...v1.25.3) (2024-09-24)

### Bug Fixes

* 修复upload to host trim错误 ([0f0ddb9](https://github.com/certd/certd/commit/0f0ddb9c5963fd643d6d203334efac471c43ec3b))

## [1.25.2](https://github.com/certd/certd/compare/v1.25.1...v1.25.2) (2024-09-24)

**Note:** Version bump only for package @certd/ui-server

## [1.25.1](https://github.com/certd/certd/compare/v1.25.0...v1.25.1) (2024-09-24)

**Note:** Version bump only for package @certd/ui-server

# [1.25.0](https://github.com/certd/certd/compare/v1.24.4...v1.25.0) (2024-09-24)

### Bug Fixes

* 修复首次创建任务运行时不自动设置当前运行情况的bug ([ecd83ee](https://github.com/certd/certd/commit/ecd83ee136abdd3df9ed2f21ec2ff0f24c0ed9d9))

### Features

* 账号绑定 ([e046640](https://github.com/certd/certd/commit/e0466409d0c021bb415abd94df448c8a0d4799e9))
* 支持中间证书 ([e86756e](https://github.com/certd/certd/commit/e86756e4c65a53dd23106d7ecbfe2fa987cc13f3))
* 支持vip转移 ([361e8fe](https://github.com/certd/certd/commit/361e8fe7ae5877e23fd5de31bc919bedd09c57f5))

### Performance Improvements

* 群晖支持OTP双重验证登录 ([8b8039f](https://github.com/certd/certd/commit/8b8039f42bbce10a4d0e737cdeeeef9bb17bee5a))
* 任务支持禁用 ([8ed16b3](https://github.com/certd/certd/commit/8ed16b3ea2dfe847357863a0bfa614e4fa5fc041))
* 优化主机登录失败提示 ([9de77b3](https://github.com/certd/certd/commit/9de77b327d39cff5ed6660ec53b58ba0eea18e5a))
* 增加重启certd插件 ([48238d9](https://github.com/certd/certd/commit/48238d929e6c4afa1d428e4d35b9159d37a47ae0))
* 支持七牛云 ([8ecc2f9](https://github.com/certd/certd/commit/8ecc2f9446a9ebd11b9bfbffbb6cf7812a043495))
* 支持k8s ingress secret ([e5a5d0a](https://github.com/certd/certd/commit/e5a5d0a607bb6b4e1a1f7a1a419bada5f2dee59f))
* plugins增加图标 ([a8da658](https://github.com/certd/certd/commit/a8da658a9723342b4f43a579f7805bfef0648efb))

## [1.24.4](https://github.com/certd/certd/compare/v1.24.3...v1.24.4) (2024-09-09)

### Bug Fixes

* 修复腾讯云cdn证书部署后会自动关闭hsts，http2.0等配置的bug ([7908ab7](https://github.com/certd/certd/commit/7908ab79da624c94fa05849925b15e480e3317c4))
* 修复腾讯云tke证书部署报错的bug ([653f409](https://github.com/certd/certd/commit/653f409d91a441850d6381f89a8dd390831f0d5e))

### Performance Improvements

* 支持群晖 ([5c270b6](https://github.com/certd/certd/commit/5c270b6b9d45a2152f9fdb3c07bd98b7c803cb8e))

## [1.24.3](https://github.com/certd/certd/compare/v1.24.2...v1.24.3) (2024-09-06)

### Performance Improvements

* 支持多吉云cdn证书部署 ([65ef685](https://github.com/certd/certd/commit/65ef6857296784ca765926e09eafcb6fc8b6ecde))

## [1.24.2](https://github.com/certd/certd/compare/v1.24.1...v1.24.2) (2024-09-06)

### Bug Fixes

* 修复复制流水线出现的各种问题 ([6314e8d](https://github.com/certd/certd/commit/6314e8d7eb58cd52e2a7bd3b5ffb9112b0b69577))
* 修复windows下无法执行第二条命令的bug ([71ac8aa](https://github.com/certd/certd/commit/71ac8aae4aa694e1a23761e9761c9fba30b43a21))

### Performance Improvements

* 任务配置不需要的字段可以自动隐藏 ([192d9dc](https://github.com/certd/certd/commit/192d9dc7e36737d684c769f255f407c28b1152ac))
* 任务支持拖动排序 ([1e9b563](https://github.com/certd/certd/commit/1e9b5638aa36a8ce70019a9c750230ba41938327))
* 西部数据支持用户级的apikey ([1c17b41](https://github.com/certd/certd/commit/1c17b41e160944b073e1849e6f9467c3659a4bfc))
* 修复windows下无法执行第二条命令的bug ([d5bfcdb](https://github.com/certd/certd/commit/d5bfcdb6de1dcc1702155442e2e00237d0bbb6e5))
* 支持阿里云oss ([87a2673](https://github.com/certd/certd/commit/87a2673e8c33dff6eda1b836d92ecc121564ed78))
* 支持西部数码DNS ([c59cab1](https://github.com/certd/certd/commit/c59cab1aaeb19f86df8e3e0d8127cbd0a9ef77f3))
* 支持pfx、der ([fbeaed2](https://github.com/certd/certd/commit/fbeaed203519f59b6d9396c4e8953353ccb5e723))

## [1.24.1](https://github.com/certd/certd/compare/v1.24.0...v1.24.1) (2024-09-02)

### Performance Improvements

* 部署插件支持宝塔、易盾云等 ([ee61709](https://github.com/certd/certd/commit/ee617095efa1171548cf52fd45f0f98a368555a3))
* 授权配置支持加密 ([42a56b5](https://github.com/certd/certd/commit/42a56b581d754c3e5f9838179d19ab0d004ef2eb))
* 优化内存占用 ([db61033](https://github.com/certd/certd/commit/db6103363364440b650bc10bb334834e4a9470c7))
* 支持阿里云 DCDN ([98b77f8](https://github.com/certd/certd/commit/98b77f80843834616fb26f83b4c42245326abd06))
* 支持已跳过的步骤重新运行 ([ea775ad](https://github.com/certd/certd/commit/ea775adae18d57a04470cfba6b9460d761d74035))
* 支持cdnfly ([724a850](https://github.com/certd/certd/commit/724a85028b4a7146c9e3b4df4497dcf2a7bf7c67))
* 支持ftp上传 ([b9bddbf](https://github.com/certd/certd/commit/b9bddbfabb5664365f1232e9432532187c98006c))

# [1.24.0](https://github.com/certd/certd/compare/v1.23.1...v1.24.0) (2024-08-25)

### Bug Fixes

* 部署到腾讯云cdn选择证书任务步骤限制只能选证书 ([3345c14](https://github.com/certd/certd/commit/3345c145b802170f75a098a35d0c4b8312efcd17))
* 修复成功后跳过之后丢失腾讯云证书id的bug ([37eb762](https://github.com/certd/certd/commit/37eb762afe25c5896b75dee25f32809f8426e7b7))
* 修复创建流水线后立即运行时报no id错误的bug ([17ead54](https://github.com/certd/certd/commit/17ead547aab25333603980304aa3aad3db1f73d5))
* 修复执行日志没有清理的bug ([22a3363](https://github.com/certd/certd/commit/22a336370a88a7df2a23c967043bae153da71ed5))
* 修复ssh无法连接成功，无法执行命令的bug ([41b9837](https://github.com/certd/certd/commit/41b9837582323fb400ef8525ce65e8b37ad4b36f))

### Features

* 支持ECC类型 ([a7424e0](https://github.com/certd/certd/commit/a7424e02f5c7e02ac1688791040785920ce67473))

### Performance Improvements

* 更新k8s底层api库 ([746bb9d](https://github.com/certd/certd/commit/746bb9d385e2f397daef4976eca1d4782a2f5ebd))
* 优化成功后跳过的提示 ([7b451bb](https://github.com/certd/certd/commit/7b451bbf6e6337507f4627b5a845f5bd96ab4f7b))
* 优化证书申请成功率 ([968c469](https://github.com/certd/certd/commit/968c4690a07f69c08dcb3d3a494da4e319627345))
* 优化dnspod的token id 说明 ([790bf11](https://github.com/certd/certd/commit/790bf11af06d6264ef74bc1bb919661f0354239a))
* email proxy ([453f1ba](https://github.com/certd/certd/commit/453f1baa0b9eb0f648aa1b71ccf5a95b202ce13f))

## [1.23.1](https://github.com/certd/certd/compare/v1.23.0...v1.23.1) (2024-08-06)

### Bug Fixes

* 修复模糊查询无效的bug ([9355917](https://github.com/certd/certd/commit/93559174c780173f0daec7cdbd1f72f8d5c504d5))

### Performance Improvements

* 优化插件字段的default value ([24c7be2](https://github.com/certd/certd/commit/24c7be2c9cb39c14f7a97b674127c88033280b02))

# [1.23.0](https://github.com/certd/certd/compare/v1.22.9...v1.23.0) (2024-08-05)

### Bug Fixes

* 修复环境变量多个下划线不生效的bug ([7ec2218](https://github.com/certd/certd/commit/7ec2218c9fee5bee2bf0aa31f3e3a4301575f247))

## [1.22.9](https://github.com/certd/certd/compare/v1.22.8...v1.22.9) (2024-08-05)

### Performance Improvements

* 优化定时任务 ([87e440e](https://github.com/certd/certd/commit/87e440ee2a8b10dc571ce619f28bc83c1e5eb147))

## [1.22.8](https://github.com/certd/certd/compare/v1.22.7...v1.22.8) (2024-08-05)

### Performance Improvements

* 修复删除历史记录没有删除log的bug，新增history管理页面，演示站点启动时不自动启动非管理员用户的定时任务 ([f78ae93](https://github.com/certd/certd/commit/f78ae93eedfe214008c3d071ca3d77c962137a64))
* 优化pipeline删除时，删除其他history ([b425203](https://github.com/certd/certd/commit/b4252033d56a9ad950f3e204ff021497c3978015))

## [1.22.7](https://github.com/certd/certd/compare/v1.22.6...v1.22.7) (2024-08-04)

### Bug Fixes

* 修复保存配置报id不能为空的bug ([367f807](https://github.com/certd/certd/commit/367f80731396003416665c22853dfbc09c2c03a0))

## [1.22.6](https://github.com/certd/certd/compare/v1.22.5...v1.22.6) (2024-08-03)

### Bug Fixes

* 修复在相同的cron时偶尔无法触发定时任务的bug ([680941a](https://github.com/certd/certd/commit/680941af119619006b592e3ab6fb112cb5556a8b))
* 修复pg下pipeline title 类型问题 ([a9717b9](https://github.com/certd/certd/commit/a9717b9a0df7b5a64d4fe03314fecad4f59774cc))

### Performance Improvements

* 流水线支持名称模糊查询 ([59897c4](https://github.com/certd/certd/commit/59897c4ceae992ebe2972ca9e8f9196616ffdfd7))
* 腾讯云clb支持更多大区选择 ([e4f4570](https://github.com/certd/certd/commit/e4f4570b29f26c60f1ee9660a4c507cbeaba3d7e))

## [1.22.5](https://github.com/certd/certd/compare/v1.22.4...v1.22.5) (2024-07-26)

### Bug Fixes

* 修复用户管理无法添加用户的bug ([e7e89b8](https://github.com/certd/certd/commit/e7e89b8de7386e84c0d6b8e217e2034909657d68))

## [1.22.4](https://github.com/certd/certd/compare/v1.22.3...v1.22.4) (2024-07-26)

**Note:** Version bump only for package @certd/ui-server

## [1.22.3](https://github.com/certd/certd/compare/v1.22.2...v1.22.3) (2024-07-25)

**Note:** Version bump only for package @certd/ui-server

## [1.22.2](https://github.com/certd/certd/compare/v1.22.1...v1.22.2) (2024-07-23)

### Bug Fixes

* 修复创建流水线时，无法根据dns类型默认正确的dns授权的bug ([a2c43b5](https://github.com/certd/certd/commit/a2c43b50a6069ed48958fd142844a8568c2af452))

## [1.22.1](https://github.com/certd/certd/compare/v1.22.0...v1.22.1) (2024-07-20)

### Performance Improvements

* 创建证书任务可以选择lege插件 ([affef13](https://github.com/certd/certd/commit/affef130378030c517250c58a4e787b0fc85d7d1))
* 支持配置启动后自动触发一次任务 ([a5a0c1f](https://github.com/certd/certd/commit/a5a0c1f6e7a3f05e581005e491d5b102ee854412))

# [1.22.0](https://github.com/certd/certd/compare/v1.21.2...v1.22.0) (2024-07-19)

### Features

* 升级midway，支持esm ([485e603](https://github.com/certd/certd/commit/485e603b5165c28bc08694997726eaf2a585ebe7))
* 支持lego，海量DNS提供商 ([0bc6d0a](https://github.com/certd/certd/commit/0bc6d0a211920fb0084d705e1db67ee1e7262c44))
* 支持postgresql ([3b19bfb](https://github.com/certd/certd/commit/3b19bfb4291e89064b3b407a80dae092d54747d5))

### Performance Improvements

* 优化一些小细节 ([b168852](https://github.com/certd/certd/commit/b1688525dbbbfd67e0ab1cf5b4ddfbe9d394f370))
* 自动生成jwtkey，无需手动配置 ([390e485](https://github.com/certd/certd/commit/390e4853a570390a97df6a3b3882579f9547eeb4))

## [1.21.2](https://github.com/fast-crud/fast-server-js/compare/v1.21.1...v1.21.2) (2024-07-08)

**Note:** Version bump only for package @certd/ui-server

## [1.21.1](https://github.com/fast-crud/fast-server-js/compare/v1.21.0...v1.21.1) (2024-07-08)

### Performance Improvements

* 上传到主机，支持设置不mkdirs ([5ba9831](https://github.com/fast-crud/fast-server-js/commit/5ba9831ed1aa6ec6057df246f1035b36b9c41d2e))
* 说明优化，默认值优化 ([970c7fd](https://github.com/fast-crud/fast-server-js/commit/970c7fd8a0f557770e973d8462ee5684ef742810))

# [1.21.0](https://github.com/fast-crud/fast-server-js/compare/v1.20.17...v1.21.0) (2024-07-03)

**Note:** Version bump only for package @certd/ui-server

## [1.20.17](https://github.com/fast-crud/fast-server-js/compare/v1.20.16...v1.20.17) (2024-07-03)

### Performance Improvements

* 文件上传提示由cert.crt改为cert.pem ([a09b0e4](https://github.com/fast-crud/fast-server-js/commit/a09b0e48c176f3ed763791bd50322c29729f7c1c))

## [1.20.16](https://github.com/fast-crud/fast-server-js/compare/v1.20.15...v1.20.16) (2024-07-01)

### Bug Fixes

* 修复配置了cdn cname后申请失败的bug ([4a5fa76](https://github.com/fast-crud/fast-server-js/commit/4a5fa767edc347d03d29a467e86c9a4d70b0220c))

## [1.20.15](https://github.com/fast-crud/fast-server-js/compare/v1.20.14...v1.20.15) (2024-06-28)

### Bug Fixes

* 修复无法强制取消任务的bug ([9cc01db](https://github.com/fast-crud/fast-server-js/commit/9cc01db1d569a5c45bb3e731f35d85df324a8e62))

### Performance Improvements

* 腾讯云dns provider 支持腾讯云的accessId ([e0eb3a4](https://github.com/fast-crud/fast-server-js/commit/e0eb3a441384d474fe2923c69b25318264bdc9df))
* 支持windows文件上传 ([7f61cab](https://github.com/fast-crud/fast-server-js/commit/7f61cab101fa13b4e88234e9ad47434e6130fed2))

## [1.20.14](https://github.com/fast-crud/fast-server-js/compare/v1.20.13...v1.20.14) (2024-06-23)

**Note:** Version bump only for package @certd/ui-server

## [1.20.13](https://github.com/fast-crud/fast-server-js/compare/v1.20.12...v1.20.13) (2024-06-18)

### Performance Improvements

* ssh登录支持openssh格式私钥、支持私钥密码 ([5c2c508](https://github.com/fast-crud/fast-server-js/commit/5c2c50839a9076004f9034d754ac6deb531acdfb))

## [1.20.12](https://github.com/fast-crud/fast-server-js/compare/v1.20.10...v1.20.12) (2024-06-17)

### Bug Fixes

* 修复aliyun域名超过100个找不到域名的bug ([5b1494b](https://github.com/fast-crud/fast-server-js/commit/5b1494b3ce93d1026dc56ee741342fbb8bf7be24))

### Performance Improvements

* 增加系统设置，可以关闭自助注册功能 ([20feace](https://github.com/fast-crud/fast-server-js/commit/20feacea12d43386540db6a600f391d786be4014))
* 增加cloudflare access token说明 ([934e6e2](https://github.com/fast-crud/fast-server-js/commit/934e6e2bd05387cd50ffab95f230933543954098))
* 支持重置管理员密码，忘记密码的补救方案 ([732cbc5](https://github.com/fast-crud/fast-server-js/commit/732cbc5e927b526850724594830392b2f10c6705))
* 支持cloudflare域名 ([fbb9a47](https://github.com/fast-crud/fast-server-js/commit/fbb9a47e8f7bb805289b9ee64bd46ffee0f01c06))

## [1.20.10](https://github.com/fast-crud/fast-server-js/compare/v1.20.9...v1.20.10) (2024-05-30)

### Performance Improvements

* 上传到主机插件支持复制到本机路径 ([92446c3](https://github.com/fast-crud/fast-server-js/commit/92446c339936f98f08f654b8971a7393d8435224))
* 优化文件下载包名 ([d9eb927](https://github.com/fast-crud/fast-server-js/commit/d9eb927b0a1445feab08b1958aa9ea80637a5ae6))

## [1.20.9](https://github.com/fast-crud/fast-server-js/compare/v1.20.8...v1.20.9) (2024-03-22)

**Note:** Version bump only for package @certd/ui-server

## [1.20.8](https://github.com/fast-crud/fast-server-js/compare/v1.20.7...v1.20.8) (2024-03-22)

**Note:** Version bump only for package @certd/ui-server

## [1.20.7](https://github.com/fast-crud/fast-server-js/compare/v1.20.6...v1.20.7) (2024-03-22)

**Note:** Version bump only for package @certd/ui-server

## [1.20.6](https://github.com/fast-crud/fast-server-js/compare/v1.20.5...v1.20.6) (2024-03-21)

### Performance Improvements

* 插件贡献文档及示例 ([72fb20a](https://github.com/fast-crud/fast-server-js/commit/72fb20abf3ba5bdd862575d2907703a52fd7eb17))

## [1.20.5](https://github.com/fast-crud/fast-server-js/compare/v1.20.2...v1.20.5) (2024-03-11)

**Note:** Version bump only for package @certd/ui-server

## [1.20.2](https://github.com/fast-crud/fast-server-js/compare/v1.2.1...v1.20.2) (2024-02-28)

**Note:** Version bump only for package @certd/ui-server

## [1.2.1](https://github.com/fast-crud/fast-server-js/compare/v1.2.0...v1.2.1) (2023-12-12)

### Bug Fixes

* 修复邮箱设置无效的bug ([aaa3224](https://github.com/fast-crud/fast-server-js/commit/aaa322464d0f65e924d1850995540d396ee24d25))

**Note:** Version bump only for package @certd/ui-server

# [1.2.0](https://github.com/fast-crud/fast-server-js/compare/v1.1.6...v1.2.0) (2023-10-27)

**Note:** Version bump only for package @certd/ui-server

## [1.1.6](https://github.com/fast-crud/fast-server-js/compare/v1.1.5...v1.1.6) (2023-07-10)

**Note:** Version bump only for package @certd/ui-server

## [1.1.5](https://github.com/fast-crud/fast-server-js/compare/v1.1.4...v1.1.5) (2023-07-03)

**Note:** Version bump only for package @certd/ui-server

## [1.1.4](https://github.com/fast-crud/fast-server-js/compare/v1.1.3...v1.1.4) (2023-07-03)

### Performance Improvements

* cancel task ([bc65c0a](https://github.com/fast-crud/fast-server-js/commit/bc65c0a786360c087fe95cad93ec6a87804cc5ee))
* flush logger ([91be682](https://github.com/fast-crud/fast-server-js/commit/91be6826b902e0f302b1a6cbdb1d24e15914c18d))
* timeout ([3eeb1f7](https://github.com/fast-crud/fast-server-js/commit/3eeb1f77aa2922f3545f3d2067f561d95621d54f))

## [1.1.3](https://github.com/fast-crud/fast-server-js/compare/v1.1.2...v1.1.3) (2023-07-03)

**Note:** Version bump only for package @certd/ui-server

## [1.1.2](https://github.com/fast-crud/fast-server-js/compare/v1.1.1...v1.1.2) (2023-07-03)

**Note:** Version bump only for package @certd/ui-server

## [1.1.1](https://github.com/fast-crud/fast-server-js/compare/v1.1.0...v1.1.1) (2023-06-28)

**Note:** Version bump only for package @certd/ui-server

# [1.1.0](https://github.com/fast-crud/fast-server-js/compare/v1.0.6...v1.1.0) (2023-06-28)

### Features

* 权限控制 ([27a4c81](https://github.com/fast-crud/fast-server-js/commit/27a4c81c6d70e70abb3892c3ea58d4719988808a))
* 邮件通知 ([937e3fa](https://github.com/fast-crud/fast-server-js/commit/937e3fac19cd03b8aa91db8ba03fda7fcfbacea2))
* cert download ([5a51c14](https://github.com/fast-crud/fast-server-js/commit/5a51c14de521cb8075a80d2ae41a16e6d5281259))
* config  merge ([fdc25dc](https://github.com/fast-crud/fast-server-js/commit/fdc25dc0d795555cffacc4572648ec158988fbbb))
* save files ([671d273](https://github.com/fast-crud/fast-server-js/commit/671d273e2f9136d16896536b0ca127cf372f1619))

## [1.0.6](https://github.com/fast-crud/fast-server-js/compare/v1.0.5...v1.0.6) (2023-05-25)

**Note:** Version bump only for package @certd/ui-server

## [1.0.5](https://github.com/fast-crud/fast-server-js/compare/v1.0.4...v1.0.5) (2023-05-25)

**Note:** Version bump only for package @certd/ui-server

## [1.0.4](https://github.com/fast-crud/fast-server-js/compare/v1.0.3...v1.0.4) (2023-05-25)

**Note:** Version bump only for package @certd/ui-server

## [1.0.3](https://github.com/fast-crud/fast-server-js/compare/v1.0.2...v1.0.3) (2023-05-25)

**Note:** Version bump only for package @certd/ui-server

## [1.0.2](https://github.com/fast-crud/fast-server-js/compare/v1.0.1...v1.0.2) (2023-05-24)

**Note:** Version bump only for package @certd/ui-server

## [1.0.1](https://github.com/fast-crud/fast-server-js/compare/v1.0.0...v1.0.1) (2023-05-24)

**Note:** Version bump only for package @certd/ui-server
