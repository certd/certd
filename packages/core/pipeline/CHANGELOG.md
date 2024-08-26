# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [1.24.0](https://github.com/certd/certd/compare/v1.23.1...v1.24.0) (2024-08-25)

### Bug Fixes

* 修复成功后跳过之后丢失腾讯云证书id的bug ([37eb762](https://github.com/certd/certd/commit/37eb762afe25c5896b75dee25f32809f8426e7b7))
* 修复执行日志没有清理的bug ([22a3363](https://github.com/certd/certd/commit/22a336370a88a7df2a23c967043bae153da71ed5))

### Features

* 支持google证书申请（需要使用代理） ([a593056](https://github.com/certd/certd/commit/a593056e79e99dd6a74f75b5eab621af7248cfbe))

### Performance Improvements

* 优化成功后跳过的提示 ([7b451bb](https://github.com/certd/certd/commit/7b451bbf6e6337507f4627b5a845f5bd96ab4f7b))
* 优化证书申请成功率 ([968c469](https://github.com/certd/certd/commit/968c4690a07f69c08dcb3d3a494da4e319627345))
* email proxy ([453f1ba](https://github.com/certd/certd/commit/453f1baa0b9eb0f648aa1b71ccf5a95b202ce13f))

## [1.23.1](https://github.com/certd/certd/compare/v1.23.0...v1.23.1) (2024-08-06)

**Note:** Version bump only for package @certd/pipeline

## [1.22.8](https://github.com/certd/certd/compare/v1.22.7...v1.22.8) (2024-08-05)

### Performance Improvements

* 优化pipeline删除时，删除其他history ([b425203](https://github.com/certd/certd/commit/b4252033d56a9ad950f3e204ff021497c3978015))

## [1.22.7](https://github.com/certd/certd/compare/v1.22.6...v1.22.7) (2024-08-04)

**Note:** Version bump only for package @certd/pipeline

## [1.22.6](https://github.com/certd/certd/compare/v1.22.5...v1.22.6) (2024-08-03)

### Bug Fixes

* 修复在相同的cron时偶尔无法触发定时任务的bug ([680941a](https://github.com/certd/certd/commit/680941af119619006b592e3ab6fb112cb5556a8b))

### Performance Improvements

* 流水线支持名称模糊查询 ([59897c4](https://github.com/certd/certd/commit/59897c4ceae992ebe2972ca9e8f9196616ffdfd7))
* 优化前置任务输出为空的提示 ([6ed1e18](https://github.com/certd/certd/commit/6ed1e18c7d9c46d964ecc6abc90f3908297b7632))

## [1.22.5](https://github.com/certd/certd/compare/v1.22.4...v1.22.5) (2024-07-26)

**Note:** Version bump only for package @certd/pipeline

## [1.22.3](https://github.com/certd/certd/compare/v1.22.2...v1.22.3) (2024-07-25)

**Note:** Version bump only for package @certd/pipeline

## [1.22.2](https://github.com/certd/certd/compare/v1.22.1...v1.22.2) (2024-07-23)

**Note:** Version bump only for package @certd/pipeline

## [1.22.1](https://github.com/certd/certd/compare/v1.22.0...v1.22.1) (2024-07-20)

### Performance Improvements

* 创建证书任务可以选择lege插件 ([affef13](https://github.com/certd/certd/commit/affef130378030c517250c58a4e787b0fc85d7d1))

# [1.22.0](https://github.com/certd/certd/compare/v1.21.2...v1.22.0) (2024-07-19)

### Features

* 升级midway，支持esm ([485e603](https://github.com/certd/certd/commit/485e603b5165c28bc08694997726eaf2a585ebe7))
* 支持lego，海量DNS提供商 ([0bc6d0a](https://github.com/certd/certd/commit/0bc6d0a211920fb0084d705e1db67ee1e7262c44))
* 支持postgresql ([3b19bfb](https://github.com/certd/certd/commit/3b19bfb4291e89064b3b407a80dae092d54747d5))

## [1.21.2](https://github.com/certd/certd/compare/v1.21.1...v1.21.2) (2024-07-08)

**Note:** Version bump only for package @certd/pipeline

## [1.21.1](https://github.com/certd/certd/compare/v1.21.0...v1.21.1) (2024-07-08)

**Note:** Version bump only for package @certd/pipeline

# [1.21.0](https://github.com/certd/certd/compare/v1.20.17...v1.21.0) (2024-07-03)

**Note:** Version bump only for package @certd/pipeline

## [1.20.17](https://github.com/certd/certd/compare/v1.20.16...v1.20.17) (2024-07-03)

**Note:** Version bump only for package @certd/pipeline

## [1.20.16](https://github.com/certd/certd/compare/v1.20.15...v1.20.16) (2024-07-01)

**Note:** Version bump only for package @certd/pipeline

## [1.20.15](https://github.com/certd/certd/compare/v1.20.14...v1.20.15) (2024-06-28)

**Note:** Version bump only for package @certd/pipeline

## [1.20.14](https://github.com/certd/certd/compare/v1.20.13...v1.20.14) (2024-06-23)

**Note:** Version bump only for package @certd/pipeline

## [1.20.13](https://github.com/certd/certd/compare/v1.20.12...v1.20.13) (2024-06-18)

**Note:** Version bump only for package @certd/pipeline

## [1.20.12](https://github.com/certd/certd/compare/v1.20.10...v1.20.12) (2024-06-17)

### Performance Improvements

* 支持cloudflare域名 ([fbb9a47](https://github.com/certd/certd/commit/fbb9a47e8f7bb805289b9ee64bd46ffee0f01c06))

## [1.20.10](https://github.com/certd/certd/compare/v1.20.9...v1.20.10) (2024-05-30)

### Performance Improvements

* 优化文件下载包名 ([d9eb927](https://github.com/certd/certd/commit/d9eb927b0a1445feab08b1958aa9ea80637a5ae6))

## [1.20.9](https://github.com/certd/certd/compare/v1.20.8...v1.20.9) (2024-03-22)

**Note:** Version bump only for package @certd/pipeline

## [1.20.8](https://github.com/certd/certd/compare/v1.20.7...v1.20.8) (2024-03-22)

**Note:** Version bump only for package @certd/pipeline

## [1.20.7](https://github.com/certd/certd/compare/v1.20.6...v1.20.7) (2024-03-22)

**Note:** Version bump only for package @certd/pipeline

## [1.20.6](https://github.com/certd/certd/compare/v1.20.5...v1.20.6) (2024-03-21)

### Performance Improvements

* 插件贡献文档及示例 ([72fb20a](https://github.com/certd/certd/commit/72fb20abf3ba5bdd862575d2907703a52fd7eb17))

## [1.20.5](https://github.com/certd/certd/compare/v1.20.2...v1.20.5) (2024-03-11)

**Note:** Version bump only for package @certd/pipeline

## [1.20.2](https://github.com/certd/certd/compare/v1.2.1...v1.20.2) (2024-02-28)

**Note:** Version bump only for package @certd/pipeline

## [1.2.1](https://github.com/certd/certd/compare/v1.2.0...v1.2.1) (2023-12-12)

**Note:** Version bump only for package @certd/pipeline

**Note:** Version bump only for package @certd/pipeline

# [1.2.0](https://github.com/certd/certd/compare/v1.1.6...v1.2.0) (2023-10-27)

**Note:** Version bump only for package @certd/pipeline

## [1.1.6](https://github.com/certd/certd/compare/v1.1.5...v1.1.6) (2023-07-10)

### Bug Fixes

* 修复上传证书到腾讯云失败的bug ([e950322](https://github.com/certd/certd/commit/e950322232e19d1263b8552eefa5b0150fd7864e))

## [1.1.5](https://github.com/certd/certd/compare/v1.1.4...v1.1.5) (2023-07-03)

**Note:** Version bump only for package @certd/pipeline

## [1.1.4](https://github.com/certd/certd/compare/v1.1.3...v1.1.4) (2023-07-03)

### Performance Improvements

* cancel task ([bc65c0a](https://github.com/certd/certd/commit/bc65c0a786360c087fe95cad93ec6a87804cc5ee))
* flush log ([891a43a](https://github.com/certd/certd/commit/891a43ae6716ff98ed06643f7da2e35199ee195c))
* flush logger ([91be682](https://github.com/certd/certd/commit/91be6826b902e0f302b1a6cbdb1d24e15914c18d))
* timeout ([3eeb1f7](https://github.com/certd/certd/commit/3eeb1f77aa2922f3545f3d2067f561d95621d54f))

## [1.1.3](https://github.com/certd/certd/compare/v1.1.2...v1.1.3) (2023-07-03)

**Note:** Version bump only for package @certd/pipeline

## [1.1.2](https://github.com/certd/certd/compare/v1.1.1...v1.1.2) (2023-07-03)

**Note:** Version bump only for package @certd/pipeline

## [1.1.1](https://github.com/certd/certd/compare/v1.1.0...v1.1.1) (2023-06-28)

**Note:** Version bump only for package @certd/pipeline

# [1.1.0](https://github.com/certd/certd/compare/v1.0.6...v1.1.0) (2023-06-28)

### Bug Fixes

* 修复access选择类型trigger ([2851a33](https://github.com/certd/certd/commit/2851a33eb2510f038fadb55da29512597a4ba512))

### Features

* 邮件通知 ([937e3fa](https://github.com/certd/certd/commit/937e3fac19cd03b8aa91db8ba03fda7fcfbacea2))
* cert download ([5a51c14](https://github.com/certd/certd/commit/5a51c14de521cb8075a80d2ae41a16e6d5281259))
* save files ([99522fb](https://github.com/certd/certd/commit/99522fb49adb42c1dfdf7bec3dd52d641158285b))
* save files ([671d273](https://github.com/certd/certd/commit/671d273e2f9136d16896536b0ca127cf372f1619))

## [1.0.6](https://github.com/certd/certd/compare/v1.0.5...v1.0.6) (2023-05-25)

**Note:** Version bump only for package @certd/pipeline

## [1.0.5](https://github.com/certd/certd/compare/v1.0.4...v1.0.5) (2023-05-25)

**Note:** Version bump only for package @certd/pipeline

## [1.0.4](https://github.com/certd/certd/compare/v1.0.3...v1.0.4) (2023-05-25)

**Note:** Version bump only for package @certd/pipeline

## [1.0.3](https://github.com/certd/certd/compare/v1.0.2...v1.0.3) (2023-05-25)

**Note:** Version bump only for package @certd/pipeline

## [1.0.2](https://github.com/certd/certd/compare/v1.0.1...v1.0.2) (2023-05-24)

**Note:** Version bump only for package @certd/pipeline

## [1.0.1](https://github.com/certd/certd/compare/v1.0.0...v1.0.1) (2023-05-24)

**Note:** Version bump only for package @certd/pipeline
