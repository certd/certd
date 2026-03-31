# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.39.8](https://github.com/certd/certd/compare/v1.39.7...v1.39.8) (2026-03-31)

### Bug Fixes

* 修复上传头像退出登录的bug ([6eb20a1](https://github.com/certd/certd/commit/6eb20a1f2e31d984d9135edbf39c97cdd15621f9))

### Performance Improvements

* 阿里云dcdn支持根据证书域名匹配模式 ([df012de](https://github.com/certd/certd/commit/df012dec90590ecba85a69ed6355cfa8382c1da3))
* dcdn自动匹配部署，支持新增域名感知 ([c6a988b](https://github.com/certd/certd/commit/c6a988bc925886bd7163c1270f2b7a10a57b1c5b))

## [1.39.7](https://github.com/certd/certd/compare/v1.39.6...v1.39.7) (2026-03-25)

**Note:** Version bump only for package @certd/ui-client

## [1.39.6](https://github.com/certd/certd/compare/v1.39.5...v1.39.6) (2026-03-22)

### Bug Fixes

* 修复模版id不正确导致修改到错误的模版流水线bug ([b1ff163](https://github.com/certd/certd/commit/b1ff163a2828b205297408d5aed21cf1eff335e8))
* remote-select默认pageSize设置为50，阿里云WAF不支持pageSize100 ([285532d](https://github.com/certd/certd/commit/285532d4318b90d0d7f8154f070274c0a0ec0269))

### Performance Improvements

* 企业模式下面增加个人数据迁移的引导 ([431afd6](https://github.com/certd/certd/commit/431afd618f547cecf9a29433f46d4367619e2ecf))
* 优化远程数据选择框，选择数据时不刷新闪烁 ([7f6a8bc](https://github.com/certd/certd/commit/7f6a8bc87e364685defe7f039264b2de064806c5))
* 支持复制粘贴任务步骤 ([acc2df2](https://github.com/certd/certd/commit/acc2df29def017fb8165f931b41ef95414966afc))

## [1.39.5](https://github.com/certd/certd/compare/v1.39.4...v1.39.5) (2026-03-18)

### Bug Fixes

* 修复修改分组报错的bug ([224db7d](https://github.com/certd/certd/commit/224db7da57dbdddf25bcac7faa0a29eb228c5a33))

### Performance Improvements

* passkey 支持Bitwarden ([29f44c6](https://github.com/certd/certd/commit/29f44c67c808bed9ff1c9d4884d39a1a62d043a7))
* passkey登录放到下方其他登录位置 ([1413e1a](https://github.com/certd/certd/commit/1413e1aff4aabcfd471716338c210fbcfd76c8f9))

## [1.39.4](https://github.com/certd/certd/compare/v1.39.3...v1.39.4) (2026-03-17)

### Bug Fixes

* 修复阿里云证书订单翻页问题 ([6d43623](https://github.com/certd/certd/commit/6d43623f459a7594599e50a7ed89d67fcc775518))
* 修复查看证书详情页面错位的bug ([7f37df4](https://github.com/certd/certd/commit/7f37df42274e657892d92e868ceac67e139f3bf2))
* 修复选择插件页面无法滚动的bug ([d8425bc](https://github.com/certd/certd/commit/d8425bc9c5ee81bb669706c6de6bad69d7c38d8e))

### Performance Improvements

* 优化passkey ([9e12412](https://github.com/certd/certd/commit/9e12412f5fa7800df1d7efaf62cd8fd5d79bb569))

## [1.39.3](https://github.com/certd/certd/compare/v1.39.2...v1.39.3) (2026-03-17)

### Bug Fixes

* 修复多选框只能单选的bug ([12700e1](https://github.com/certd/certd/commit/12700e1754319513ac02822ff1588d63420b964e))

## [1.39.2](https://github.com/certd/certd/compare/v1.39.1...v1.39.2) (2026-03-16)

### Bug Fixes

* 修复群晖测试时报addSecret undefine错误 ([5eb4aa3](https://github.com/certd/certd/commit/5eb4aa3a0eab9ffa729c8e813cbf973d9683cc13))
* 修复提示支付失败的bug ([12fed34](https://github.com/certd/certd/commit/12fed34e109f3254de664813954081a52513bd38))
* 修复修改项目名称后，没有同步刷新的bug ([3abee72](https://github.com/certd/certd/commit/3abee72fee286864b665033b23b172ef0ea92d83))
* cname provider授权修改为sys级别 ([d01bfbe](https://github.com/certd/certd/commit/d01bfbec96a3a2109ec864953b0c9e8c1f95b97b))

### Performance Improvements

* 查看证书增加证书详情显示，包括域名，过期时间，颁发机构，指纹等 ([0b9933d](https://github.com/certd/certd/commit/0b9933df1e8d1685d14271435a8a7488974cc47b))
* 获取阿里证书订单id组件增加翻页功能，突破50的上限 ([d79db3b](https://github.com/certd/certd/commit/d79db3bd3f0d5ad39664bb47ec3814d43ad93304))
* 优化阿里云连接超时时长为10秒，支持配置环境变量 ([1588461](https://github.com/certd/certd/commit/1588461633bd275765daa96fc68320abb58d616d))
* 优化个人账户页面 ([e506116](https://github.com/certd/certd/commit/e50611666ef731a903d7bdd8eb62333b97e2cc5b))
* 支持批量转移流水线到其他项目 ([8a3841f](https://github.com/certd/certd/commit/8a3841f6382b53ce2343307fb035e74fa5383fef))
* 支持passkey登录 ([10b7644](https://github.com/certd/certd/commit/10b7644bb7ba5f82776537bc0c4f5eb95d5f8e4e))
* dns-provider 支持bind9 ，support bind9 ([76d12d6](https://github.com/certd/certd/commit/76d12d60624c0672fd3717a80a2cfef6845b14b8))

## [1.39.1](https://github.com/certd/certd/compare/v1.39.0...v1.39.1) (2026-03-09)

### Bug Fixes

* 修复企业管理模式下，切换用户登录后，丢失项目列表的bug ([d23c8b4](https://github.com/certd/certd/commit/d23c8b4a2a5f5ab17822c6ee1d4108ac7280b9d1))

### Performance Improvements

* 支持迁移个人数据到企业项目中 ([c6ca832](https://github.com/certd/certd/commit/c6ca83273779ed84de1b23b5e477063af043d015))

# [1.39.0](https://github.com/certd/certd/compare/v1.38.12...v1.39.0) (2026-03-07)

### Bug Fixes

* 修复发件邮箱无法输入的bug ([27b0348](https://github.com/certd/certd/commit/27b0348e1d3d752f418f851965d6afbc26c0160c))
* 修复复制流水线保存后丢失分组和排序号的问题 ([bc32648](https://github.com/certd/certd/commit/bc326489abc1d50a0930b4f47aa2d62d3a486798))
* 修复获取群辉deviceid报错的bug ([79be392](https://github.com/certd/certd/commit/79be392775a2c91848dd5a66a2618adc4e4b48f6))
* 修复偶尔下载证书报未授权的错误 ([316537e](https://github.com/certd/certd/commit/316537eb4dcbe5ec57784e8bf95ee3cdfd21dce7))

### Features

* 支持企业级管理模式，项目管理，细分权限 ([3734083](https://github.com/certd/certd/commit/37340838b6a61a94b86bfa13cf5da88b26f1315a))

### Performance Improvements

* 当域名管理中没有域名时，创建流水线时不展开域名选择框 ([bb0afe1](https://github.com/certd/certd/commit/bb0afe1fa7b0fc52fde051d24fbe6be69d52f4cc))
* 任务步骤页面增加串行执行提示说明 ([787f6ef](https://github.com/certd/certd/commit/787f6ef52893d8dc912ee2a7a5b8ce2b73c108c9))

## [1.38.12](https://github.com/certd/certd/compare/v1.38.11...v1.38.12) (2026-02-18)

### Bug Fixes

* 修复获取群辉deviceid报错的bug ([39d3bf9](https://github.com/certd/certd/commit/39d3bf97d1935918bac575da9d0726310c83c19d))

## [1.38.11](https://github.com/certd/certd/compare/v1.38.10...v1.38.11) (2026-02-16)

### Performance Improvements

* 优化登陆页面的黑暗模式 ([e47edda](https://github.com/certd/certd/commit/e47eddaa858f8fffe7a40dfbd14e8cda1dcba4ac))
* 支持自定义发件人名称，格式：名称<邮箱> ([bab9adc](https://github.com/certd/certd/commit/bab9adce240108d4291eedc67e04abc4a01019e0))

## [1.38.10](https://github.com/certd/certd/compare/v1.38.9...v1.38.10) (2026-02-15)

### Bug Fixes

* 修复1panel 请求失败的bug ([0283662](https://github.com/certd/certd/commit/0283662931ff47d6b5d49f91a30c4a002fe1d108))
* 修复保存站点监控dns设置，偶尔无法保存成功的bug ([8387fe0](https://github.com/certd/certd/commit/8387fe0d5b2e77b8c2788a10791e5389d97a3e41))
* 修复任务步骤标题过长导致错位的问题 ([9fb9805](https://github.com/certd/certd/commit/9fb980599f96ccbf61bd46019411db2f13c70e57))

### Performance Improvements

* 监控设置支持逗号分割 ([c23d1d1](https://github.com/certd/certd/commit/c23d1d11b58a6cdfe431a7e8abbd5d955146c38d))
* 列表中支持下次执行时间显示 ([a3cabd5](https://github.com/certd/certd/commit/a3cabd5f36ed41225ad418098596e9b2c44e31a1))
* 模版编辑页面，hover反色过亮问题优化 ([e55a3a8](https://github.com/certd/certd/commit/e55a3a82fc6939b940f0c3be4529d74a625f6f4e))
* 所有授权增加测试按钮 ([7a3e68d](https://github.com/certd/certd/commit/7a3e68d656c1dcdcd814b69891bd2c2c6fe3098a))
* 优化网络测试页面，夜间模式显示效果 ([305da86](https://github.com/certd/certd/commit/305da86f97d918374819ecd6c50685f09b94ea59))
* 支持next-terminal ([6f3fd78](https://github.com/certd/certd/commit/6f3fd785e77a33c72bdf4115dc5d498e677d1863))
* 主题默认跟随系统颜色（自动切换深色浅色模式） ([32c3ce5](https://github.com/certd/certd/commit/32c3ce5c9868569523901a9a939ca5b535ec3277))
* http校验方式支持scp上传 ([4eb940f](https://github.com/certd/certd/commit/4eb940ffe765a0330331bc6af8396315e36d4e4a))

## [1.38.9](https://github.com/certd/certd/compare/v1.38.8...v1.38.9) (2026-02-09)

### Performance Improvements

* 已登录状态访问登录页面自动跳转到首页 ([bd8caff](https://github.com/certd/certd/commit/bd8caff0b754cb13530cf0f1644b33e29fde5d01))
* 优化access授权支持remote-auto-complete ([2f40f79](https://github.com/certd/certd/commit/2f40f795ee6131132d3fab2601f92a567bbdc4b7))
* access 插件支持remote-select等配置 ([d286c04](https://github.com/certd/certd/commit/d286c040a5232dcca829945734affead3ee08b3c))

## [1.38.8](https://github.com/certd/certd/compare/v1.38.7...v1.38.8) (2026-02-06)

### Performance Improvements

* 双重验证显示secret ([febd6d3](https://github.com/certd/certd/commit/febd6d32cfe6d89ccecf26bf15141df7c456e5c6))
* 支持设置默认的证书申请地址的反向代理 ([0cfb94b](https://github.com/certd/certd/commit/0cfb94b0ba6a6dc3bb0d0a81a1912068a4e6b6b6))
* 子域名托管域名支持配置通配符 ([3f7ac93](https://github.com/certd/certd/commit/3f7ac939326b0c7ec013a7534b6c0e58fb3e8cb4))

## [1.38.7](https://github.com/certd/certd/compare/v1.38.6...v1.38.7) (2026-02-05)

### Bug Fixes

* 修复有域名记录时，域名输入框无法关闭的bug ([54c8217](https://github.com/certd/certd/commit/54c8217808453b121abf646b004596f28932509f))

### Performance Improvements

*  eab从更多参数中挪到外面 ([5ea4f46](https://github.com/certd/certd/commit/5ea4f46de7ae403a7a16e9488dc1d9c7523d019a))

## [1.38.6](https://github.com/certd/certd/compare/v1.38.5...v1.38.6) (2026-02-04)

### Performance Improvements

* 当域名管理中没有域名时，创建流水线时不展开域名选择框 ([9166a57](https://github.com/certd/certd/commit/9166a579301a60750f0b72b6a42b0c8d730695fd))
* count tip ([e19743f](https://github.com/certd/certd/commit/e19743f70553700f1f91bff76f87370f749dd247))
* oauth支持github 和google， 修复头像显示问题 ([693a4a6](https://github.com/certd/certd/commit/693a4a663385ced3176286bf4b5f3566da83d90e))

## [1.38.5](https://github.com/certd/certd/compare/v1.38.4...v1.38.5) (2026-02-02)

### Bug Fixes

* 某些情况下登陆页面没有显示重置密码文档链接的问题 ([40801d0](https://github.com/certd/certd/commit/40801d0a0668c77adb57fae42b4b6615b198a88d))

### Performance Improvements

* 支持绑定两个url地址 ([a2e9a41](https://github.com/certd/certd/commit/a2e9a41a7e712395c0e3ee6fe55b370aa1fc1f12))

## [1.38.4](https://github.com/certd/certd/compare/v1.38.3...v1.38.4) (2026-01-31)

### Bug Fixes

* 修复1:: 形式的ipv6校验失败的bug ([8b96f21](https://github.com/certd/certd/commit/8b96f218d5284033f10c186c0ce18e4c16d8e9b2))

### Performance Improvements

* 首页证书数量支持点击跳转 ([52cbff0](https://github.com/certd/certd/commit/52cbff0e15329aecd3edcf81315fb7ceab9ec290))
* 验证码支持 Cloudflare Turnstile ，谨慎启用，国内被墙了 ([ca43c77](https://github.com/certd/certd/commit/ca43c775250154def63c4acd96d65dc95d1c0c2b))
* 优化证书未过期时的任务日志提示 ([ac85488](https://github.com/certd/certd/commit/ac85488245197694560aad7df9425ca215ef7ff7))

## [1.38.3](https://github.com/certd/certd/compare/v1.38.2...v1.38.3) (2026-01-28)

### Performance Improvements

* 首次使用提示新手教程按钮 ([e054c8f](https://github.com/certd/certd/commit/e054c8fc55063fd96548f1c19049070524a63411))
* 输入证书域名时，支持点击导入域名 ([40be424](https://github.com/certd/certd/commit/40be42406c6fd5de11f594fc6913178d9e7d8943))
* 优化首页统计数据，饼图替换成证书数量统计 ([9fa1c2e](https://github.com/certd/certd/commit/9fa1c2eb3e55ef630333ae24284aa8b54e3414b6))
* 优化首页图标 ([998de0f](https://github.com/certd/certd/commit/998de0f9a031339b019aa7a09e61e994664a8047))
* 域名导入任务进度条 ([7058d5c](https://github.com/certd/certd/commit/7058d5cb935cab8c75b98493ed497a22dbe70883))
* 站点监控，检查状态挪到前面显示 ([48f1bf0](https://github.com/certd/certd/commit/48f1bf091869b87dd17feaca5efd8680ef741582))
* 证书仓库页面增加到期状态查询条件 ([58c3d70](https://github.com/certd/certd/commit/58c3d7087bb66358d896a741e12005f690b2bd5e))
* 证书流水线创建域名输入框支持获取域名数据进行选择 ([1d5b1c2](https://github.com/certd/certd/commit/1d5b1c239cf350920eb2eb9fd293af74ef412853))
* 支持导入51dns域名 ([7eb9694](https://github.com/certd/certd/commit/7eb96942214aed0dfc9c3c5a669374da67052c49))
* ucloud支持部署到ulb（alb、clb统一成一个） ([c408687](https://github.com/certd/certd/commit/c408687af7669afe733b5506720ca795555acdce))

## [1.38.2](https://github.com/certd/certd/compare/v1.38.1...v1.38.2) (2026-01-22)

### Bug Fixes

* 编辑插件author不允许出现符号 ([5ea2b09](https://github.com/certd/certd/commit/5ea2b09dc30397c086a2498f958f661e7fef10fc))
* 修复流水线复制出错的bug ([418bcdd](https://github.com/certd/certd/commit/418bcddc95bf19d2659d2a9cfe336bc059d157b0))

### Performance Improvements

* 优化流水线创建入口，各种证书申请任务类型拆分成多个按钮 ([f75c73d](https://github.com/certd/certd/commit/f75c73d739ee271fb718148416836dbe09bb3266))
* 域名导入 ([ad64384](https://github.com/certd/certd/commit/ad64384891c13342980b7559924666dcfb2796c2))
* 支持从提供商导入域名列表 ([f442363](https://github.com/certd/certd/commit/f4423638a2ee779d48fc17b3819ce3bee55b0361))
* 支持同步域名过期时间 ([a97cee8](https://github.com/certd/certd/commit/a97cee84f3bfdeeb2083d91f748cac5405fed6ae))
* cname记录支持批量导入和导出 ([607afe8](https://github.com/certd/certd/commit/607afe864a12d6f50993895a4e10f4c9a3dd8fee))

## [1.38.1](https://github.com/certd/certd/compare/v1.38.0...v1.38.1) (2026-01-15)

**Note:** Version bump only for package @certd/ui-client

# [1.38.0](https://github.com/certd/certd/compare/v1.37.17...v1.38.0) (2026-01-13)

### Bug Fixes

* 修复禁用第三方登录自动注册无效的bug ([7ee39fd](https://github.com/certd/certd/commit/7ee39fd4eddfc847bcef879f0904a4319993d081))
* 修复重启certd后，再启用流水线，不会自动执行的bug ([468ccbf](https://github.com/certd/certd/commit/468ccbf2b725fc4b78ce4b950a114e4a4be57698))

### Features

* 【破坏性更新】插件改为metadata加载模式，plugin-cert、plugin-lib包部分代码转移到certd-server中，影响自定义插件，需要修改相关import引用 ([a3fb249](https://github.com/certd/certd/commit/a3fb24993d7ac8fbb0bb354fa02ef067f609021e))

### Performance Improvements

* 流水线页面可以查看证书过期时间 ([be03d8e](https://github.com/certd/certd/commit/be03d8e13752c355dbec158da78b9cb4c3b3bb5d))
* 每页记录条数保持 ([14f9987](https://github.com/certd/certd/commit/14f99875fb3f535fa5ffb7bf5db3960b105aa7aa))
* 手机号登录放到前面 ([26ac081](https://github.com/certd/certd/commit/26ac08118219407c5dd3afc35130cdd48b8fab05))
* 优化微信支付对接文档 ([64e0d9a](https://github.com/certd/certd/commit/64e0d9a4d54b0d9da028be2c5e0ece7a97b2c250))
* 优化站点监控，支持设置忽略主站证书一致性，支持开启和关闭自动同步ip ([26f75c7](https://github.com/certd/certd/commit/26f75c71ba8866278dbe117f1bfaf671e7f70781))
* 增加邮件发送证书模版配置 ([cabc4da](https://github.com/certd/certd/commit/cabc4da3ac003a8c699c69f5bffea4c149be185c))
* 站点监控增加是否自动同步IP开关 ([5268904](https://github.com/certd/certd/commit/52689049ae8e004e1252ab1e2872fbf676e0295f))
* 证书流水线可以开启webhook ([840bd52](https://github.com/certd/certd/commit/840bd526714072315244a6900c95395d2d62f647))
* 支持公告功能 ([a79fe1f](https://github.com/certd/certd/commit/a79fe1f350f2991af9e5b50825f1776029677fc5))
* 支持webhook触发流水线，新增触发类型图标显示 ([1a29541](https://github.com/certd/certd/commit/1a2954114063a8b994c257a90e5814e0a3a8d924))
* webhook触发器一个流水线限制只能添加一个 ([6c39d7b](https://github.com/certd/certd/commit/6c39d7b1eecb679cb6506b0e3557e8152e01417d))
* zenlayer证书更新 ([9ba6c83](https://github.com/certd/certd/commit/9ba6c838215d0750cda925778a47002a521f05e9))

## [1.37.17](https://github.com/certd/certd/compare/v1.37.16...v1.37.17) (2025-12-29)

### Performance Improvements

* 批量修改定时时间支持随机时间 ([d0f653d](https://github.com/certd/certd/commit/d0f653da9a2970920e961e7404ff04080bccd343))
* 批量运行优化，支持普通运行和强制重新运行 ([039c62b](https://github.com/certd/certd/commit/039c62b09b37cdda35d33c6ee9adecad62dee75c))
* 优化源码方式部署，前端无需编译 ([13ddc97](https://github.com/certd/certd/commit/13ddc979ec7953e3db8db76dd23fd85a3b3c7997))
* 支持部署到goedge ([44bf4b1](https://github.com/certd/certd/commit/44bf4b1cc1aafa2d711c3b8e408009f0ceb413eb))
* 支持从阿里云商用证书订单中获取证书 ([8872466](https://github.com/certd/certd/commit/887246696861c3a0b1f99fd9ad978caea423c650))
* 支持授权给管理员查看和下载用户证书 ([1347355](https://github.com/certd/certd/commit/1347355cb117694abe99da385352a19771a32e84))
* 执行队列数量支持设置 ([cd94488](https://github.com/certd/certd/commit/cd944882c3272adad4a2da94a3889a01fe05fe13))
* aws route53 ([8caab1f](https://github.com/certd/certd/commit/8caab1fd9264df548f467b94202d567107b7a30b))

## [1.37.16](https://github.com/certd/certd/compare/v1.37.15...v1.37.16) (2025-12-15)

### Bug Fixes

* 修复ipv6作为证书域名申请证书校验失败的bug ([e4e16bc](https://github.com/certd/certd/commit/e4e16bc6a65bb082c18ca0590226f0987a47d477))

### Performance Improvements

* 批量设置定时，支持清除定时 ([63d8bcf](https://github.com/certd/certd/commit/63d8bcf8823f713365042d3c7aee3cf31d44b044))
* 支持彩虹聚合登录 ([6f18693](https://github.com/certd/certd/commit/6f186932ccad4becfdc0087c0539f7b2d0069844))
* 支持邮件模版设置 ([a6c0d2c](https://github.com/certd/certd/commit/a6c0d2c6f1fd6b60e6d7af290487c94564fd91ea))

## [1.37.15](https://github.com/certd/certd/compare/v1.37.14...v1.37.15) (2025-12-06)

### Performance Improvements

* 第三方登录支持gitee ([5cee7d4](https://github.com/certd/certd/commit/5cee7d44f17bd36972f477bc1f270999da558d05))

## [1.37.14](https://github.com/certd/certd/compare/v1.37.13...v1.37.14) (2025-12-02)

### Bug Fixes

* 修复注销登录时，第三方登录注销请求失败的报错 ([677e110](https://github.com/certd/certd/commit/677e1101e6cf4451abd8a876cc1d0ddd26a10b88))

## [1.37.13](https://github.com/certd/certd/compare/v1.37.12...v1.37.13) (2025-12-02)

### Performance Improvements

* 第三方登录允许选择logo ([bb3085e](https://github.com/certd/certd/commit/bb3085ef84201ccd2dc632ba8c5097cb00258be4))
* 支持OIDC单点登录 ([fbf12f1](https://github.com/certd/certd/commit/fbf12f16b5eaa7676fd41923587bf6bd2595adba))

## [1.37.12](https://github.com/certd/certd/compare/v1.37.11...v1.37.12) (2025-11-29)

### Performance Improvements

* 支持微信扫码登录 ([73325aa](https://github.com/certd/certd/commit/73325aaefb0e750a22aaac40929e7bf3f5864996))
* 支持证书颁发机构 LiteSSL ([6be7591](https://github.com/certd/certd/commit/6be75913324e2828d9016eb307ff2d0abbbb2191))

## [1.37.11](https://github.com/certd/certd/compare/v1.37.10...v1.37.11) (2025-11-28)

### Bug Fixes

* 修复备注撑开表格行高的bug ([c7b298c](https://github.com/certd/certd/commit/c7b298c46f0d52b43bd2bb17b374e7970a446446))
* 修复域名管理无法创建tencent-eo dns授权的bug ([3406bb5](https://github.com/certd/certd/commit/3406bb5a4a56bb310cddc1a1f410c70909fd129b))

### Performance Improvements

* 优化天翼云cdn 等待5秒部署完成 ([53c88ad](https://github.com/certd/certd/commit/53c88ad5afe66a3f7c38b9b759747918913a4edc))
* 支持oidc单点登录 ([ec75afb](https://github.com/certd/certd/commit/ec75afbc44139dbe9da534d8a8c08a5b91f86d3c))

## [1.37.10](https://github.com/certd/certd/compare/v1.37.9...v1.37.10) (2025-11-19)

### Performance Improvements

* 站点证书监控备注输入框改成textarea ([70b603d](https://github.com/certd/certd/commit/70b603d601c34f39148c2ab70c655c51babf563d))

## [1.37.9](https://github.com/certd/certd/compare/v1.37.8...v1.37.9) (2025-11-19)

### Bug Fixes

* 商用证书上传保存失败的bug ([075b1dc](https://github.com/certd/certd/commit/075b1dc0eb8c39acc277277b1b334d66b6717ab2))

## [1.37.8](https://github.com/certd/certd/compare/v1.37.7...v1.37.8) (2025-11-17)

### Performance Improvements

* 支持回车键触发登录 ([eb5c88f](https://github.com/certd/certd/commit/eb5c88fbb2901f1a9669429a7cd8dc76f6806d01))

## [1.37.7](https://github.com/certd/certd/compare/v1.37.6...v1.37.7) (2025-11-12)

### Bug Fixes

* 修复点击立即触发运行报错的bug ([e1eef01](https://github.com/certd/certd/commit/e1eef013a856d26fe80a05d9ec6e505e2e31e5f9))
* 账号绑定页面某些情况下打不开的bug ([44973eb](https://github.com/certd/certd/commit/44973ebd00e89c0fee8f3b91174157757ce0160f))

## [1.37.6](https://github.com/certd/certd/compare/v1.37.5...v1.37.6) (2025-11-10)

### Bug Fixes

* 修复创建流水线报id不能为空的bug ([aac569a](https://github.com/certd/certd/commit/aac569a9259ede43399e0ed5d668e936b984d6dd))

### Performance Improvements

* 增加vip时间同步按钮 ([32e4e91](https://github.com/certd/certd/commit/32e4e91ab81008dda422fb53fd6f4d1711c5d80c))

## [1.37.5](https://github.com/certd/certd/compare/v1.37.4...v1.37.5) (2025-11-08)

### Bug Fixes

* 修复某些情况下编辑流水线，没有立即展示变更效果的bug ([65e5309](https://github.com/certd/certd/commit/65e53092e8d677eb34b7d04d68c6f738165f5de2))
* 修复批量修改定时没有立即显示生效的bug ([c166602](https://github.com/certd/certd/commit/c16660254b8d637bd3ca100695934b343875fcbf))
* 修复在苹果手机下输入框被放大的问题 ([5ff7e6e](https://github.com/certd/certd/commit/5ff7e6ef0eaa6bc111d0dd3c5713e1658f9113ad))

### Performance Improvements

*  支持记忆字段排序 ([d46b9c5](https://github.com/certd/certd/commit/d46b9c54b14ec5c892f4eed141fb549485941edd))
* 优化任务参数配置界面在手机版下的展示效果 ([0203aa2](https://github.com/certd/certd/commit/0203aa2b6e86e58e5e66a1b9d0278d186aa92554))
* 支持列表展示时固定证书最大天数，有助于列表进度条整齐展示 ([4a94eab](https://github.com/certd/certd/commit/4a94eab3935c89a63892661d9cf0d0891e54aa81))
* 子域名托管说明 ([b5d8161](https://github.com/certd/certd/commit/b5d8161bc2e686e6c8b552de0c29117a5d405313))

## [1.37.4](https://github.com/certd/certd/compare/v1.37.3...v1.37.4) (2025-10-28)

### Bug Fixes

* 修复站点证书监控复制按钮无效的bug ([efa26a0](https://github.com/certd/certd/commit/efa26a067f06402f30befc016d9934cadcd5a563))

## [1.37.3](https://github.com/certd/certd/compare/v1.37.2...v1.37.3) (2025-10-24)

### Performance Improvements

*  注册页面增加手机注册tab页签 ([6b2f1fc](https://github.com/certd/certd/commit/6b2f1fcd3e058061b814c3331cda8ce1b2d80d73))
* 流水线创建时支持添加到证书监控 ([59ba408](https://github.com/certd/certd/commit/59ba4080706548828ef1c0a9cd893c1c9a7d591f))
* 流水线支持有效期设置 ([911e69e](https://github.com/certd/certd/commit/911e69e3bc0cdd48b62953b5d0981d640fc1f8ac))
* 站点证书监控增加导出和分组功能 ([2ed12c4](https://github.com/certd/certd/commit/2ed12c429eb58274a4f9dd0ed3b66e160d283ded))
* 证书监控增加批量删除 ([e578c52](https://github.com/certd/certd/commit/e578c52fdf2f838038062aa4209b655fbae461fb))

## [1.37.2](https://github.com/certd/certd/compare/v1.37.1...v1.37.2) (2025-10-14)

### Performance Improvements

* 证书监控支持设置证书即将过期天数 ([cd35568](https://github.com/certd/certd/commit/cd35568e042e6ab928685efad51cdbed823d2d4f))
* 支持网络测试 ([2bef608](https://github.com/certd/certd/commit/2bef608e07ceb56d52007f290667e0afef401b22))

## [1.37.1](https://github.com/certd/certd/compare/v1.37.0...v1.37.1) (2025-09-29)

### Bug Fixes

* 修复版本比较bug ([109696e](https://github.com/certd/certd/commit/109696e965d68c50c8627ffd40203edd1d2daea5))

# [1.37.0](https://github.com/certd/certd/compare/v1.36.25...v1.37.0) (2025-09-28)

**Note:** Version bump only for package @certd/ui-client

## [1.36.25](https://github.com/certd/certd/compare/v1.36.24...v1.36.25) (2025-09-27)

**Note:** Version bump only for package @certd/ui-client

## [1.36.24](https://github.com/certd/certd/compare/v1.36.23...v1.36.24) (2025-09-27)

**Note:** Version bump only for package @certd/ui-client

## [1.36.23](https://github.com/certd/certd/compare/v1.36.22...v1.36.23) (2025-09-26)

### Bug Fixes

* 授权页面，id列位置不在第一列的bug ([3f1722d](https://github.com/certd/certd/commit/3f1722d54debcb4849dc14521a2da0d9b304b69f))

### Performance Improvements

* 动态加载验证码script ([dcc396a](https://github.com/certd/certd/commit/dcc396afb7a23aeb8af57c01014b09af5f033e61))
* 验证码支持测试，登录验证码需要测试通过后才能开启 ([83e6476](https://github.com/certd/certd/commit/83e6476408090b741fabb1b542fb458d9a8b4134))

## [1.36.22](https://github.com/certd/certd/compare/v1.36.21...v1.36.22) (2025-09-23)

### Bug Fixes

* 选择授权对话框编辑时，名称字段排在最后的bug ([31cfb09](https://github.com/certd/certd/commit/31cfb09468bda3272f5f63af65ff3e9272220b39))

### Performance Improvements

* 登录失败时清除验证码状态 ([1c15bea](https://github.com/certd/certd/commit/1c15beadc7fe8a7c6ec1903b7e722ca2f52e05b3))

## [1.36.21](https://github.com/certd/certd/compare/v1.36.20...v1.36.21) (2025-09-15)

### Bug Fixes

* 修复导入插件对话框无法打开的bug，修复插件编辑页面打开多个代码编辑器消失的bug ([e5a080a](https://github.com/certd/certd/commit/e5a080aebe0d2f3e3c0f86bf863f75069c1bf7ab))

## [1.36.20](https://github.com/certd/certd/compare/v1.36.19...v1.36.20) (2025-09-13)

### Bug Fixes

* 修复商业版退出登录后，丢失站点个性化设置的bug ([d75dd05](https://github.com/certd/certd/commit/d75dd058d65c85f80c49e1fa7a910e6c6f08e824))
* 修复授权类型和名称字段排到最后的bug ([43b7977](https://github.com/certd/certd/commit/43b79778ea9034065f6a15af3296274315597c6b))

### Performance Improvements

* 登录支持极验验证码 ([370db62](https://github.com/certd/certd/commit/370db62bf0aece241859244927beabba32d6a257))
* 登录注册、找回密码都支持极验验证码和图片验证码 ([7bdde68](https://github.com/certd/certd/commit/7bdde68ecea29fe2c570fd3cb082139db6c93d93))
* 优化加量包展示效果 ([3c65f37](https://github.com/certd/certd/commit/3c65f37d84177ba107d4a6462648af12d2fc4b7a))
* 证书到期剩余天数进度条根据实际证书有效期计算 ([#528](https://github.com/certd/certd/issues/528)) nicheng-he ([2d4586b](https://github.com/certd/certd/commit/2d4586b1c42c39f97d2a95b9453cca4bc8bfbe61))

## [1.36.19](https://github.com/certd/certd/compare/v1.36.18...v1.36.19) (2025-09-05)

### Bug Fixes

* 修复批量流水线执行时日志显示错乱的问题 ([4372adc](https://github.com/certd/certd/commit/4372adc703b9a4c785664054ab2a533626d815a8))
* 修复远程数据选择无法过滤的bug ([6cbb073](https://github.com/certd/certd/commit/6cbb0739f8428d51b0712f718fe4d236cc087cf9))
* 修复mysql下购买套餐加量包无效的bug ([c26ad4c](https://github.com/certd/certd/commit/c26ad4c8075f0606d45b8da13915737968d6191a))

### Performance Improvements

* 创建证书时支持选择通知时机 ([0e96bfd](https://github.com/certd/certd/commit/0e96bfdfa377824d204e72923d1176408ae6b300))
* 商业版隐藏文档相关链接 ([4443a1c](https://github.com/certd/certd/commit/4443a1c0308fa6b95a05efd73d15d24b65d641c9))
* 商业版隐藏文档相关链接 ([db89561](https://github.com/certd/certd/commit/db8956148083bc4f988226ccf719940d08158a27))
* 支持根据id更新证书（证书Id不变接口），不过该接口为白名单功能，普通腾讯云账户无法使用 ([fe9c4f3](https://github.com/certd/certd/commit/fe9c4f3391ff07c01dd9a252225f69a129c39050))
* 子域名托管说明 ([39a0223](https://github.com/certd/certd/commit/39a02235cf4416bb5bd1acd3831241efeaa2f602))

## [1.36.18](https://github.com/certd/certd/compare/v1.36.17...v1.36.18) (2025-08-28)

### Bug Fixes

* 修复cron选择组件星期显示错误的bug ([eb75e52](https://github.com/certd/certd/commit/eb75e52278f94a72643f7317e6740fb42666c68a))

### Performance Improvements

* 短信验证码支持腾讯云 ([9108459](https://github.com/certd/certd/commit/9108459ae42bcd95a59acba164a64e82e5f2cfe6))
* 商业版支持自定义插件的参数配置 ([17f23f3](https://github.com/certd/certd/commit/17f23f37516af925d5049291d67d41e4271f81f8))
* 支持p7b证书格式 ([d9f4a57](https://github.com/certd/certd/commit/d9f4a5793d68a017a5d80ad5385cbda603c4e165))
* openapi返回证书时挑选匹配范围最小的那一个；增加format参数，增加返回值p7b格式，增加detail返回 ([2085bcc](https://github.com/certd/certd/commit/2085bcceb61c3723c9bdfec4c4cc0917631ff5e5))

## [1.36.17](https://github.com/certd/certd/compare/v1.36.16...v1.36.17) (2025-08-17)

**Note:** Version bump only for package @certd/ui-client

## [1.36.16](https://github.com/certd/certd/compare/v1.36.15...v1.36.16) (2025-08-16)

### Bug Fixes

* 修复授权配置复制功能，无法复制已加密字段的问题 ([221e068](https://github.com/certd/certd/commit/221e068bac3af6cd5d1794f8cd4c2ec5c0bc3f45))

### Performance Improvements

* 增加找回密码的验证码可重试次数 [@nicheng-he](https://github.com/nicheng-he)  ([#496](https://github.com/certd/certd/issues/496)) ([fe03f99](https://github.com/certd/certd/commit/fe03f9942b5662fb90cad86da10782f5dc3603f5))
* 支持阿里云API网关 ([9e1e4ee](https://github.com/certd/certd/commit/9e1e4eeec2859759ca5b07834c9d24cf88a6ad33))
* 支持部署到金山云CDN ([dfa74a6](https://github.com/certd/certd/commit/dfa74a69f7cbb9009d3e20c7eecfa1b905a00cf0))

## [1.36.15](https://github.com/certd/certd/compare/v1.36.14...v1.36.15) (2025-08-07)

### Performance Improvements

* 部署到阿里云支持选择bucket和域名 ([013b9c4](https://github.com/certd/certd/commit/013b9c4c7c2adf485d086123ccea448719577fd4))
* 支持webhook部署证书 ([cbe0b1c](https://github.com/certd/certd/commit/cbe0b1c5a6538f232e9a63f1693d20d5acf0a306))
* 注册时支持填写用户名 ([fdcfcc7](https://github.com/certd/certd/commit/fdcfcc77a0db87954e0b026635d3ccdd9bc6cee8))

## [1.36.14](https://github.com/certd/certd/compare/v1.36.13...v1.36.14) (2025-07-28)

### Bug Fixes

* 修复复制流水线为空的bug ([b070773](https://github.com/certd/certd/commit/b0707739fdfbae3d78db4efd3f180db05c4e4164))

### Performance Improvements

* 授权管理支持模糊查询 ([866eb62](https://github.com/certd/certd/commit/866eb6241baa7b21f6eddc649966324c188236c6))
* 新增找回密码功能 [@nicheng-he](https://github.com/nicheng-he) ([81ac240](https://github.com/certd/certd/commit/81ac240ac84db0af2f56b6352e227ecb49f38377))

## [1.36.13](https://github.com/certd/certd/compare/v1.36.12...v1.36.13) (2025-07-23)

### Performance Improvements

* 阿里云部分插件优化  [@nicheng-he](https://github.com/nicheng-he) ([e3738f6](https://github.com/certd/certd/commit/e3738f6422270d75ec414c15a343248cc4cad6e1))

## [1.36.12](https://github.com/certd/certd/compare/v1.36.11...v1.36.12) (2025-07-22)

### Bug Fixes

* 上传到阿里云cas，证书前缀无效的bug ([b382351](https://github.com/certd/certd/commit/b382351c7b91ec10e1f61d94bec5aad075207ec8))

### Performance Improvements

* 首页增加更新日志按钮 ([41ce848](https://github.com/certd/certd/commit/41ce8489dc2f03a705dfa3fbb357769defb56c60))
* 增加版本过低提示 ([d1ce360](https://github.com/certd/certd/commit/d1ce36038cab72b5dc1b320d0a708c261ffbdacb))

## [1.36.11](https://github.com/certd/certd/compare/v1.36.10...v1.36.11) (2025-07-22)

**Note:** Version bump only for package @certd/ui-client

## [1.36.10](https://github.com/certd/certd/compare/v1.36.9...v1.36.10) (2025-07-18)

### Performance Improvements

* 优化子域名托管的说明 ([b15f514](https://github.com/certd/certd/commit/b15f514018b728acb0922ee3f93c1f302eb5d471))
* 账号即将过期通知 ([e403450](https://github.com/certd/certd/commit/e40345095f31e2fb8e2333a6647466659133fa0c))
* 子域名托管重复域名不允许添加 ([ffc0c7b](https://github.com/certd/certd/commit/ffc0c7bb7b16d9904fd2d905d1c4e1d4854e92a9))

## [1.36.9](https://github.com/certd/certd/compare/v1.36.7...v1.36.9) (2025-07-15)

**Note:** Version bump only for package @certd/ui-client

## [1.36.7](https://github.com/certd/certd/compare/v1.36.6...v1.36.7) (2025-07-15)

### Bug Fixes

* 修复流水线页面状态没有刷新的bug ([93e9498](https://github.com/certd/certd/commit/93e9498b410353f504e11e264db62468895d7290))

## [1.36.6](https://github.com/certd/certd/compare/v1.36.5...v1.36.6) (2025-07-14)

### Bug Fixes

* 修复某些页面翻译不全显示错误的bug ([0b3158f](https://github.com/certd/certd/commit/0b3158fdd5fe5bb0a98c4e65715dbc3de2c38047))
* 修复运行流水线后会闪烁一下的bug ([dfc9362](https://github.com/certd/certd/commit/dfc9362084082ee535b898f23b2609c1d946a6fd))

### Performance Improvements

* 通知和定时器的删除按钮显示为红色更显眼 ([61ba83c](https://github.com/certd/certd/commit/61ba83c77546c3d505d081e19a3d68c127662bf1))
* 优化流水线列表页面、详情页面性能，精简返回数据 ([609ac9c](https://github.com/certd/certd/commit/609ac9c9a2dde605eb09834ae59693c1cb238765))
* OpenAPI支持autoApply参数 ([42f4d14](https://github.com/certd/certd/commit/42f4d1477dc791520a874aed56035abcbc8c433b))

## [1.36.5](https://github.com/certd/certd/compare/v1.36.4...v1.36.5) (2025-07-11)

**Note:** Version bump only for package @certd/ui-client

## [1.36.4](https://github.com/certd/certd/compare/v1.36.3...v1.36.4) (2025-07-10)

### Bug Fixes

* 修复查看证书对话框翻译错误的bug ([8626b6d](https://github.com/certd/certd/commit/8626b6d9f235c511766f2ae98e0a37f6cebb621c))
* 修复translation后分组编辑打不开的bug ([46a1b74](https://github.com/certd/certd/commit/46a1b7479923d2feb2dece202a5932b99981b2cd))

### Performance Improvements

* 优化证书进度条颜色 ([2af91db](https://github.com/certd/certd/commit/2af91dbf2ae36a4ed17c6788bc2a2a79a3bb29f8))
* output-selector from参数支持更丰富的过滤规则 ([87853a2](https://github.com/certd/certd/commit/87853a201535f3bfe8505c40f8f5229d82ffcc73))

## [1.36.3](https://github.com/certd/certd/compare/v1.36.2...v1.36.3) (2025-07-07)

### Bug Fixes

* 修复开放接口添加按钮文本显示问题 ([f93ba99](https://github.com/certd/certd/commit/f93ba9970c12680f38eba2a7abd4b72cf3f5b6a6))

## [1.36.2](https://github.com/certd/certd/compare/v1.36.1...v1.36.2) (2025-07-06)

### Bug Fixes

* 修复notification编辑按钮无法打开对话框的bug ([0cea26c](https://github.com/certd/certd/commit/0cea26c6287f52adf273b4a525c37bea8555c68c))

### Performance Improvements

* 证书检查支持自定义dns服务器 ([c53bb7c](https://github.com/certd/certd/commit/c53bb7cf677faa32729709ae0c10359db5194d7a))

## [1.36.1](https://github.com/certd/certd/compare/v1.36.0...v1.36.1) (2025-07-02)

### Bug Fixes

* 修复通知和触发器无法编辑的bug ([a2e0951](https://github.com/certd/certd/commit/a2e09510426680eb425c0d7ad337f39d3f052054))

# [1.36.0](https://github.com/certd/certd/compare/v1.35.5...v1.36.0) (2025-07-01)

### Features

* 支持模版创建流水线 ([2559f0e](https://github.com/certd/certd/commit/2559f0e822db095d1d26a7f1d517622dce22a5c2))

### Performance Improvements

* 阿里云waf cname站点选择支持翻页及域名查询 ([4cf9858](https://github.com/certd/certd/commit/4cf98584dacc5999752732f136246647a2f1f07d))
* 模版导入流水线 ([dcc8c56](https://github.com/certd/certd/commit/dcc8c569693432579709ce63656665a76bcf9a44))
* 添加用户资料编辑功能 ([7c0f43c](https://github.com/certd/certd/commit/7c0f43c8a3052f73afee3e93c9fcbc43c44ab690))
* 优化阿里云waf的日志信息 ([821c6d8](https://github.com/certd/certd/commit/821c6d807d4b3cc5092d09a6282b8cbafb9e7c9f))
* 优化中英文翻译与切换 ([acaa8b1](https://github.com/certd/certd/commit/acaa8b173183b4423584ee070e6e332e0ac0eb2d))
* 站点IP监控前先同步一下IP ([a080b60](https://github.com/certd/certd/commit/a080b606ab6e289d96b17ef7d2879b4603f889ba))
* 支持选择运行策略设置 ([60f055f](https://github.com/certd/certd/commit/60f055f293ce237c21cd9050333dad9609eceac1))

## [1.35.5](https://github.com/certd/certd/compare/v1.35.4...v1.35.5) (2025-06-20)

### Bug Fixes

* 修复邮箱包含.号校验失败的bug ([65dcae7](https://github.com/certd/certd/commit/65dcae79f8faa7a6cb425e10a0fdb6758b0719f3))

### Performance Improvements

* 首次打开任务日志查看页面，自动滚动到底部 ([43fee42](https://github.com/certd/certd/commit/43fee42198e8697185b427b1fa3eb79409603393))
* 支持批量修改通知和定时 ([e11b3be](https://github.com/certd/certd/commit/e11b3becfd4abe6547e84d09adc38ebd6e1c4b87))

## [1.35.4](https://github.com/certd/certd/compare/v1.35.3...v1.35.4) (2025-06-13)

**Note:** Version bump only for package @certd/ui-client

## [1.35.3](https://github.com/certd/certd/compare/v1.35.2...v1.35.3) (2025-06-12)

### Bug Fixes

* 修复重试次数设置无效的bug ([e2099ac](https://github.com/certd/certd/commit/e2099ac9ca344bc70bfa4219002e9138708973ae))

### Performance Improvements

* 授权列表类型颜色优化 ([1e86338](https://github.com/certd/certd/commit/1e863382d3d1a8cc95a1abf51e75bf6eaea3244f))
* 支持雨云dns解析以及雨云证书更新 ([43c7a19](https://github.com/certd/certd/commit/43c7a1984926f5d4647760cc134bb0aede3a7b7a))

## [1.35.2](https://github.com/certd/certd/compare/v1.35.1...v1.35.2) (2025-06-09)

### Performance Improvements

* 子域名托管帮助链接优化为打开新窗口 ([7c0cdd1](https://github.com/certd/certd/commit/7c0cdd169e2f943e703e433677f2f437d4aa02ee))
* history增加触发类型显示 ([7f6070c](https://github.com/certd/certd/commit/7f6070c960ed7bf02add5ab36436de6573f2f1fa))

## [1.35.1](https://github.com/certd/certd/compare/v1.35.0...v1.35.1) (2025-06-07)

### Performance Improvements

* 优化流水线页面，增加下次执行时间、查看证书显示 ([c820315](https://github.com/certd/certd/commit/c8203154094fae3d17198747f49f5f41ddf29a4e))
* 站点证书监控支持定时设置，重试次数设置 ([d3c2f8e](https://github.com/certd/certd/commit/d3c2f8eb436e670772d14a54acd6b541c5aa3978))

# [1.35.0](https://github.com/certd/certd/compare/v1.34.11...v1.35.0) (2025-06-05)

**Note:** Version bump only for package @certd/ui-client

## [1.34.11](https://github.com/certd/certd/compare/v1.34.10...v1.34.11) (2025-06-05)

### Bug Fixes

* 修复中文域名使用cname方式校验无法通过的问题 ([f7d5baa](https://github.com/certd/certd/commit/f7d5baa6d04cb83c572b06e62f885890cfa0143a))
* 修复flexcdn部署证书的顶级CA名称显示 ([6467edb](https://github.com/certd/certd/commit/6467edb84324d7c80a85212675dbacedc459df83))

### Performance Improvements

* 分组选择支持清空选项 ([03e2e99](https://github.com/certd/certd/commit/03e2e9949837b34eb3ea56d14a9e8a5dabc96063))
* 优化cname检查，当有冲突的cname记录时，给出提示 ([e639a8f](https://github.com/certd/certd/commit/e639a8f9f12640ffcca69f1a6a0324459924afbd))
* 增加下载日志按钮 ([6ff509d](https://github.com/certd/certd/commit/6ff509d263c0182645b4692c10b5fedb192db964))
* 站点监控支持批量导入域名和ip ([2d7729d](https://github.com/certd/certd/commit/2d7729dbe98f29088f5f317db2b52cc1ede223a6))
* 支持设置用户有效期 ([6ac3bc5](https://github.com/certd/certd/commit/6ac3bc564f407dad2cd0b0b0744e887387aa5da3))

## [1.34.10](https://github.com/certd/certd/compare/v1.34.9...v1.34.10) (2025-06-03)

### Performance Improvements

* 优化流水线名称过长时的显示 ([6a0cc1b](https://github.com/certd/certd/commit/6a0cc1b1f3ad508f9e4093b3b682b163f12389eb))

## [1.34.9](https://github.com/certd/certd/compare/v1.34.8...v1.34.9) (2025-05-30)

### Performance Improvements

* 邮箱支持保存和选择 ([f7b0b44](https://github.com/certd/certd/commit/f7b0b44ef6044bec36510a6f0b06d8dca5bfce49))
* 支持github 新版本检查并发布通知 ([356703c](https://github.com/certd/certd/commit/356703c83ea18c6efb8931402e181280d7b7e696))

## [1.34.8](https://github.com/certd/certd/compare/v1.34.7...v1.34.8) (2025-05-28)

### Bug Fixes

* 修复证书申请任务无法修改dns提供商类型的bug ([8802274](https://github.com/certd/certd/commit/88022747bebe2054223e0241d68d410771405e68))

### Performance Improvements

* 优化站点选择组件，切换选择时不刷新列表 ([3a14714](https://github.com/certd/certd/commit/3a147141b1a5d67c92a5ce88a5313eaa62859e03))
* 优化站点ip检查 ([a463711](https://github.com/certd/certd/commit/a463711b03a20120f2a298be15d71ca152d27f21))
* 站点监控支持监控IP ([9cc4c01](https://github.com/certd/certd/commit/9cc4c017ae646a18284e732769b82636feda01d3))
* 支持批量重新运行 ([8189982](https://github.com/certd/certd/commit/818998259ddc75e722196ac5c365038818539b9b))

## [1.34.7](https://github.com/certd/certd/compare/v1.34.6...v1.34.7) (2025-05-26)

**Note:** Version bump only for package @certd/ui-client

## [1.34.6](https://github.com/certd/certd/compare/v1.34.5...v1.34.6) (2025-05-25)

### Bug Fixes

* 修复又拍云 CDN 设置证书参数和强制 HTTPS 配置报错的bug ([7984b62](https://github.com/certd/certd/commit/7984b625ba6727132f205db8e25f790bce27b2f7))
* **cert:** 修正证书过期时间计算逻辑 ([a3086e6](https://github.com/certd/certd/commit/a3086e6a5bec8b07f5e1d21a2ca8bd969c75bd5c))

### Performance Improvements

* 二次认证页面中，添加动态验证码输入框的焦点控制，提升用户体验 ([bb22f06](https://github.com/certd/certd/commit/bb22f062ed4ab4b5b71938270fe4cc666af6b8e7))
* 站点证书监控增加通知设置 ([3422a1a](https://github.com/certd/certd/commit/3422a1a59fd0d2c0f17fa9c7e8988ac527ecfdd9))

## [1.34.5](https://github.com/certd/certd/compare/v1.34.4...v1.34.5) (2025-05-19)

### Performance Improvements

* aaWaf、cdnfly站点选择支持查询 ([8af3463](https://github.com/certd/certd/commit/8af3463668a40b9b99febb02e3b4e0d9d8d719b4))

## [1.34.4](https://github.com/certd/certd/compare/v1.34.3...v1.34.4) (2025-05-16)

### Bug Fixes

* 修复插件导入的bug ([677fec0](https://github.com/certd/certd/commit/677fec0a0b6fceb4966705e471bbfeeda91610c7))
* 修复自建插件保存丢失部署策略的bug ([863e74d](https://github.com/certd/certd/commit/863e74dd2e3912f950ff5025b5ed0070aeb37035))

### Performance Improvements

* 调整小助手，仅在登录之后显示 ([aebb07c](https://github.com/certd/certd/commit/aebb07c5cc8b1f233b9d203ff017ac60e6971a85))

## [1.34.3](https://github.com/certd/certd/compare/v1.34.2...v1.34.3) (2025-05-15)

### Performance Improvements

* 小助手可以关闭 ([3e2101a](https://github.com/certd/certd/commit/3e2101aa5b56548614102e900d59819ce8c7e97c))
* 支持AI分析报错 ([aa96859](https://github.com/certd/certd/commit/aa96859798166426e485947a6590464de189de05))

## [1.34.2](https://github.com/certd/certd/compare/v1.34.1...v1.34.2) (2025-05-11)

### Bug Fixes

* 修复刷新流水线页面后，日志不自动更新的bug ([0b2e28b](https://github.com/certd/certd/commit/0b2e28b62dd5eb6804c602083e65c87a9d1d72d2))

### Performance Improvements

* 集成智能问答机器人 ([9dd4905](https://github.com/certd/certd/commit/9dd49054d18ec436a5029444ca55a38adc682933))
* 支持设置网安备案号 ([d18e431](https://github.com/certd/certd/commit/d18e431e2f08e6b37704032c4ea6fbdd8e971442))

## [1.34.1](https://github.com/certd/certd/compare/v1.34.0...v1.34.1) (2025-05-05)

### Bug Fixes

* 根据SOA记录判断子域名托管有缺陷，改回手动配置子域名托管记录的方式 ([1b280a2](https://github.com/certd/certd/commit/1b280a2940f9e2d919b0bf23b89cc185be1fa498))
* 修复宝塔授权测试按钮显示错误的bug ([048696e](https://github.com/certd/certd/commit/048696ee9386491bb68592fb3a47d1c900bb68bf))

### Performance Improvements

* 支持部署证书到火山dcdn ([5f85219](https://github.com/certd/certd/commit/5f852194953dc1b4e6336770f417507b8f5a33ad))

# [1.34.0](https://github.com/certd/certd/compare/v1.33.8...v1.34.0) (2025-04-28)

### Bug Fixes

* 修复二次认证登录进入错误账号的bug ([e3930e0](https://github.com/certd/certd/commit/e3930e07172dd7903cb0f6ff26e0e3e828ba3e77))

## [1.33.8](https://github.com/certd/certd/compare/v1.33.7...v1.33.8) (2025-04-26)

### Bug Fixes

* 服务器时间获取不准确的bug ([5d10cbf](https://github.com/certd/certd/commit/5d10cbf18daf94a90a7551641a3b13e3c5fec611))
* 修复复制流水线无效的bug ([3df20a9](https://github.com/certd/certd/commit/3df20a924f32970b052e2588ea20de095f0ea693))
* 修复token过期后，疯狂打印token过期信息的bug ([50a5fa1](https://github.com/certd/certd/commit/50a5fa15bb240a125bbc91d2ce1ff3c835888a77))

### Performance Improvements

* 数据库备份支持oss ([308d460](https://github.com/certd/certd/commit/308d4600efe2002f199c33b4594d3071784e58ea))
* 支持反向代理增加contextPath路径 ([0088929](https://github.com/certd/certd/commit/0088929622160cc922995de9a563e8061686ff34))

## [1.33.7](https://github.com/certd/certd/compare/v1.33.6...v1.33.7) (2025-04-22)

### Performance Improvements

* 优化首页插件列表展示 ([9b8f60b](https://github.com/certd/certd/commit/9b8f60b64b5f9a3db7dfa9b3dcbd9201984358d0))

## [1.33.6](https://github.com/certd/certd/compare/v1.33.5...v1.33.6) (2025-04-20)

### Bug Fixes

* 上传商用证书，直接粘贴文本报错的问题；修复无法上传ec加密证书的bug ([5750bb7](https://github.com/certd/certd/commit/5750bb706779da274d8e7a87e71416cb64d2df79))
* 修复下载证书时提示token已过期的问题 ([0e07ae6](https://github.com/certd/certd/commit/0e07ae6ce84dcb9279d3c44060d621566afa593c))

### Performance Improvements

* 更新license时同时绑定url ([78367af](https://github.com/certd/certd/commit/78367af8307f801e778c76d49f0918c21ffe032f))
* 切换到不同的分组后再打开创建对话框，会自动选择分组 ([893dcd4](https://github.com/certd/certd/commit/893dcd4f2487891199ed3e5a3d47a79a75efc942))
* 优化/api缓存为0 ([dc05cd4](https://github.com/certd/certd/commit/dc05cd481f186b13375192be965000e6b4b429a5))
* 优化证书流水线创建，支持选择分组 ([d613aa8](https://github.com/certd/certd/commit/d613aa8f3e85d8dc475ef1b62d49394ce7fd7d24))

## [1.33.5](https://github.com/certd/certd/compare/v1.33.4...v1.33.5) (2025-04-17)

### Performance Improvements

* 登录支持双重认证 ([48aef25](https://github.com/certd/certd/commit/48aef25b3f6499d674ca4e4ef16f4c62399fb735))
* 多重认证登录 ([0f82cf4](https://github.com/certd/certd/commit/0f82cf409bc60706ab07e4ca4f272b9a1ca7eecb))

## [1.33.4](https://github.com/certd/certd/compare/v1.33.3...v1.33.4) (2025-04-15)

### Performance Improvements

* 插件支持导入导出 ([cf8abb4](https://github.com/certd/certd/commit/cf8abb45282070c8ba91469f93fd379fabf1f74a))

## [1.33.3](https://github.com/certd/certd/compare/v1.33.2...v1.33.3) (2025-04-14)

**Note:** Version bump only for package @certd/ui-client

## [1.33.2](https://github.com/certd/certd/compare/v1.33.1...v1.33.2) (2025-04-12)

### Performance Improvements

* 修复内置插件分页查询逻辑 ([a2710dd](https://github.com/certd/certd/commit/a2710ddc2525e4e637fd157f0180e6d3b801c8be))

## [1.33.1](https://github.com/certd/certd/compare/v1.33.0...v1.33.1) (2025-04-12)

### Performance Improvements

* 镜像支持armv7 ([f78cbed](https://github.com/certd/certd/commit/f78cbed4d817859721fdafe7d348864848d0dfbf))

# [1.33.0](https://github.com/certd/certd/compare/v1.32.0...v1.33.0) (2025-04-11)

### Performance Improvements

* 修复tab页缓存问题 ([64e5449](https://github.com/certd/certd/commit/64e5449ab3c6b219b0e89eddad14bfb6b71a0650))
* 隐藏运行策略选项 ([2951df0](https://github.com/certd/certd/commit/2951df0cd94c23e2efee84ff1b843055aac56cae))
* 增加手动上传证书功能说明 ([5d083a1](https://github.com/certd/certd/commit/5d083a153637caddbc6f44e915d9fb2d1ae87b33))

# [1.32.0](https://github.com/certd/certd/compare/v1.31.11...v1.32.0) (2025-04-04)

### Performance Improvements

* 优化华为dns解析记录创建和删除问题 ([0948c5b](https://github.com/certd/certd/commit/0948c5bc691d2ee6eb47c72a85da1b7453361878))

## [1.31.11](https://github.com/certd/certd/compare/v1.31.10...v1.31.11) (2025-04-02)

**Note:** Version bump only for package @certd/ui-client

## [1.31.10](https://github.com/certd/certd/compare/v1.31.9...v1.31.10) (2025-03-29)

### Performance Improvements

*  tab增加图标显示 ([a03ae5a](https://github.com/certd/certd/commit/a03ae5a216a1df2c1d3da12ae18dcd0f089a92d3))

## [1.31.9](https://github.com/certd/certd/compare/v1.31.8...v1.31.9) (2025-03-28)

### Bug Fixes

* 修复网站证书监控https port设置无效的bug ([cc8da0c](https://github.com/certd/certd/commit/cc8da0cf130f0c469371b59ac5bd04567f4a4414))

### Performance Improvements

* dns支持火山引擎 ([99ff879](https://github.com/certd/certd/commit/99ff879d93658c29ea493a4bde7e9e3f85996d64))

## [1.31.8](https://github.com/certd/certd/compare/v1.31.7...v1.31.8) (2025-03-26)

### Bug Fixes

* 修复网站监控无法设置端口的bug ([27a8a57](https://github.com/certd/certd/commit/27a8a57cf52b4bf83d628aa3049be1efaa74f29c))
* 修复lego模式无法创建流水线的bug ([687bb8a](https://github.com/certd/certd/commit/687bb8a2376d0de7b72739a174e4a9560581f866))

### Performance Improvements

* 优化通知格式 ([c3c5006](https://github.com/certd/certd/commit/c3c5006daa39c20624cb58864f2b92b230a38a7a))
* 支持又拍云cdn ([fd0536b](https://github.com/certd/certd/commit/fd0536bd4b41f15b6b5d42e0b447f0dcbf73b8a8))

## [1.31.7](https://github.com/certd/certd/compare/v1.31.6...v1.31.7) (2025-03-24)

### Performance Improvements

* 增加服务器时间警告 ([d66ade4](https://github.com/certd/certd/commit/d66ade4e4783850b6c7625c6f164a5a0fc0aa509))
* 支持部署到lucky ([e18e399](https://github.com/certd/certd/commit/e18e399ce6529e8c7e36b56c5f674cfdbbd3d3d1))

## [1.31.6](https://github.com/certd/certd/compare/v1.31.5...v1.31.6) (2025-03-24)

### Performance Improvements

* 优化图标 ([c56f48c](https://github.com/certd/certd/commit/c56f48c1e3c54c4e203fafb380d9091d75681b7e))

## [1.31.5](https://github.com/certd/certd/compare/v1.31.4...v1.31.5) (2025-03-22)

### Bug Fixes

* 修复通知选择器无法选择的bug ([f7b88f9](https://github.com/certd/certd/commit/f7b88f9e3b7d9d9122e4fd2003a20c555bd50c7d))
* 修复证书流水线创建失败的bug ([736fe03](https://github.com/certd/certd/commit/736fe038ebda56648bcc4c12884a700341d2c049))

## [1.31.4](https://github.com/certd/certd/compare/v1.31.3...v1.31.4) (2025-03-21)

### Bug Fixes

* 修复站点监控通知通过webhook发送失败的bug ([9be1ecc](https://github.com/certd/certd/commit/9be1ecc8aab3ea23dd0dc2dab3688f4edb90ef2c))

### Performance Improvements

* 宝塔支持doker站点证书部署 ([589a373](https://github.com/certd/certd/commit/589a373142ef7f50d64d3aa767a90b1f4b64da93))
* 保存调整后的列宽 ([873f2b6](https://github.com/certd/certd/commit/873f2b618b9d7320045baf69d6da83afe48a780f))
* 创建证书流水线时，支持更多参数展开 ([36aa7f8](https://github.com/certd/certd/commit/36aa7f82b078a053a102331b3c6f132fb9d492f9))
* 流水线页面可以鼠标按住左右拖动 ([d85a02f](https://github.com/certd/certd/commit/d85a02feeb3183c5abd6c1ea790d5923a32d7271))
* 流水线增加上传证书快捷方式 ([425bba6](https://github.com/certd/certd/commit/425bba67c539b734e2a85a83a4f9ecc9b2434fb4))
* 手动上传证书部署流水线 ([fbb66f3](https://github.com/certd/certd/commit/fbb66f3c4389489aa8a43b194d82bc8cf391607b))
* 优化选择任务时手机版展示效果 ([d01004d](https://github.com/certd/certd/commit/d01004d53071a75ac91ee21cc96bde9369f77ff3))
* 站点证书监控支持模糊查询 ([0069c0e](https://github.com/certd/certd/commit/0069c0e3992946a8dd6410f299d4fc974ef0e76b))
* 支持飞书通知 ([b82e1dc](https://github.com/certd/certd/commit/b82e1dcd6217b09a7d7e21cd648bb31de320cadf))
* 支持手动上传证书并部署 ([a9fffa5](https://github.com/certd/certd/commit/a9fffa5180c83da27b35886aa2e858a92a2c5f94))

## [1.31.3](https://github.com/certd/certd/compare/v1.31.2...v1.31.3) (2025-03-13)

### Performance Improvements

* 套餐支持3天7天等选项 ([0d71a8e](https://github.com/certd/certd/commit/0d71a8ee501a0e5bb69decf07e8729026e9d85bf))
* 证书仓库增加有效期显示 ([be87124](https://github.com/certd/certd/commit/be87124ada7a093f281ca29a45c86b4ea4644ead))
* 支持部署到天翼云CDN ([82a72e0](https://github.com/certd/certd/commit/82a72e0b497efa043d342ad0e33c083a2de79a05))

## [1.31.2](https://github.com/certd/certd/compare/v1.31.1...v1.31.2) (2025-03-12)

**Note:** Version bump only for package @certd/ui-client

## [1.31.1](https://github.com/certd/certd/compare/v1.31.0...v1.31.1) (2025-03-11)

### Performance Improvements

* 一些手机端适配优化 ([5b8d5dd](https://github.com/certd/certd/commit/5b8d5dd97536456a9d5d1384216eac1093b2dc3d))

# [1.31.0](https://github.com/certd/certd/compare/v1.30.6...v1.31.0) (2025-03-10)

### Performance Improvements

* 历史记录查看详情，可以切换到对应的历史记录日志上去 ([082802e](https://github.com/certd/certd/commit/082802e1197156837800f814728ee0f6b300b18c))
* 是否允许爬虫爬取增加ui设置选项 ([779db9d](https://github.com/certd/certd/commit/779db9da705d2dfef36fec21f52bd38af9fc5f2e))
* 易支付支持固定支付方式，适合没有收银台版本使用 ([81df96b](https://github.com/certd/certd/commit/81df96bf4542ce8d8ef4a428a4460dd554e4719a))
* 支持易盾RCDN部署 ([065713c](https://github.com/certd/certd/commit/065713cdb6953d16df08585c316c1a7a8eaec437))

## [1.30.6](https://github.com/certd/certd/compare/v1.30.5...v1.30.6) (2025-02-24)

**Note:** Version bump only for package @certd/ui-client

## [1.30.5](https://github.com/certd/certd/compare/v1.30.4...v1.30.5) (2025-02-14)

**Note:** Version bump only for package @certd/ui-client

## [1.30.4](https://github.com/certd/certd/compare/v1.30.3...v1.30.4) (2025-02-14)

**Note:** Version bump only for package @certd/ui-client

## [1.30.3](https://github.com/certd/certd/compare/v1.30.2...v1.30.3) (2025-02-13)

**Note:** Version bump only for package @certd/ui-client

## [1.30.2](https://github.com/certd/certd/compare/v1.30.1...v1.30.2) (2025-02-09)

### Bug Fixes

* 当前置任务被删除时进行校验 ([c89686a](https://github.com/certd/certd/commit/c89686a2fda251484930f0ae715417b618c21690))

### Performance Improvements

* 上传自定义证书 ([75a38d9](https://github.com/certd/certd/commit/75a38d95f305b4271d9106babe7cffc1c89ae8f3))

## [1.30.1](https://github.com/certd/certd/compare/v1.30.0...v1.30.1) (2025-01-20)

### Performance Improvements

* 创建流水线时，默认成功时也发送通知 ([52ae690](https://github.com/certd/certd/commit/52ae6902d203ca56e0312692b50c55cb6ddd3e39))
* http方式校验，选择sftp时，支持修改文件访问权限比如777 ([15d6eaf](https://github.com/certd/certd/commit/15d6eaf5532ed25acd4f8d58c429353a2f44206c))

# [1.30.0](https://github.com/certd/certd/compare/v1.29.5...v1.30.0) (2025-01-19)

### Bug Fixes

* 修复查看任务日志偶发性无法自动滚动底部的bug ([7e482f7](https://github.com/certd/certd/commit/7e482f798c0142bce1866f84676cb40210f9638a))

### Performance Improvements

* 证书仓库 ([91e7f45](https://github.com/certd/certd/commit/91e7f45a1c5ea1e0ec0aa3236b80028f03a6d0aa))

## [1.29.5](https://github.com/certd/certd/compare/v1.29.4...v1.29.5) (2025-01-07)

### Bug Fixes

* 修复授权管理，点击了查看原文按钮后，无法修改值的bug ([85c99f7](https://github.com/certd/certd/commit/85c99f7f80761ac6efaf3255c03b933442db1686))

## [1.29.4](https://github.com/certd/certd/compare/v1.29.3...v1.29.4) (2025-01-06)

### Bug Fixes

* 修复站点监控域名校验无法通过的bug ([1cb4a53](https://github.com/certd/certd/commit/1cb4a539cc523721ffd4b22d40d0e3d2d68cd915))

## [1.29.3](https://github.com/certd/certd/compare/v1.29.2...v1.29.3) (2025-01-04)

### Performance Improvements

* 优化站点证书检查页面，检查增加3次重试 ([e6dd7cd](https://github.com/certd/certd/commit/e6dd7cd54a3e23897031b5df6e0c3cdc0545d35a))
* 支持http校验方式申请证书 ([405591c](https://github.com/certd/certd/commit/405591c5d08fa1a3b228ee3980199e7731cfec4a))
* http校验方式，支持七牛云oss、阿里云oss、腾讯云cos ([3f74d4d](https://github.com/certd/certd/commit/3f74d4d9e5f5d0e629b44cff1895b3f7a8fbcafc))

## [1.29.2](https://github.com/certd/certd/compare/v1.29.1...v1.29.2) (2024-12-25)

**Note:** Version bump only for package @certd/ui-client

## [1.29.1](https://github.com/certd/certd/compare/v1.29.0...v1.29.1) (2024-12-25)

### Bug Fixes

* 免费套餐支持购买 ([f5ec987](https://github.com/certd/certd/commit/f5ec9870fd6af1f0c9099852bbdb4d07813ccce8))
* 修复某处金额转换丢失精度的bug ([d2d6f12](https://github.com/certd/certd/commit/d2d6f12218cbe7bd55f4ae082b93084be85f0a7b))
* 修复新版本小红点显示错误问题 ([fe4786e](https://github.com/certd/certd/commit/fe4786e168afe03a5243dd67971476c348339809))

### Performance Improvements

* 用户创建证书流水线没有购买套餐或者超限时提前报错 ([472f06c](https://github.com/certd/certd/commit/472f06c2d190d0ae48e8b53c18bc278437656a1c))
* 优化插件名称显示 ([26adf7d](https://github.com/certd/certd/commit/26adf7d437e674385f26a8f92fded6521a620671))

# [1.29.0](https://github.com/certd/certd/compare/v1.28.4...v1.29.0) (2024-12-24)

### Bug Fixes

* 修复手机模式下，查询框被文字遮盖的bug ([040788c](https://github.com/certd/certd/commit/040788c793642c3bb2a3ede87fe30fcf3be471bd))
* 修复左侧菜单收起时无法展开子菜单的bug ([0056223](https://github.com/certd/certd/commit/005622307e612717a5408aa1484717ef03003a22))

### Features

* 基础版不再限制流水线数量 ([cb27d4b](https://github.com/certd/certd/commit/cb27d4b4906b2782eaceb0a95bbdc5d0534370d2))
* 套餐购买支持易支付、支付宝支付 ([faa28f8](https://github.com/certd/certd/commit/faa28f88f954cba4c1dd29125562e5acd2fd99af))
* 用户套餐，用户支付功能 ([a019956](https://github.com/certd/certd/commit/a019956698acaf2c4beb620b5ad8c18918ead6a1))
* 支持微信支付 ([45d6347](https://github.com/certd/certd/commit/45d6347f5b6199493b11aabdd74177f6dca2cea4))

### Performance Improvements

* 调整创建证书表单字段的顺序 ([d393521](https://github.com/certd/certd/commit/d3935219f2aa50d6662c5b5ebf7ee25ad696ab2b))
* 同一时间只允许一个套餐生效 ([8ebf95a](https://github.com/certd/certd/commit/8ebf95a222a900d1707716c7b1f3b39f8a6d8f94))
* 用户名支持修改 ([89c7f07](https://github.com/certd/certd/commit/89c7f070343e86453c84677ebe1669f9b266d871))
* 优化证书申请跳过的状态显示，成功通知现在在跳过时不会发送 ([67d762b](https://github.com/certd/certd/commit/67d762b6a520f1fa24719a124e5ae975a81f5f82))
* 站点证书监控通知发送，每天定时检查 ([bb4910f](https://github.com/certd/certd/commit/bb4910f4e57234e42b44505f4620ae7af66025c5))

## [1.28.4](https://github.com/certd/certd/compare/v1.28.3...v1.28.4) (2024-12-12)

**Note:** Version bump only for package @certd/ui-client

## [1.28.3](https://github.com/certd/certd/compare/v1.28.2...v1.28.3) (2024-12-12)

### Bug Fixes

* 修复授权被删除后，无法清空的bug ([b45977c](https://github.com/certd/certd/commit/b45977c29a29084c11e496bec3415eaaebafdd74))

### Performance Improvements

* 点击版本红点按钮，跳转到升级帮助页面 ([454fbda](https://github.com/certd/certd/commit/454fbda581bbe22abca5b91e5086ea9d9d58a020))
* 通知标题优化 ([ff083ce](https://github.com/certd/certd/commit/ff083ce6848a8bee3c8248e4b881086ae1517c28))

## [1.28.2](https://github.com/certd/certd/compare/v1.28.1...v1.28.2) (2024-12-09)

### Bug Fixes

* 修复创建流水线通知设置无效的bug ([498cf34](https://github.com/certd/certd/commit/498cf34999fddfa24ce088e2e678469fa669abb8))

## [1.28.1](https://github.com/certd/certd/compare/v1.28.0...v1.28.1) (2024-12-08)

### Bug Fixes

* 修复cname排查方法 nslookup命令显示黑色的问题 ([3dfeeec](https://github.com/certd/certd/commit/3dfeeec899d7d0d7292695ce410f78548e076c03))

### Performance Improvements

* 通知选择器优化 ([2c0cbdd](https://github.com/certd/certd/commit/2c0cbdd29ecb74cc939b2ae7ee86b8d40f70ba31))
* 新增七牛云插件分组 ([49e7dc5](https://github.com/certd/certd/commit/49e7dc56e1a95fbdea3e30cdeb945b48415b69e3))
* 新增server酱3通知 ([6aa4872](https://github.com/certd/certd/commit/6aa487269c9f6862e188b37a0d6c73f79c937d94))
* 支持邀请奖励 ([618ec93](https://github.com/certd/certd/commit/618ec937866b24ebcf8164db43acb1ed66a5b329))
* 支持易发云短信 ([94fa77f](https://github.com/certd/certd/commit/94fa77fcd2b9bea294fb05736c0d8cdc81f56103))
* favicon支持自定义 ([8b9c47d](https://github.com/certd/certd/commit/8b9c47daf194515006689a212ae9cf586bdf5993))

# [1.28.0](https://github.com/certd/certd/compare/v1.27.9...v1.28.0) (2024-11-30)

### Features

* 手机号登录、邮箱验证码注册 ([7b55337](https://github.com/certd/certd/commit/7b55337c5edb470cca7aa62201eda8d274784004))

### Performance Improvements

* 部署到IIS插件 ([1534f45](https://github.com/certd/certd/commit/1534f4523633265d219d7b3a249a9ea1af99c512))
* 流水线支持批量修改分组，批量删除 ([a847e66](https://github.com/certd/certd/commit/a847e66c4fc843b98f1520b2b8072d3586ce8b81))
* 首页新增修改密码提示 ([0772d3b](https://github.com/certd/certd/commit/0772d3b3fd24afdde4086d9f09ef19d037b431b4))
* 选项显示图标 ([aedc462](https://github.com/certd/certd/commit/aedc46213571a3bd93809b7af7fa17a08d546237))
* 优化证书申请成功通知发送方式 ([8002a56](https://github.com/certd/certd/commit/8002a56efc5998aa03db5711ae87f9eb4bc9e160))
* 支持短信验证码登录 ([387bcc5](https://github.com/certd/certd/commit/387bcc5fa418cdeea81a06da5e3f8cd6b43cd082))
* 自定义webhook显示详细的错误信息 ([3254afc](https://github.com/certd/certd/commit/3254afc75640eed3729d0fc02a818fefbe5c7fc3))

## [1.27.9](https://github.com/certd/certd/compare/v1.27.8...v1.27.9) (2024-11-26)

### Performance Improvements

* 通知支持自定义webhook、anpush、iyuu、server酱 ([cbccd9e](https://github.com/certd/certd/commit/cbccd9e3d0a4c24aba772af62734666d40b22c57))
* 通知支持vocechat、bark、telegram、discord、slack ([642f57f](https://github.com/certd/certd/commit/642f57ff6d7152a9e14f59c7fc0e32a6b1751fb7))

## [1.27.8](https://github.com/certd/certd/compare/v1.27.7...v1.27.8) (2024-11-25)

**Note:** Version bump only for package @certd/ui-client

## [1.27.7](https://github.com/certd/certd/compare/v1.27.6...v1.27.7) (2024-11-25)

### Performance Improvements

* 通知管理 ([d9a00ee](https://github.com/certd/certd/commit/d9a00eeaf72735ced67c59d7983d84e3c730064a))
* 通知渠道支持测试按钮 ([b54ae27](https://github.com/certd/certd/commit/b54ae272ebc2d31b32b049d44e2299a6be7f153c))
* 支持企业微信群聊机器人通知 ([b805a29](https://github.com/certd/certd/commit/b805a2925984144a31575b8aaa622f0c30d41b56))

## [1.27.6](https://github.com/certd/certd/compare/v1.27.5...v1.27.6) (2024-11-19)

### Performance Improvements

* 当步骤全部都禁用时，任务本身显示删除线 ([9ab9a6e](https://github.com/certd/certd/commit/9ab9a6e8b083e19793894f23e59f29c604ec98e5))

## [1.27.5](https://github.com/certd/certd/compare/v1.27.4...v1.27.5) (2024-11-18)

### Bug Fixes

* 修复1Panel面板本身证书更新导致判定执行失败的问题 ([2689e6d](https://github.com/certd/certd/commit/2689e6d6c03aba21da90d5d45232c6ba08696be1))
* 修复Cname情况下，无法使用DNS类型的bug ([26dad39](https://github.com/certd/certd/commit/26dad399d5768b3205da099ddc11809aef7d6224))

### Performance Improvements

* 日志查看自动滚动到底部 ([4a2f7eb](https://github.com/certd/certd/commit/4a2f7ebf87b7c027cebff7cb763f8f35f6d2aa36))
* 系统设置中的代理设置优化为可全局生效，环境变量中的https_proxy设置将无效 ([381a37f](https://github.com/certd/certd/commit/381a37fbaa6b61c887eda743897ae00afb825bdf))
* 新手导航在非编辑模式下不显示 ([18bfcc2](https://github.com/certd/certd/commit/18bfcc24ad0bde57bb04db8a4209861ec6b8ff1d))
* 专业版试用，无需绑定账号 ([c7c4318](https://github.com/certd/certd/commit/c7c4318c11b65a76089787aa58939832d338a232))

## [1.27.4](https://github.com/certd/certd/compare/v1.27.3...v1.27.4) (2024-11-14)

### Performance Improvements

* 公共cname服务支持关闭 ([f4ae512](https://github.com/certd/certd/commit/f4ae5125dc4cd97816976779cb3586b5ee78947e))

## [1.27.3](https://github.com/certd/certd/compare/v1.27.2...v1.27.3) (2024-11-13)

### Bug Fixes

* 修复邮件配置，忽略证书校验设置不生效的bug ([66a9690](https://github.com/certd/certd/commit/66a9690dc958732e1b3c672d965db502296446f9))

### Performance Improvements

* 修复站点个性化，浏览器标题没有生效的bug ([bcfac02](https://github.com/certd/certd/commit/bcfac02c96ceaf23d1a0b05b48d8047da933beaf))
* 优化上传到主机插 路径选择，根据证书格式显示 ([8c3f86c](https://github.com/certd/certd/commit/8c3f86c6909ed91f48bb2880e78834e22f6f6a29))
* ipv6支持 ([da6ac16](https://github.com/certd/certd/commit/da6ac1626b3574be2fabeeb18a1f10d60bdcbe49))

## [1.27.2](https://github.com/certd/certd/compare/v1.27.1...v1.27.2) (2024-11-08)

### Performance Improvements

* 优化流水线页面切换回来不丢失查询条件 ([4dcf6e8](https://github.com/certd/certd/commit/4dcf6e87bc5f7657ce8a56c5331e8723a0fee8ee))
* 支持公共cname服务 ([3c919ee](https://github.com/certd/certd/commit/3c919ee5d1aef5d26cf3620a7c49d920786bc941))
* 执行历史支持点击查看流水线详情 ([8968639](https://github.com/certd/certd/commit/89686399f90058835435b92872fc236fac990148))
* 专业版7天试用 ([c58250e](https://github.com/certd/certd/commit/c58250e1f065a9bd8b4e82acc1df754504c0010c))

## [1.27.1](https://github.com/certd/certd/compare/v1.27.0...v1.27.1) (2024-11-04)

### Bug Fixes

* 修复头像没有更新的bug ([9b4a31f](https://github.com/certd/certd/commit/9b4a31fa6a32b9cab2e22bd141cf96ca29120445))

### Performance Improvements

* 禁止页面缓存，点击tab页签可以刷新数据 ([7ad4b55](https://github.com/certd/certd/commit/7ad4b55ee000c1dd0747832b11107f32b0ffb889))
* 优化时间选择器，自动填写分钟和秒钟 ([396dc34](https://github.com/certd/certd/commit/396dc34a841c7d016b033736afdba8366fb2d211))
* cname 域名映射记录可读性优化 ([b1117ed](https://github.com/certd/certd/commit/b1117ed54a3ef015752999324ff72b821ef5e4b9))

# [1.27.0](https://github.com/certd/certd/compare/v1.26.16...v1.27.0) (2024-10-31)

### Bug Fixes

* 修复历史记录不能按名称查询的bug ([6113c38](https://github.com/certd/certd/commit/6113c388b7fc58b11ca19ff05cc1286d096c8d28))

### Features

* 首页全新改版 ([63ec5b5](https://github.com/certd/certd/commit/63ec5b5519c760a3330569c0da6dac157302a330))

### Performance Improvements

* 管理控制台数据统计 ([babd589](https://github.com/certd/certd/commit/babd5897ae013ff7c04ebfcbfac8a00d84dd627c))
* 增加向导 ([6d9ef26](https://github.com/certd/certd/commit/6d9ef26ecab71d752c2c55d75aed4fb5f6c05a39))

## [1.26.16](https://github.com/certd/certd/compare/v1.26.15...v1.26.16) (2024-10-30)

**Note:** Version bump only for package @certd/ui-client

## [1.26.15](https://github.com/certd/certd/compare/v1.26.14...v1.26.15) (2024-10-28)

### Bug Fixes

* 顶部菜单变...的bug ([6dabad7](https://github.com/certd/certd/commit/6dabad76baba96be0f8af36a3fbfb9f5182aecf1))

### Performance Improvements

* 默认证书更新时间设置为35天，增加腾讯云删除过期证书插件，可以避免腾讯云过期证书邮件 ([51b6fed](https://github.com/certd/certd/commit/51b6fed468eaa6f28ce4497ce303ace1a52abb96))
* 授权加密支持解密查看 ([5575c83](https://github.com/certd/certd/commit/5575c839705f6987ad2bdcd33256b0962c6a9c6a))
* 重置管理员密码同时启用管理员账户，避免之前禁用了，重置密码还是登录不进去 ([f92d918](https://github.com/certd/certd/commit/f92d918a1e28e29b794ad4754661ea760c18af46))

## [1.26.14](https://github.com/certd/certd/compare/v1.26.13...v1.26.14) (2024-10-26)

### Bug Fixes

* 修复启动时自签证书无法保存的bug ([526c484](https://github.com/certd/certd/commit/526c48450bcd37b3ccded9b448f17de8140bdc6e))

### Performance Improvements

* 顶部菜单自定义 ([54d136c](https://github.com/certd/certd/commit/54d136cc6ae122f7c891b7a5c7232fe5de8e5cb5))
* 禁用readonly用户 ([d10d42e](https://github.com/certd/certd/commit/d10d42e20619bb55a50d636b8867ff33db4e3b4b))
* 限制其他用户流水线数量 ([315e437](https://github.com/certd/certd/commit/315e43746baf01682737f82e41579237a48409af))
* 用户管理优化头像上传 ([661293c](https://github.com/certd/certd/commit/661293c189a3abf3cdc953b5225192372f57930d))

## [1.26.13](https://github.com/certd/certd/compare/v1.26.12...v1.26.13) (2024-10-26)

### Bug Fixes

* 修复对话框全屏按钮与关闭按钮重叠的bug ([95df56c](https://github.com/certd/certd/commit/95df56cc5ca5e3eb843cd17cb7078cde47729f1e))

### Performance Improvements

* 支持同时监听https端口，7002 ([d5a17f9](https://github.com/certd/certd/commit/d5a17f9e6afd63fda2df0981118480f25a1fac2e))

## [1.26.12](https://github.com/certd/certd/compare/v1.26.11...v1.26.12) (2024-10-25)

### Performance Improvements

* 部署到阿里云任意云资源，阿里云部署大杀器 ([4075be7](https://github.com/certd/certd/commit/4075be7849b140acb92bd8da8a9acbf4eef85180))
* 文件名特殊字符限制输入 ([c4164c6](https://github.com/certd/certd/commit/c4164c66e29f3ec799f98108a344806ca61e94ff))
* 新增部署到百度云CDN插件 ([f126f9f](https://github.com/certd/certd/commit/f126f9f932d37fa01fff1accc7bdd17d349f8db5))
* 优化cron选择器，增加下次触发时间显示 ([5b148b7](https://github.com/certd/certd/commit/5b148b7ed960ca6f7f5b733b2eadd56eeecbd4c2))
* 支持配置公共ZeroSSL授权 ([a90d1e6](https://github.com/certd/certd/commit/a90d1e68ee9cbc3705223457b8a86f071b150968))

## [1.26.11](https://github.com/certd/certd/compare/v1.26.10...v1.26.11) (2024-10-23)

### Bug Fixes

* 修复移动任务后出现空阶段的bug ([4ea3edd](https://github.com/certd/certd/commit/4ea3edd59e93ca4f5b2e43b20dd4ef33909caddb))
* 允许七牛云cdn插件输入.号开头的通配符域名 ([18ee87d](https://github.com/certd/certd/commit/18ee87daff6eafc2201b58e28d85aafd3cb7a5b9))

### Performance Improvements

* 优化日志颜色 ([1291e98](https://github.com/certd/certd/commit/1291e98e821c5b1810aab7f0aebe3f5f5cd44a20))
* 优化证书申请速度和成功率，反代地址优化，google基本可以稳定请求。增加请求重试。 ([41d9c3a](https://github.com/certd/certd/commit/41d9c3ac8398def541e65351cbe920d4a927182d))
* 优化pfx密码密码输入框，让浏览器不自动填写密码 ([ffeede3](https://github.com/certd/certd/commit/ffeede38afa70c5ff6f2015516bead23d2c4df87))

## [1.26.10](https://github.com/certd/certd/compare/v1.26.9...v1.26.10) (2024-10-20)

### Bug Fixes

* 修复cname服务普通用户access访问权限问题 ([c1e3e2e](https://github.com/certd/certd/commit/c1e3e2ee1f923ee5806479dd5f178c3286a01ae0))

## [1.26.9](https://github.com/certd/certd/compare/v1.26.8...v1.26.9) (2024-10-19)

### Bug Fixes

* 修复切换普通用户登录时，左侧菜单没有同步更新的bug ([12116a8](https://github.com/certd/certd/commit/12116a89f43cf8b98f16d2ea6073f6b72a643215))
* 修正邮箱设置跳转路由 ([17d8890](https://github.com/certd/certd/commit/17d88900a1f0e3af609b74597f5b1978230db32d))

### Performance Improvements

* 触发证书重新申请input变化对比规则优化，减少升级版本后触发申请证书的情况 ([c46a2a9](https://github.com/certd/certd/commit/c46a2a9a399c2a9a8bb59a48b9fb6e93227cce9b))
* 优化菜单 ([1f4f157](https://github.com/certd/certd/commit/1f4f15757de1015cf7563f7022599eef58cc93d7))
* 增加文档站 https://certd.docmirror.cn ([6e2ac1c](https://github.com/certd/certd/commit/6e2ac1c089f6ddccb396f1f2738509c05333e1bb))

## [1.26.8](https://github.com/certd/certd/compare/v1.26.7...v1.26.8) (2024-10-15)

### Performance Improvements

* 密钥备份 ([1c6028a](https://github.com/certd/certd/commit/1c6028abcf8849163462bb2f8441b6838357e09b))
* 证书直接查看 ([5dde5bd](https://github.com/certd/certd/commit/5dde5bd3f76db3959d411619d29bfb8064e3b307))
* sqlite数据库备份插件 ([77f1631](https://github.com/certd/certd/commit/77f163144f7dcfb0431475c55508fecfd6d969f8))

## [1.26.7](https://github.com/certd/certd/compare/v1.26.6...v1.26.7) (2024-10-14)

**Note:** Version bump only for package @certd/ui-client

## [1.26.6](https://github.com/certd/certd/compare/v1.26.5...v1.26.6) (2024-10-14)

**Note:** Version bump only for package @certd/ui-client

## [1.26.5](https://github.com/certd/certd/compare/v1.26.4...v1.26.5) (2024-10-14)

**Note:** Version bump only for package @certd/ui-client

## [1.26.4](https://github.com/certd/certd/compare/v1.26.3...v1.26.4) (2024-10-14)

### Performance Improvements

* [comm] 支持插件管理 ([e8b617b](https://github.com/certd/certd/commit/e8b617b80ce882dd63006f0cfc719a80a1cc6acc))
* 新增代理设置功能 ([273ab61](https://github.com/certd/certd/commit/273ab6139f5807f4d7fe865cc353b97f51b9a668))
* EAB授权支持绑定邮箱，支持公共EAB设置 ([07043af](https://github.com/certd/certd/commit/07043aff0ca7fd29c56dd3c363002cb15d78b464))

## [1.26.3](https://github.com/certd/certd/compare/v1.26.2...v1.26.3) (2024-10-12)

### Performance Improvements

* 优化系统设置加载时机 ([7396253](https://github.com/certd/certd/commit/73962536d5a4769902d760d005f3f879465addcc))

## [1.26.2](https://github.com/certd/certd/compare/v1.26.1...v1.26.2) (2024-10-11)

### Performance Improvements

* 邮箱设置改为系统设置，普通用户无需配置发件邮箱 ([4244569](https://github.com/certd/certd/commit/42445692117184a3293e63bef84a74cbb5984b0e))

## [1.26.1](https://github.com/certd/certd/compare/v1.26.0...v1.26.1) (2024-10-10)

**Note:** Version bump only for package @certd/ui-client

# [1.26.0](https://github.com/certd/certd/compare/v1.25.9...v1.26.0) (2024-10-10)

### Bug Fixes

* 修复历史记录根据流水线名称查询报错的bug ([ce9a986](https://github.com/certd/certd/commit/ce9a9862f122fce2186e7727eaa4b251b59e6032))

### Features

* 域名验证方法支持CNAME间接方式，此方式支持所有域名注册商，且无需提供Access授权，但是需要手动添加cname解析 ([f3d3508](https://github.com/certd/certd/commit/f3d35084ed44f9f33845f7045e520be5c27eed93))
* 站点个性化设置 ([11a9fe9](https://github.com/certd/certd/commit/11a9fe9014d96cba929e5a066e78f2af7ae59d14))

### Performance Improvements

* 并行任务名称改成添加任务，取消并行，可以在同一个阶段获取上一个task的输出 ([c5e5877](https://github.com/certd/certd/commit/c5e58770d1c5edc19c6f9ea1618f44b68e091f35))
* 调整静态资源到static目录 ([0584b36](https://github.com/certd/certd/commit/0584b3672b40f9042a2ed87e5627022606d046cd))
* 调整全部静态资源到static目录 ([a218890](https://github.com/certd/certd/commit/a21889080d6c7ffdf0af526a3a21f0b2d1c77288))
* 检查cname是否正确配置 ([b5d8935](https://github.com/certd/certd/commit/b5d8935159374fbe7fc7d4c48ae0ed9396861bdd))
* 优化宝塔网站部署插件远程获取数据的提示 ([2a3ca9f](https://github.com/certd/certd/commit/2a3ca9f552d96594ec6690a1c4c91f598451b9a1))
* 优化缩短首页缓存时间 ([49395e8](https://github.com/certd/certd/commit/49395e8cb65f4b30c0145329ed5de48be4ef3842))
* 域名输入增加校验提示，避免输入错误的域名 ([0c8e83e](https://github.com/certd/certd/commit/0c8e83e1254a9ce4d5a4e7888eb1710394a4b77c))
* cname校验配置增加未校验通过提示 ([77cc3c4](https://github.com/certd/certd/commit/77cc3c4a5cbd81f8233a8e0bb33fab0621c0905f))
* google eab授权支持自动获取，不过要配置代理 ([592791d](https://github.com/certd/certd/commit/592791d1356fc252fbb70d7f168567aee9585507))

## [1.25.9](https://github.com/certd/certd/compare/v1.25.8...v1.25.9) (2024-10-01)

### Bug Fixes

* 修复西部数码账户级别apikey不可用的bug ([f8f3e8b](https://github.com/certd/certd/commit/f8f3e8b43fd5d815887bcb53b95f46dc96424b79))

## [1.25.8](https://github.com/certd/certd/compare/v1.25.7...v1.25.8) (2024-09-30)

### Performance Improvements

* 群晖获取deviceid优化 ([8d42273](https://github.com/certd/certd/commit/8d4227366548eb70f6bc04303829e6933168f906))

## [1.25.7](https://github.com/certd/certd/compare/v1.25.6...v1.25.7) (2024-09-29)

**Note:** Version bump only for package @certd/ui-client

## [1.25.6](https://github.com/certd/certd/compare/v1.25.5...v1.25.6) (2024-09-29)

### Performance Improvements

* 部署支持1Panel ([d047234](https://github.com/certd/certd/commit/d047234d98d31504f2e5a472b66e1b75806af26e))
* 增加使用教程 ([9d9c021](https://github.com/certd/certd/commit/9d9c0218195af5b9896cce7109b26a433480571d))

## [1.25.5](https://github.com/certd/certd/compare/v1.25.4...v1.25.5) (2024-09-26)

**Note:** Version bump only for package @certd/ui-client

## [1.25.4](https://github.com/certd/certd/compare/v1.25.3...v1.25.4) (2024-09-25)

**Note:** Version bump only for package @certd/ui-client

## [1.25.3](https://github.com/certd/certd/compare/v1.25.2...v1.25.3) (2024-09-24)

**Note:** Version bump only for package @certd/ui-client

## [1.25.2](https://github.com/certd/certd/compare/v1.25.1...v1.25.2) (2024-09-24)

**Note:** Version bump only for package @certd/ui-client

## [1.25.1](https://github.com/certd/certd/compare/v1.25.0...v1.25.1) (2024-09-24)

**Note:** Version bump only for package @certd/ui-client

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
* 优化收件邮箱输入 ([22ef28f](https://github.com/certd/certd/commit/22ef28f6338a78465bd52ccbad13e66e80263b2f))
* 支持阿里云ACK证书部署 ([d331fea](https://github.com/certd/certd/commit/d331fea47789122650e057ec7c9e85ee8e66f09b))
* 支持七牛云 ([8ecc2f9](https://github.com/certd/certd/commit/8ecc2f9446a9ebd11b9bfbffbb6cf7812a043495))
* plugins增加图标 ([a8da658](https://github.com/certd/certd/commit/a8da658a9723342b4f43a579f7805bfef0648efb))

## [1.24.4](https://github.com/certd/certd/compare/v1.24.3...v1.24.4) (2024-09-09)

### Performance Improvements

* 插件选择支持搜索 ([d1498a7](https://github.com/certd/certd/commit/d1498a71601b74d38343b1d070eadd03705dd9d5))

## [1.24.3](https://github.com/certd/certd/compare/v1.24.2...v1.24.3) (2024-09-06)

**Note:** Version bump only for package @certd/ui-client

## [1.24.2](https://github.com/certd/certd/compare/v1.24.1...v1.24.2) (2024-09-06)

### Bug Fixes

* 修复复制流水线出现的各种问题 ([6314e8d](https://github.com/certd/certd/commit/6314e8d7eb58cd52e2a7bd3b5ffb9112b0b69577))

### Performance Improvements

* 阶段、任务、步骤全面支持拖动排序 ([bd73a16](https://github.com/certd/certd/commit/bd73a163cd0497f062bd424ddc6bc9bbc95f81ea))
* 任务配置不需要的字段可以自动隐藏 ([192d9dc](https://github.com/certd/certd/commit/192d9dc7e36737d684c769f255f407c28b1152ac))
* 任务支持拖动排序 ([1e9b563](https://github.com/certd/certd/commit/1e9b5638aa36a8ce70019a9c750230ba41938327))
* client 请求超时时间延长为10s ([ff46771](https://github.com/certd/certd/commit/ff46771d8dd43e71c1ca70e3ba783945750342cc))

## [1.24.1](https://github.com/certd/certd/compare/v1.24.0...v1.24.1) (2024-09-02)

### Bug Fixes

* 激活仅限管理员 ([1c17970](https://github.com/certd/certd/commit/1c17970b981f0987c506744ee6b2283fd5e40493))

### Performance Improvements

* 授权配置支持加密 ([42a56b5](https://github.com/certd/certd/commit/42a56b581d754c3e5f9838179d19ab0d004ef2eb))
* 支持阿里云 DCDN ([98b77f8](https://github.com/certd/certd/commit/98b77f80843834616fb26f83b4c42245326abd06))
* 支持已跳过的步骤重新运行 ([ea775ad](https://github.com/certd/certd/commit/ea775adae18d57a04470cfba6b9460d761d74035))
* 支持cdnfly ([724a850](https://github.com/certd/certd/commit/724a85028b4a7146c9e3b4df4497dcf2a7bf7c67))
* 支持ftp上传 ([b9bddbf](https://github.com/certd/certd/commit/b9bddbfabb5664365f1232e9432532187c98006c))

# [1.24.0](https://github.com/certd/certd/compare/v1.23.1...v1.24.0) (2024-08-25)

### Bug Fixes

* 部署到腾讯云cdn选择证书任务步骤限制只能选证书 ([3345c14](https://github.com/certd/certd/commit/3345c145b802170f75a098a35d0c4b8312efcd17))
* 修复执行日志没有清理的bug ([22a3363](https://github.com/certd/certd/commit/22a336370a88a7df2a23c967043bae153da71ed5))

### Features

* 支持ECC类型 ([a7424e0](https://github.com/certd/certd/commit/a7424e02f5c7e02ac1688791040785920ce67473))

### Performance Improvements

* 优化成功后跳过的提示 ([7b451bb](https://github.com/certd/certd/commit/7b451bbf6e6337507f4627b5a845f5bd96ab4f7b))
* 优化证书申请成功率 ([968c469](https://github.com/certd/certd/commit/968c4690a07f69c08dcb3d3a494da4e319627345))
* email proxy ([453f1ba](https://github.com/certd/certd/commit/453f1baa0b9eb0f648aa1b71ccf5a95b202ce13f))

## [1.23.1](https://github.com/certd/certd/compare/v1.23.0...v1.23.1) (2024-08-06)

### Performance Improvements

* 优化默认值设置 ([1af19f0](https://github.com/certd/certd/commit/1af19f0ac053fe109782882964533636b5969d6b))

# [1.23.0](https://github.com/certd/certd/compare/v1.22.9...v1.23.0) (2024-08-05)

### Features

* use node 20 ([e8ed972](https://github.com/certd/certd/commit/e8ed97206bf28e83f942db2ef4ea07fa76fd3567))

## [1.22.9](https://github.com/certd/certd/compare/v1.22.8...v1.22.9) (2024-08-05)

### Performance Improvements

* 优化定时任务 ([87e440e](https://github.com/certd/certd/commit/87e440ee2a8b10dc571ce619f28bc83c1e5eb147))

## [1.22.8](https://github.com/certd/certd/compare/v1.22.7...v1.22.8) (2024-08-05)

### Performance Improvements

* 修复删除历史记录没有删除log的bug，新增history管理页面，演示站点启动时不自动启动非管理员用户的定时任务 ([f78ae93](https://github.com/certd/certd/commit/f78ae93eedfe214008c3d071ca3d77c962137a64))

## [1.22.7](https://github.com/certd/certd/compare/v1.22.6...v1.22.7) (2024-08-04)

**Note:** Version bump only for package @certd/ui-client

## [1.22.6](https://github.com/certd/certd/compare/v1.22.5...v1.22.6) (2024-08-03)

### Bug Fixes

* 修复在相同的cron时偶尔无法触发定时任务的bug ([680941a](https://github.com/certd/certd/commit/680941af119619006b592e3ab6fb112cb5556a8b))

### Performance Improvements

* 流水线支持名称模糊查询 ([59897c4](https://github.com/certd/certd/commit/59897c4ceae992ebe2972ca9e8f9196616ffdfd7))

## [1.22.5](https://github.com/certd/certd/compare/v1.22.4...v1.22.5) (2024-07-26)

**Note:** Version bump only for package @certd/ui-client

## [1.22.3](https://github.com/certd/certd/compare/v1.22.2...v1.22.3) (2024-07-25)

**Note:** Version bump only for package @certd/ui-client

## [1.22.2](https://github.com/certd/certd/compare/v1.22.1...v1.22.2) (2024-07-23)

### Bug Fixes

* 修复创建流水线时，无法根据dns类型默认正确的dns授权的bug ([a2c43b5](https://github.com/certd/certd/commit/a2c43b50a6069ed48958fd142844a8568c2af452))

## [1.22.1](https://github.com/certd/certd/compare/v1.22.0...v1.22.1) (2024-07-20)

### Performance Improvements

* 创建证书任务可以选择lege插件 ([affef13](https://github.com/certd/certd/commit/affef130378030c517250c58a4e787b0fc85d7d1))
* 创建证书任务增加定时任务和邮件通知输入 ([427620d](https://github.com/certd/certd/commit/427620d34f3b8ad6933005faf1878908441a2453))

# [1.22.0](https://github.com/certd/certd/compare/v1.21.2...v1.22.0) (2024-07-19)

### Features

* 升级midway，支持esm ([485e603](https://github.com/certd/certd/commit/485e603b5165c28bc08694997726eaf2a585ebe7))

### Performance Improvements

* 优化一些小细节 ([b168852](https://github.com/certd/certd/commit/b1688525dbbbfd67e0ab1cf5b4ddfbe9d394f370))
* 增加备案号设置 ([bd3d959](https://github.com/certd/certd/commit/bd3d959944db63a5690b55ee150e1007133868b9))
* 自动生成jwtkey，无需手动配置 ([390e485](https://github.com/certd/certd/commit/390e4853a570390a97df6a3b3882579f9547eeb4))

## [1.21.2](https://github.com/certd/certd/compare/v1.21.1...v1.21.2) (2024-07-08)

**Note:** Version bump only for package @certd/ui-client

## [1.21.1](https://github.com/certd/certd/compare/v1.21.0...v1.21.1) (2024-07-08)

### Performance Improvements

* 说明优化，默认值优化 ([970c7fd](https://github.com/certd/certd/commit/970c7fd8a0f557770e973d8462ee5684ef742810))

# [1.21.0](https://github.com/certd/certd/compare/v1.20.17...v1.21.0) (2024-07-03)

**Note:** Version bump only for package @certd/ui-client

## [1.20.17](https://github.com/certd/certd/compare/v1.20.16...v1.20.17) (2024-07-03)

**Note:** Version bump only for package @certd/ui-client

## [1.20.16](https://github.com/certd/certd/compare/v1.20.15...v1.20.16) (2024-07-01)

**Note:** Version bump only for package @certd/ui-client

## [1.20.15](https://github.com/certd/certd/compare/v1.20.14...v1.20.15) (2024-06-28)

### Bug Fixes

* 修复无法强制取消任务的bug ([9cc01db](https://github.com/certd/certd/commit/9cc01db1d569a5c45bb3e731f35d85df324a8e62))

### Performance Improvements

* 支持windows文件上传 ([7f61cab](https://github.com/certd/certd/commit/7f61cab101fa13b4e88234e9ad47434e6130fed2))

## [1.20.14](https://github.com/certd/certd/compare/v1.20.13...v1.20.14) (2024-06-23)

### Bug Fixes

* 修复修改密码功能异常问题 ([f740ff5](https://github.com/certd/certd/commit/f740ff517f521dce361284c2c54bccc68aee0ea2))

## [1.20.13](https://github.com/certd/certd/compare/v1.20.12...v1.20.13) (2024-06-18)

### Bug Fixes

* 日志高度越界 ([c4c9adb](https://github.com/certd/certd/commit/c4c9adb8bfd513f57252e523794e3799a9b220f8))
* 修复邮箱设置页面SMTP拼写错误的问题 ([b98f1c0](https://github.com/certd/certd/commit/b98f1c0dd0bc6c6b4f814c578692afdf6d90b88d))
* 修复logo问题 ([7e483e6](https://github.com/certd/certd/commit/7e483e60913d509b113148c735fe13ba1d72dddf))

### Performance Improvements

* 增加警告，修复一些样式错乱问题 ([fd54c2f](https://github.com/certd/certd/commit/fd54c2ffac492222e85ff2f5f49a9ee5cfc73588))

## [1.20.12](https://github.com/certd/certd/compare/v1.20.10...v1.20.12) (2024-06-17)

### Bug Fixes

* 修复aliyun域名超过100个找不到域名的bug ([5b1494b](https://github.com/certd/certd/commit/5b1494b3ce93d1026dc56ee741342fbb8bf7be24))

### Performance Improvements

* 增加系统设置，可以关闭自助注册功能 ([20feace](https://github.com/certd/certd/commit/20feacea12d43386540db6a600f391d786be4014))
* 支持cloudflare域名 ([fbb9a47](https://github.com/certd/certd/commit/fbb9a47e8f7bb805289b9ee64bd46ffee0f01c06))

## [1.20.10](https://github.com/certd/certd/compare/v1.20.9...v1.20.10) (2024-05-30)

### Performance Improvements

* 上传到主机插件支持复制到本机路径 ([92446c3](https://github.com/certd/certd/commit/92446c339936f98f08f654b8971a7393d8435224))
* 优化文件下载包名 ([d9eb927](https://github.com/certd/certd/commit/d9eb927b0a1445feab08b1958aa9ea80637a5ae6))
* 增加任务复制功能 ([39ad759](https://github.com/certd/certd/commit/39ad7597fa0e19cc1f7631bbd6fea0a9e05a62c9))

## [1.20.9](https://github.com/certd/certd/compare/v1.20.8...v1.20.9) (2024-03-22)

**Note:** Version bump only for package @certd/ui-client

## [1.20.8](https://github.com/certd/certd/compare/v1.20.7...v1.20.8) (2024-03-22)

**Note:** Version bump only for package @certd/ui-client

## [1.20.7](https://github.com/certd/certd/compare/v1.20.6...v1.20.7) (2024-03-22)

**Note:** Version bump only for package @certd/ui-client

## [1.20.6](https://github.com/certd/certd/compare/v1.20.5...v1.20.6) (2024-03-21)

### Bug Fixes

* 调整按钮图标到居中位置 ([836d18f](https://github.com/certd/certd/commit/836d18f07e22d00faf2f213bc3301a6672b5bafc))

### Performance Improvements

* 插件贡献文档及示例 ([72fb20a](https://github.com/certd/certd/commit/72fb20abf3ba5bdd862575d2907703a52fd7eb17))

## [1.20.5](https://github.com/certd/certd/compare/v1.20.2...v1.20.5) (2024-03-11)

### Bug Fixes

* 修复腾讯云cdn部署无法选择端点的bug ([154409b](https://github.com/certd/certd/commit/154409b1dfee3ea1caae740ad9c1f99a6e7a9814))

## [1.20.2](https://github.com/certd/certd/compare/v1.2.1...v1.20.2) (2024-02-28)

**Note:** Version bump only for package @certd/ui-client

## [1.2.1](https://github.com/certd/certd/compare/v1.2.0...v1.2.1) (2023-12-12)

**Note:** Version bump only for package @certd/ui-client

**Note:** Version bump only for package @certd/ui-client

# [1.2.0](https://github.com/certd/certd/compare/v1.1.6...v1.2.0) (2023-10-27)

* 🔱: [client] sync upgrade with 2 commits [trident-sync] ([aa3207f](https://github.com/certd/certd/commit/aa3207fca5f15f7c3da789989d99c8ae7d1c4551))

### BREAKING CHANGES

* search支持自定义布局，search.layout、search.collapse转移到 search.container之下。如果想使用原来的search组件，请配置search.is=fs-search-v1

## [1.1.6](https://github.com/certd/certd/compare/v1.1.5...v1.1.6) (2023-07-10)

**Note:** Version bump only for package @certd/ui-client

## [1.1.5](https://github.com/certd/certd/compare/v1.1.4...v1.1.5) (2023-07-03)

**Note:** Version bump only for package @certd/ui-client

## [1.1.4](https://github.com/certd/certd/compare/v1.1.3...v1.1.4) (2023-07-03)

### Bug Fixes

* 成功图标转动的问题 ([f87eee3](https://github.com/certd/certd/commit/f87eee3b9ff1ef9874e79a81fe0ed7104cb9ee8c))

### Performance Improvements

* cancel task ([bc65c0a](https://github.com/certd/certd/commit/bc65c0a786360c087fe95cad93ec6a87804cc5ee))
* flush log ([891a43a](https://github.com/certd/certd/commit/891a43ae6716ff98ed06643f7da2e35199ee195c))

## [1.1.3](https://github.com/certd/certd/compare/v1.1.2...v1.1.3) (2023-07-03)

**Note:** Version bump only for package @certd/ui-client

## [1.1.2](https://github.com/certd/certd/compare/v1.1.1...v1.1.2) (2023-07-03)

**Note:** Version bump only for package @certd/ui-client

## [1.1.1](https://github.com/certd/certd/compare/v1.1.0...v1.1.1) (2023-06-28)

**Note:** Version bump only for package @certd/ui-client

# [1.1.0](https://github.com/certd/certd/compare/v1.0.6...v1.1.0) (2023-06-28)

### Bug Fixes

* 修复access选择类型trigger ([2851a33](https://github.com/certd/certd/commit/2851a33eb2510f038fadb55da29512597a4ba512))

### Features

* 权限控制 ([27a4c81](https://github.com/certd/certd/commit/27a4c81c6d70e70abb3892c3ea58d4719988808a))
* 邮件通知 ([937e3fa](https://github.com/certd/certd/commit/937e3fac19cd03b8aa91db8ba03fda7fcfbacea2))
* cert download ([5a51c14](https://github.com/certd/certd/commit/5a51c14de521cb8075a80d2ae41a16e6d5281259))
* save files ([671d273](https://github.com/certd/certd/commit/671d273e2f9136d16896536b0ca127cf372f1619))

## [1.0.6](https://github.com/certd/certd/compare/v1.0.5...v1.0.6) (2023-05-25)

**Note:** Version bump only for package @certd/ui-client

## [1.0.5](https://github.com/certd/certd/compare/v1.0.4...v1.0.5) (2023-05-25)

**Note:** Version bump only for package @certd/ui-client

## [1.0.4](https://github.com/certd/certd/compare/v1.0.3...v1.0.4) (2023-05-25)

**Note:** Version bump only for package @certd/ui-client

## [1.0.3](https://github.com/certd/certd/compare/v1.0.2...v1.0.3) (2023-05-25)

**Note:** Version bump only for package @certd/ui-client

## [1.0.2](https://github.com/certd/certd/compare/v1.0.1...v1.0.2) (2023-05-24)

**Note:** Version bump only for package @certd/ui-client

## [1.0.1](https://github.com/certd/certd/compare/v1.0.0...v1.0.1) (2023-05-24)

**Note:** Version bump only for package @certd/ui-client

## [1.9.2](https://github.com/fast-crud/fast-crud/compare/v1.9.1...v1.9.2) (2023-03-01)

**Note:** Version bump only for package @fast-crud/fs-admin-antdv

## [1.9.1](https://github.com/fast-crud/fast-crud/compare/v1.9.0...v1.9.1) (2023-03-01)

**Note:** Version bump only for package @fast-crud/fs-admin-antdv

## [0.10.5](https://github.com/fast-crud/fast-crud/compare/v0.10.4...v0.10.5) (2021-07-01)

### Performance Improvements

* fs-admin 与crud demo ([4e6b20f](https://github.com/fast-crud/fast-crud/commit/4e6b20fe19434460853841f371b9fd5f16e5e2d3))
* fs-admin纳入子模块 ([2940d30](https://github.com/fast-crud/fast-crud/commit/2940d30f419bf4bde1e8e791f1fbdb9184818285))
