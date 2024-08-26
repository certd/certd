# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [1.24.0](https://github.com/certd/certd/compare/v1.23.1...v1.24.0) (2024-08-25)

### Bug Fixes

* 修复成功后跳过之后丢失腾讯云证书id的bug ([37eb762](https://github.com/certd/certd/commit/37eb762afe25c5896b75dee25f32809f8426e7b7))
* 修复创建流水线后立即运行时报no id错误的bug ([17ead54](https://github.com/certd/certd/commit/17ead547aab25333603980304aa3aad3db1f73d5))
* 修复使用代理的情况下申请证书失败的bug ([95122e2](https://github.com/certd/certd/commit/95122e28609333f4df55c266e5434897954c0fb3))

### Features

* 支持ECC类型 ([a7424e0](https://github.com/certd/certd/commit/a7424e02f5c7e02ac1688791040785920ce67473))

### Performance Improvements

* 更新k8s底层api库 ([746bb9d](https://github.com/certd/certd/commit/746bb9d385e2f397daef4976eca1d4782a2f5ebd))
* 优化成功后跳过的提示 ([7b451bb](https://github.com/certd/certd/commit/7b451bbf6e6337507f4627b5a845f5bd96ab4f7b))
* 优化证书申请成功率 ([968c469](https://github.com/certd/certd/commit/968c4690a07f69c08dcb3d3a494da4e319627345))

## [1.23.1](https://github.com/certd/certd/compare/v1.23.0...v1.23.1) (2024-08-06)

### Performance Improvements

* 优化插件字段的default value ([24c7be2](https://github.com/certd/certd/commit/24c7be2c9cb39c14f7a97b674127c88033280b02))

## [1.22.8](https://github.com/certd/certd/compare/v1.22.7...v1.22.8) (2024-08-05)

**Note:** Version bump only for package @certd/plugin-cert

## [1.22.7](https://github.com/certd/certd/compare/v1.22.6...v1.22.7) (2024-08-04)

**Note:** Version bump only for package @certd/plugin-cert

## [1.22.6](https://github.com/certd/certd/compare/v1.22.5...v1.22.6) (2024-08-03)

### Performance Improvements

* 流水线支持名称模糊查询 ([59897c4](https://github.com/certd/certd/commit/59897c4ceae992ebe2972ca9e8f9196616ffdfd7))

## [1.22.5](https://github.com/certd/certd/compare/v1.22.4...v1.22.5) (2024-07-26)

**Note:** Version bump only for package @certd/plugin-cert

## [1.22.4](https://github.com/certd/certd/compare/v1.22.3...v1.22.4) (2024-07-26)

### Performance Improvements

* 证书申请支持反向代理，letsencrypt无法访问时的备用方案 ([b7b5df0](https://github.com/certd/certd/commit/b7b5df0587e0f7ea288c1b2af6f87211f207395f))

## [1.22.3](https://github.com/certd/certd/compare/v1.22.2...v1.22.3) (2024-07-25)

**Note:** Version bump only for package @certd/plugin-cert

## [1.22.2](https://github.com/certd/certd/compare/v1.22.1...v1.22.2) (2024-07-23)

**Note:** Version bump only for package @certd/plugin-cert

## [1.22.1](https://github.com/certd/certd/compare/v1.22.0...v1.22.1) (2024-07-20)

### Performance Improvements

* 创建证书任务可以选择lege插件 ([affef13](https://github.com/certd/certd/commit/affef130378030c517250c58a4e787b0fc85d7d1))

# [1.22.0](https://github.com/certd/certd/compare/v1.21.2...v1.22.0) (2024-07-19)

### Features

* 升级midway，支持esm ([485e603](https://github.com/certd/certd/commit/485e603b5165c28bc08694997726eaf2a585ebe7))
* 支持lego，海量DNS提供商 ([0bc6d0a](https://github.com/certd/certd/commit/0bc6d0a211920fb0084d705e1db67ee1e7262c44))

## [1.21.2](https://github.com/certd/certd/compare/v1.21.1...v1.21.2) (2024-07-08)

### Performance Improvements

* 申请证书时可以选择跳过本地dns校验 ([fe91d94](https://github.com/certd/certd/commit/fe91d94090d22ed0a3ea753ba74dfaa1bf057c17))

## [1.21.1](https://github.com/certd/certd/compare/v1.21.0...v1.21.1) (2024-07-08)

### Performance Improvements

* 说明优化，默认值优化 ([970c7fd](https://github.com/certd/certd/commit/970c7fd8a0f557770e973d8462ee5684ef742810))

# [1.21.0](https://github.com/certd/certd/compare/v1.20.17...v1.21.0) (2024-07-03)

### Features

* 支持zero ssl ([eade2c2](https://github.com/certd/certd/commit/eade2c2b681569f03e9cd466e7d5bcd6703ed492))

## [1.20.17](https://github.com/certd/certd/compare/v1.20.16...v1.20.17) (2024-07-03)

### Performance Improvements

* 优化cname verify ([eba333d](https://github.com/certd/certd/commit/eba333de7a5b5ef4b0b7eaa904f578720102fa61))

## [1.20.16](https://github.com/certd/certd/compare/v1.20.15...v1.20.16) (2024-07-01)

### Bug Fixes

* 修复配置了cdn cname后申请失败的bug ([4a5fa76](https://github.com/certd/certd/commit/4a5fa767edc347d03d29a467e86c9a4d70b0220c))

## [1.20.15](https://github.com/certd/certd/compare/v1.20.14...v1.20.15) (2024-06-28)

### Performance Improvements

* 腾讯云dns provider 支持腾讯云的accessId ([e0eb3a4](https://github.com/certd/certd/commit/e0eb3a441384d474fe2923c69b25318264bdc9df))

## [1.20.14](https://github.com/certd/certd/compare/v1.20.13...v1.20.14) (2024-06-23)

**Note:** Version bump only for package @certd/plugin-cert

## [1.20.13](https://github.com/certd/certd/compare/v1.20.12...v1.20.13) (2024-06-18)

**Note:** Version bump only for package @certd/plugin-cert

## [1.20.12](https://github.com/certd/certd/compare/v1.20.10...v1.20.12) (2024-06-17)

### Bug Fixes

* 修复aliyun域名超过100个找不到域名的bug ([5b1494b](https://github.com/certd/certd/commit/5b1494b3ce93d1026dc56ee741342fbb8bf7be24))

### Performance Improvements

* 支持cloudflare域名 ([fbb9a47](https://github.com/certd/certd/commit/fbb9a47e8f7bb805289b9ee64bd46ffee0f01c06))

## [1.20.10](https://github.com/certd/certd/compare/v1.20.9...v1.20.10) (2024-05-30)

### Performance Improvements

* 上传到主机插件支持复制到本机路径 ([92446c3](https://github.com/certd/certd/commit/92446c339936f98f08f654b8971a7393d8435224))
* 优化文件下载包名 ([d9eb927](https://github.com/certd/certd/commit/d9eb927b0a1445feab08b1958aa9ea80637a5ae6))

## [1.20.9](https://github.com/certd/certd/compare/v1.20.8...v1.20.9) (2024-03-22)

**Note:** Version bump only for package @certd/plugin-cert

## [1.20.8](https://github.com/certd/certd/compare/v1.20.7...v1.20.8) (2024-03-22)

**Note:** Version bump only for package @certd/plugin-cert

## [1.20.7](https://github.com/certd/certd/compare/v1.20.6...v1.20.7) (2024-03-22)

**Note:** Version bump only for package @certd/plugin-cert

## [1.20.6](https://github.com/certd/certd/compare/v1.20.5...v1.20.6) (2024-03-21)

### Performance Improvements

* 插件贡献文档及示例 ([72fb20a](https://github.com/certd/certd/commit/72fb20abf3ba5bdd862575d2907703a52fd7eb17))

## [1.20.5](https://github.com/certd/certd/compare/v1.20.2...v1.20.5) (2024-03-11)

**Note:** Version bump only for package @certd/plugin-cert

## [1.20.2](https://github.com/certd/certd/compare/v1.2.1...v1.20.2) (2024-02-28)

**Note:** Version bump only for package @certd/plugin-cert

## [1.2.1](https://github.com/certd/certd/compare/v1.2.0...v1.2.1) (2023-12-12)

**Note:** Version bump only for package @certd/plugin-cert

**Note:** Version bump only for package @certd/plugin-cert

# [1.2.0](https://github.com/certd/certd/compare/v1.1.6...v1.2.0) (2023-10-27)

**Note:** Version bump only for package @certd/plugin-cert

## [1.1.6](https://github.com/certd/certd/compare/v1.1.5...v1.1.6) (2023-07-10)

**Note:** Version bump only for package @certd/plugin-cert

## [1.1.5](https://github.com/certd/certd/compare/v1.1.4...v1.1.5) (2023-07-03)

**Note:** Version bump only for package @certd/plugin-cert

## [1.1.4](https://github.com/certd/certd/compare/v1.1.3...v1.1.4) (2023-07-03)

### Performance Improvements

* timeout ([3eeb1f7](https://github.com/certd/certd/commit/3eeb1f77aa2922f3545f3d2067f561d95621d54f))

## [1.1.3](https://github.com/certd/certd/compare/v1.1.2...v1.1.3) (2023-07-03)

**Note:** Version bump only for package @certd/plugin-cert

## [1.1.2](https://github.com/certd/certd/compare/v1.1.1...v1.1.2) (2023-07-03)

**Note:** Version bump only for package @certd/plugin-cert

## [1.1.1](https://github.com/certd/certd/compare/v1.1.0...v1.1.1) (2023-06-28)

**Note:** Version bump only for package @certd/plugin-cert

# [1.1.0](https://github.com/certd/certd/compare/v1.0.6...v1.1.0) (2023-06-28)

### Bug Fixes

* 修复access选择类型trigger ([2851a33](https://github.com/certd/certd/commit/2851a33eb2510f038fadb55da29512597a4ba512))

### Features

* save files ([99522fb](https://github.com/certd/certd/commit/99522fb49adb42c1dfdf7bec3dd52d641158285b))
* save files ([671d273](https://github.com/certd/certd/commit/671d273e2f9136d16896536b0ca127cf372f1619))

## [1.0.6](https://github.com/certd/certd/compare/v1.0.5...v1.0.6) (2023-05-25)

**Note:** Version bump only for package @certd/plugin-cert

## [1.0.5](https://github.com/certd/certd/compare/v1.0.4...v1.0.5) (2023-05-25)

**Note:** Version bump only for package @certd/plugin-cert

## [1.0.4](https://github.com/certd/certd/compare/v1.0.3...v1.0.4) (2023-05-25)

**Note:** Version bump only for package @certd/plugin-cert

## [1.0.3](https://github.com/certd/certd/compare/v1.0.2...v1.0.3) (2023-05-25)

**Note:** Version bump only for package @certd/plugin-cert

## [1.0.2](https://github.com/certd/certd/compare/v1.0.1...v1.0.2) (2023-05-24)

**Note:** Version bump only for package @certd/plugin-cert

## [1.0.1](https://github.com/certd/certd/compare/v1.0.0...v1.0.1) (2023-05-24)

**Note:** Version bump only for package @certd/plugin-cert
