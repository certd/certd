# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.22.2](https://github.com/certd/certd/compare/v1.22.1...v1.22.2) (2024-07-23)

### Bug Fixes

* 修复创建流水线时，无法根据dns类型默认正确的dns授权的bug ([a2c43b5](https://github.com/certd/certd/commit/a2c43b50a6069ed48958fd142844a8568c2af452))

## [1.22.1](https://github.com/certd/certd/compare/v1.22.0...v1.22.1) (2024-07-20)

### Performance Improvements

* 创建证书任务可以选择lege插件 ([affef13](https://github.com/certd/certd/commit/affef130378030c517250c58a4e787b0fc85d7d1))
* 创建证书任务增加定时任务和邮件通知输入 ([427620d](https://github.com/certd/certd/commit/427620d34f3b8ad6933005faf1878908441a2453))
* 支持配置启动后自动触发一次任务 ([a5a0c1f](https://github.com/certd/certd/commit/a5a0c1f6e7a3f05e581005e491d5b102ee854412))

# [1.22.0](https://github.com/certd/certd/compare/v1.21.2...v1.22.0) (2024-07-19)

### Features

* 升级midway，支持esm ([485e603](https://github.com/certd/certd/commit/485e603b5165c28bc08694997726eaf2a585ebe7))
* 支持lego，海量DNS提供商 ([0bc6d0a](https://github.com/certd/certd/commit/0bc6d0a211920fb0084d705e1db67ee1e7262c44))
* 支持postgresql ([3b19bfb](https://github.com/certd/certd/commit/3b19bfb4291e89064b3b407a80dae092d54747d5))

### Performance Improvements

* 优化一些小细节 ([b168852](https://github.com/certd/certd/commit/b1688525dbbbfd67e0ab1cf5b4ddfbe9d394f370))
* 增加备案号设置 ([bd3d959](https://github.com/certd/certd/commit/bd3d959944db63a5690b55ee150e1007133868b9))
* 自动生成jwtkey，无需手动配置 ([390e485](https://github.com/certd/certd/commit/390e4853a570390a97df6a3b3882579f9547eeb4))

## [1.21.2](https://github.com/certd/certd/compare/v1.21.1...v1.21.2) (2024-07-08)

### Performance Improvements

* 申请证书时可以选择跳过本地dns校验 ([fe91d94](https://github.com/certd/certd/commit/fe91d94090d22ed0a3ea753ba74dfaa1bf057c17))

## [1.21.1](https://github.com/certd/certd/compare/v1.21.0...v1.21.1) (2024-07-08)

### Performance Improvements

* 上传到主机，支持设置不mkdirs ([5ba9831](https://github.com/certd/certd/commit/5ba9831ed1aa6ec6057df246f1035b36b9c41d2e))
* 说明优化，默认值优化 ([970c7fd](https://github.com/certd/certd/commit/970c7fd8a0f557770e973d8462ee5684ef742810))

# [1.21.0](https://github.com/certd/certd/compare/v1.20.17...v1.21.0) (2024-07-03)

### Features

* 支持zero ssl ([eade2c2](https://github.com/certd/certd/commit/eade2c2b681569f03e9cd466e7d5bcd6703ed492))

## [1.20.17](https://github.com/certd/certd/compare/v1.20.16...v1.20.17) (2024-07-03)

### Performance Improvements

* 创建dns解析后，强制等待60s ([f47b35f](https://github.com/certd/certd/commit/f47b35f6d5bd7d675005c3e286b7e9a029201f8b))
* 文件上传提示由cert.crt改为cert.pem ([a09b0e4](https://github.com/certd/certd/commit/a09b0e48c176f3ed763791bd50322c29729f7c1c))
* 优化cname verify ([eba333d](https://github.com/certd/certd/commit/eba333de7a5b5ef4b0b7eaa904f578720102fa61))

## [1.20.16](https://github.com/certd/certd/compare/v1.20.15...v1.20.16) (2024-07-01)

### Bug Fixes

* 修复配置了cdn cname后申请失败的bug ([4a5fa76](https://github.com/certd/certd/commit/4a5fa767edc347d03d29a467e86c9a4d70b0220c))

## [1.20.15](https://github.com/certd/certd/compare/v1.20.14...v1.20.15) (2024-06-28)

### Bug Fixes

* 修复无法强制取消任务的bug ([9cc01db](https://github.com/certd/certd/commit/9cc01db1d569a5c45bb3e731f35d85df324a8e62))

### Performance Improvements

* 腾讯云dns provider 支持腾讯云的accessId ([e0eb3a4](https://github.com/certd/certd/commit/e0eb3a441384d474fe2923c69b25318264bdc9df))
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
* ssh登录支持openssh格式私钥、支持私钥密码 ([5c2c508](https://github.com/certd/certd/commit/5c2c50839a9076004f9034d754ac6deb531acdfb))

## [1.20.12](https://github.com/certd/certd/compare/v1.20.10...v1.20.12) (2024-06-17)

### Bug Fixes

* 修复aliyun域名超过100个找不到域名的bug ([5b1494b](https://github.com/certd/certd/commit/5b1494b3ce93d1026dc56ee741342fbb8bf7be24))

### Performance Improvements

* 增加系统设置，可以关闭自助注册功能 ([20feace](https://github.com/certd/certd/commit/20feacea12d43386540db6a600f391d786be4014))
* 增加cloudflare access token说明 ([934e6e2](https://github.com/certd/certd/commit/934e6e2bd05387cd50ffab95f230933543954098))
* 支持重置管理员密码，忘记密码的补救方案 ([732cbc5](https://github.com/certd/certd/commit/732cbc5e927b526850724594830392b2f10c6705))
* 支持cloudflare域名 ([fbb9a47](https://github.com/certd/certd/commit/fbb9a47e8f7bb805289b9ee64bd46ffee0f01c06))

## [1.20.10](https://github.com/certd/certd/compare/v1.20.9...v1.20.10) (2024-05-30)

### Bug Fixes

* 增加权限相关helper说明 ([83e4083](https://github.com/certd/certd/commit/83e40836ebff10bec60efe8933183e1ba1c22bf9))
* 增加权限相关helper说明 ([4304c94](https://github.com/certd/certd/commit/4304c9443ad9248f63dd6d8c512d8d6f32f90d37))

### Performance Improvements

* 上传到主机插件支持复制到本机路径 ([92446c3](https://github.com/certd/certd/commit/92446c339936f98f08f654b8971a7393d8435224))
* 优化文件下载包名 ([d9eb927](https://github.com/certd/certd/commit/d9eb927b0a1445feab08b1958aa9ea80637a5ae6))
* 增加任务复制功能 ([39ad759](https://github.com/certd/certd/commit/39ad7597fa0e19cc1f7631bbd6fea0a9e05a62c9))

## [1.20.9](https://github.com/certd/certd/compare/v1.20.8...v1.20.9) (2024-03-22)

**Note:** Version bump only for package root

## [1.20.8](https://github.com/certd/certd/compare/v1.20.7...v1.20.8) (2024-03-22)

**Note:** Version bump only for package root

## [1.20.7](https://github.com/certd/certd/compare/v1.20.6...v1.20.7) (2024-03-22)

**Note:** Version bump only for package root

## [1.20.6](https://github.com/certd/certd/compare/v1.20.5...v1.20.6) (2024-03-21)

### Bug Fixes

* 调整按钮图标到居中位置 ([836d18f](https://github.com/certd/certd/commit/836d18f07e22d00faf2f213bc3301a6672b5bafc))

### Performance Improvements

* 插件贡献文档及示例 ([72fb20a](https://github.com/certd/certd/commit/72fb20abf3ba5bdd862575d2907703a52fd7eb17))

## [1.20.5](https://github.com/certd/certd/compare/v1.20.2...v1.20.5) (2024-03-11)

### Bug Fixes

* 修复腾讯云cdn部署无法选择端点的bug ([154409b](https://github.com/certd/certd/commit/154409b1dfee3ea1caae740ad9c1f99a6e7a9814))

## [1.20.2](https://github.com/certd/certd/compare/v1.2.1...v1.20.2) (2024-02-28)

### Bug Fixes

* 临时修复阿里云domainlist接口返回域名列表不全的问题，后续还需要增加翻页查询 ([849c145](https://github.com/certd/certd/commit/849c145926984762bd9dbec87bd91cd047fc0855))

## [1.2.1](https://github.com/certd/certd/compare/v1.2.0...v1.2.1) (2023-12-12)

### Bug Fixes

* 修复邮箱设置无效的bug ([aaa3224](https://github.com/certd/certd/commit/aaa322464d0f65e924d1850995540d396ee24d25))

**Note:** Version bump only for package root

# [1.2.0](https://github.com/certd/certd/compare/v1.1.6...v1.2.0) (2023-10-27)

* 🔱: [client] sync upgrade with 2 commits [trident-sync] ([aa3207f](https://github.com/certd/certd/commit/aa3207fca5f15f7c3da789989d99c8ae7d1c4551))

### BREAKING CHANGES

* search支持自定义布局，search.layout、search.collapse转移到 search.container之下。如果想使用原来的search组件，请配置search.is=fs-search-v1

## [1.1.6](https://github.com/certd/certd/compare/v1.1.5...v1.1.6) (2023-07-10)

### Bug Fixes

* 修复上传证书到腾讯云失败的bug ([e950322](https://github.com/certd/certd/commit/e950322232e19d1263b8552eefa5b0150fd7864e))

## [1.1.5](https://github.com/certd/certd/compare/v1.1.4...v1.1.5) (2023-07-03)

**Note:** Version bump only for package root

## [1.1.4](https://github.com/certd/certd/compare/v1.1.3...v1.1.4) (2023-07-03)

### Bug Fixes

* 成功图标转动的问题 ([f87eee3](https://github.com/certd/certd/commit/f87eee3b9ff1ef9874e79a81fe0ed7104cb9ee8c))

### Performance Improvements

* cancel task ([bc65c0a](https://github.com/certd/certd/commit/bc65c0a786360c087fe95cad93ec6a87804cc5ee))
* flush log ([891a43a](https://github.com/certd/certd/commit/891a43ae6716ff98ed06643f7da2e35199ee195c))
* flush logger ([91be682](https://github.com/certd/certd/commit/91be6826b902e0f302b1a6cbdb1d24e15914c18d))
* timeout ([3eeb1f7](https://github.com/certd/certd/commit/3eeb1f77aa2922f3545f3d2067f561d95621d54f))

## [1.1.3](https://github.com/certd/certd/compare/v1.1.2...v1.1.3) (2023-07-03)

**Note:** Version bump only for package root

## [1.1.2](https://github.com/certd/certd/compare/v1.1.1...v1.1.2) (2023-07-03)

**Note:** Version bump only for package root

## [1.1.1](https://github.com/certd/certd/compare/v1.1.0...v1.1.1) (2023-06-28)

**Note:** Version bump only for package root

# [1.1.0](https://github.com/certd/certd/compare/v1.0.6...v1.1.0) (2023-06-28)

### Bug Fixes

* 修复access选择类型trigger ([2851a33](https://github.com/certd/certd/commit/2851a33eb2510f038fadb55da29512597a4ba512))

### Features

* 权限控制 ([27a4c81](https://github.com/certd/certd/commit/27a4c81c6d70e70abb3892c3ea58d4719988808a))
* 邮件通知 ([937e3fa](https://github.com/certd/certd/commit/937e3fac19cd03b8aa91db8ba03fda7fcfbacea2))
* cert download ([5a51c14](https://github.com/certd/certd/commit/5a51c14de521cb8075a80d2ae41a16e6d5281259))
* config  merge ([fdc25dc](https://github.com/certd/certd/commit/fdc25dc0d795555cffacc4572648ec158988fbbb))
* save files ([99522fb](https://github.com/certd/certd/commit/99522fb49adb42c1dfdf7bec3dd52d641158285b))
* save files ([671d273](https://github.com/certd/certd/commit/671d273e2f9136d16896536b0ca127cf372f1619))

## [1.0.6](https://github.com/certd/certd/compare/v1.0.5...v1.0.6) (2023-05-25)

**Note:** Version bump only for package root

## [1.0.5](https://github.com/certd/certd/compare/v1.0.4...v1.0.5) (2023-05-25)

**Note:** Version bump only for package root

## [1.0.4](https://github.com/certd/certd/compare/v1.0.3...v1.0.4) (2023-05-25)

**Note:** Version bump only for package root

## [1.0.3](https://github.com/certd/certd/compare/v1.0.2...v1.0.3) (2023-05-25)

**Note:** Version bump only for package root

## [1.0.2](https://github.com/certd/certd/compare/v1.0.1...v1.0.2) (2023-05-24)

**Note:** Version bump only for package root

## [1.0.1](https://github.com/certd/certd/compare/v1.0.0...v1.0.1) (2023-05-24)

**Note:** Version bump only for package root
