# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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
