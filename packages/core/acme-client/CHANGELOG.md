# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.41.4](https://github.com/publishlab/node-acme-client/compare/v1.41.3...v1.41.4) (2026-06-14)

**Note:** Version bump only for package @certd/acme-client

## [1.41.3](https://github.com/publishlab/node-acme-client/compare/v1.41.2...v1.41.3) (2026-06-11)

### Bug Fixes

* 修复litessl无法申请证书，报authorization must be pending 错误的问题 ([d6cd9d1](https://github.com/publishlab/node-acme-client/commit/d6cd9d136d2812b2335917305f36d6d9414507ad))

## [1.41.2](https://github.com/publishlab/node-acme-client/compare/v1.41.1...v1.41.2) (2026-06-10)

**Note:** Version bump only for package @certd/acme-client

## [1.41.1](https://github.com/publishlab/node-acme-client/compare/v1.41.0...v1.41.1) (2026-06-05)

**Note:** Version bump only for package @certd/acme-client

# [1.41.0](https://github.com/publishlab/node-acme-client/compare/v1.40.5...v1.41.0) (2026-06-04)

### Bug Fixes

* 修复阿里云证书订单orderid 选择出错的问题 ([41254d1](https://github.com/publishlab/node-acme-client/commit/41254d10b748a2d3e6ba43c7e11411650c748d1b))

### Features

* 支持dns-persist-01持久化验证方式申请证书，优化Acme账号的存储方式 ([67b05e2](https://github.com/publishlab/node-acme-client/commit/67b05e2d75e96b9f855e1ca0b3d0d8d03b92d8e6))

## [1.40.5](https://github.com/publishlab/node-acme-client/compare/v1.40.4...v1.40.5) (2026-05-26)

### Bug Fixes

* 修复阿里云证书订单orderid 选择出错的问题 ([af9047b](https://github.com/publishlab/node-acme-client/commit/af9047bf3c54ce71b11727ccc6220288ed1f57be))

## [1.40.4](https://github.com/publishlab/node-acme-client/compare/v1.40.3...v1.40.4) (2026-05-24)

**Note:** Version bump only for package @certd/acme-client

## [1.40.3](https://github.com/publishlab/node-acme-client/compare/v1.40.2...v1.40.3) (2026-05-21)

**Note:** Version bump only for package @certd/acme-client

## [1.40.2](https://github.com/publishlab/node-acme-client/compare/v1.40.1...v1.40.2) (2026-05-19)

**Note:** Version bump only for package @certd/acme-client

## [1.40.1](https://github.com/publishlab/node-acme-client/compare/v1.40.0...v1.40.1) (2026-05-18)

**Note:** Version bump only for package @certd/acme-client

# [1.40.0](https://github.com/publishlab/node-acme-client/compare/v1.39.16...v1.40.0) (2026-05-14)

**Note:** Version bump only for package @certd/acme-client

## [1.39.16](https://github.com/publishlab/node-acme-client/compare/v1.39.15...v1.39.16) (2026-05-13)

**Note:** Version bump only for package @certd/acme-client

## [1.39.15](https://github.com/publishlab/node-acme-client/compare/v1.39.14...v1.39.15) (2026-05-13)

### Performance Improvements

* 优化申请时报错日志增加对应域名打印 ([d6e9e59](https://github.com/publishlab/node-acme-client/commit/d6e9e5987bd52ea12ee18745615486eadd4c87ff))

## [1.39.14](https://github.com/publishlab/node-acme-client/compare/v1.39.13...v1.39.14) (2026-05-11)

**Note:** Version bump only for package @certd/acme-client

## [1.39.13](https://github.com/publishlab/node-acme-client/compare/v1.39.12...v1.39.13) (2026-05-10)

### Performance Improvements

* 重构自动加载模块并优化EAB授权处理 ([4755216](https://github.com/publishlab/node-acme-client/commit/4755216505ad18555a50da9d8008c2207c48df86))

## [1.39.12](https://github.com/publishlab/node-acme-client/compare/v1.39.11...v1.39.12) (2026-04-29)

### Performance Improvements

* 增加权威NS检查开关，某些用户服务器禁止向黑名单NS服务器发请求 ([1aa50cf](https://github.com/publishlab/node-acme-client/commit/1aa50cf53a0deab752f35ec973912e41ab8161b6))

## [1.39.11](https://github.com/publishlab/node-acme-client/compare/v1.39.10...v1.39.11) (2026-04-26)

### Performance Improvements

* 为DNS解析器添加超时配置,避免查询时间过长 ([cc5154e](https://github.com/publishlab/node-acme-client/commit/cc5154e04e87f648111119b4eeb4e3cb4dd6cc41))
* 优化权威域名服务器查询超时时长 ([77db5ec](https://github.com/publishlab/node-acme-client/commit/77db5ecd12c51293e4de178e43ca0067bc70b46d))
* **technitium:** 添加Technitium DNS Server插件支持 ([edeb817](https://github.com/publishlab/node-acme-client/commit/edeb817c39597e4fa73a17ff4ca3f712f0320fec))

## [1.39.10](https://github.com/publishlab/node-acme-client/compare/v1.39.9...v1.39.10) (2026-04-11)

**Note:** Version bump only for package @certd/acme-client

## [1.39.9](https://github.com/publishlab/node-acme-client/compare/v1.39.8...v1.39.9) (2026-04-05)

**Note:** Version bump only for package @certd/acme-client

## [1.39.8](https://github.com/publishlab/node-acme-client/compare/v1.39.7...v1.39.8) (2026-03-31)

**Note:** Version bump only for package @certd/acme-client

## [1.39.7](https://github.com/publishlab/node-acme-client/compare/v1.39.6...v1.39.7) (2026-03-25)

**Note:** Version bump only for package @certd/acme-client

## [1.39.6](https://github.com/publishlab/node-acme-client/compare/v1.39.5...v1.39.6) (2026-03-22)

**Note:** Version bump only for package @certd/acme-client

## [1.39.5](https://github.com/publishlab/node-acme-client/compare/v1.39.4...v1.39.5) (2026-03-18)

**Note:** Version bump only for package @certd/acme-client

## [1.39.4](https://github.com/publishlab/node-acme-client/compare/v1.39.3...v1.39.4) (2026-03-17)

**Note:** Version bump only for package @certd/acme-client

## [1.39.3](https://github.com/publishlab/node-acme-client/compare/v1.39.2...v1.39.3) (2026-03-17)

**Note:** Version bump only for package @certd/acme-client

## [1.39.2](https://github.com/publishlab/node-acme-client/compare/v1.39.1...v1.39.2) (2026-03-16)

### Bug Fixes

* 修复京东云报错不准确的bug ([10dd89a](https://github.com/publishlab/node-acme-client/commit/10dd89ae62e438a211a15e729559af823a096583))

## [1.39.1](https://github.com/publishlab/node-acme-client/compare/v1.39.0...v1.39.1) (2026-03-09)

**Note:** Version bump only for package @certd/acme-client

# [1.39.0](https://github.com/publishlab/node-acme-client/compare/v1.38.12...v1.39.0) (2026-03-07)

**Note:** Version bump only for package @certd/acme-client

## [1.38.12](https://github.com/publishlab/node-acme-client/compare/v1.38.11...v1.38.12) (2026-02-18)

**Note:** Version bump only for package @certd/acme-client

## [1.38.11](https://github.com/publishlab/node-acme-client/compare/v1.38.10...v1.38.11) (2026-02-16)

**Note:** Version bump only for package @certd/acme-client

## [1.38.10](https://github.com/publishlab/node-acme-client/compare/v1.38.9...v1.38.10) (2026-02-15)

**Note:** Version bump only for package @certd/acme-client

## [1.38.9](https://github.com/publishlab/node-acme-client/compare/v1.38.8...v1.38.9) (2026-02-09)

**Note:** Version bump only for package @certd/acme-client

## [1.38.8](https://github.com/publishlab/node-acme-client/compare/v1.38.7...v1.38.8) (2026-02-06)

### Performance Improvements

* 优化申请证书最大超时时长 ([00f67d8](https://github.com/publishlab/node-acme-client/commit/00f67d86d68f4f83cfafe2fbfeb4af0d86f9d20e))
* 支持设置默认的证书申请地址的反向代理 ([0cfb94b](https://github.com/publishlab/node-acme-client/commit/0cfb94b0ba6a6dc3bb0d0a81a1912068a4e6b6b6))

## [1.38.7](https://github.com/publishlab/node-acme-client/compare/v1.38.6...v1.38.7) (2026-02-05)

### Performance Improvements

* 优化zerossl申请证书稳定性 ([4d86fb3](https://github.com/publishlab/node-acme-client/commit/4d86fb319b81dbf6fa6485982105725b1b066593))

## [1.38.6](https://github.com/publishlab/node-acme-client/compare/v1.38.5...v1.38.6) (2026-02-04)

**Note:** Version bump only for package @certd/acme-client

## [1.38.5](https://github.com/publishlab/node-acme-client/compare/v1.38.4...v1.38.5) (2026-02-02)

### Bug Fixes

* 修复litessl new-nonce报428的bug ([540ef96](https://github.com/publishlab/node-acme-client/commit/540ef967457a7871637cfdb5012ed1fa3261757b))

## [1.38.4](https://github.com/publishlab/node-acme-client/compare/v1.38.3...v1.38.4) (2026-01-31)

**Note:** Version bump only for package @certd/acme-client

## [1.38.3](https://github.com/publishlab/node-acme-client/compare/v1.38.2...v1.38.3) (2026-01-28)

**Note:** Version bump only for package @certd/acme-client

## [1.38.2](https://github.com/publishlab/node-acme-client/compare/v1.38.1...v1.38.2) (2026-01-22)

**Note:** Version bump only for package @certd/acme-client

## [1.38.1](https://github.com/publishlab/node-acme-client/compare/v1.38.0...v1.38.1) (2026-01-15)

**Note:** Version bump only for package @certd/acme-client

# [1.38.0](https://github.com/publishlab/node-acme-client/compare/v1.37.17...v1.38.0) (2026-01-13)

**Note:** Version bump only for package @certd/acme-client

## [1.37.17](https://github.com/publishlab/node-acme-client/compare/v1.37.16...v1.37.17) (2025-12-29)

### Performance Improvements

* aws route53 ([8caab1f](https://github.com/publishlab/node-acme-client/commit/8caab1fd9264df548f467b94202d567107b7a30b))

## [1.37.16](https://github.com/publishlab/node-acme-client/compare/v1.37.15...v1.37.16) (2025-12-15)

### Bug Fixes

* 修复ipv6作为证书域名申请证书校验失败的bug ([e4e16bc](https://github.com/publishlab/node-acme-client/commit/e4e16bc6a65bb082c18ca0590226f0987a47d477))

## [1.37.15](https://github.com/publishlab/node-acme-client/compare/v1.37.14...v1.37.15) (2025-12-06)

**Note:** Version bump only for package @certd/acme-client

## [1.37.14](https://github.com/publishlab/node-acme-client/compare/v1.37.13...v1.37.14) (2025-12-02)

**Note:** Version bump only for package @certd/acme-client

## [1.37.13](https://github.com/publishlab/node-acme-client/compare/v1.37.12...v1.37.13) (2025-12-02)

**Note:** Version bump only for package @certd/acme-client

## [1.37.12](https://github.com/publishlab/node-acme-client/compare/v1.37.11...v1.37.12) (2025-11-29)

### Performance Improvements

* 支持证书颁发机构 LiteSSL ([6be7591](https://github.com/publishlab/node-acme-client/commit/6be75913324e2828d9016eb307ff2d0abbbb2191))

## [1.37.11](https://github.com/publishlab/node-acme-client/compare/v1.37.10...v1.37.11) (2025-11-28)

### Performance Improvements

* ssl.com支持ecc ([b5ec047](https://github.com/publishlab/node-acme-client/commit/b5ec04723db48422f71041f4043002e7f5b450b1))

## [1.37.10](https://github.com/publishlab/node-acme-client/compare/v1.37.9...v1.37.10) (2025-11-19)

**Note:** Version bump only for package @certd/acme-client

## [1.37.9](https://github.com/publishlab/node-acme-client/compare/v1.37.8...v1.37.9) (2025-11-19)

**Note:** Version bump only for package @certd/acme-client

## [1.37.8](https://github.com/publishlab/node-acme-client/compare/v1.37.7...v1.37.8) (2025-11-17)

**Note:** Version bump only for package @certd/acme-client

## [1.37.7](https://github.com/publishlab/node-acme-client/compare/v1.37.6...v1.37.7) (2025-11-12)

### Performance Improvements

* 支持使用letencrypt测试环境申请ip证书 ([86ce00a](https://github.com/publishlab/node-acme-client/commit/86ce00adf92ff98fead87a3eaaa6631036708f47))
* 支持腾讯云teo dns解析 ([1d23dd2](https://github.com/publishlab/node-acme-client/commit/1d23dd2426bd1e4c4dfea0a9e561d665e045ba9d))

## [1.37.6](https://github.com/publishlab/node-acme-client/compare/v1.37.5...v1.37.6) (2025-11-10)

### Performance Improvements

* 支持letencrypt测试环境，支持IP证书？ ([1462cdd](https://github.com/publishlab/node-acme-client/commit/1462cddd1eb347b7ff238286b5c977b29a0591ec))

## [1.37.5](https://github.com/publishlab/node-acme-client/compare/v1.37.4...v1.37.5) (2025-11-08)

**Note:** Version bump only for package @certd/acme-client

## [1.37.4](https://github.com/publishlab/node-acme-client/compare/v1.37.3...v1.37.4) (2025-10-28)

**Note:** Version bump only for package @certd/acme-client

## [1.37.3](https://github.com/publishlab/node-acme-client/compare/v1.37.2...v1.37.3) (2025-10-24)

### Bug Fixes

* 修复并发情况下证书申请日志混乱的bug ([bb2714f](https://github.com/publishlab/node-acme-client/commit/bb2714ff241f9db4a71d805b23a1b0f9f2f6413a))

## [1.37.2](https://github.com/publishlab/node-acme-client/compare/v1.37.1...v1.37.2) (2025-10-14)

### Bug Fixes

* aliyunoss 选择证书接入点选择新加坡无法上传的bug ([e00733a](https://github.com/publishlab/node-acme-client/commit/e00733a34644c23ffe926486b15dc96bf2fa4b57))

## [1.37.1](https://github.com/publishlab/node-acme-client/compare/v1.37.0...v1.37.1) (2025-09-29)

**Note:** Version bump only for package @certd/acme-client

# [1.37.0](https://github.com/publishlab/node-acme-client/compare/v1.36.25...v1.37.0) (2025-09-28)

**Note:** Version bump only for package @certd/acme-client

## [1.36.25](https://github.com/publishlab/node-acme-client/compare/v1.36.24...v1.36.25) (2025-09-27)

**Note:** Version bump only for package @certd/acme-client

## [1.36.24](https://github.com/publishlab/node-acme-client/compare/v1.36.23...v1.36.24) (2025-09-27)

**Note:** Version bump only for package @certd/acme-client

## [1.36.23](https://github.com/publishlab/node-acme-client/compare/v1.36.22...v1.36.23) (2025-09-26)

**Note:** Version bump only for package @certd/acme-client

## [1.36.22](https://github.com/publishlab/node-acme-client/compare/v1.36.21...v1.36.22) (2025-09-23)

**Note:** Version bump only for package @certd/acme-client

## [1.36.21](https://github.com/publishlab/node-acme-client/compare/v1.36.20...v1.36.21) (2025-09-15)

**Note:** Version bump only for package @certd/acme-client

## [1.36.20](https://github.com/publishlab/node-acme-client/compare/v1.36.19...v1.36.20) (2025-09-13)

**Note:** Version bump only for package @certd/acme-client

## [1.36.19](https://github.com/publishlab/node-acme-client/compare/v1.36.18...v1.36.19) (2025-09-05)

### Performance Improvements

* 支持ssl.com证书颁发机构 ([27b6dfa](https://github.com/publishlab/node-acme-client/commit/27b6dfa4d2ab3bddd284c3a34511a72e1a513a4c))

## [1.36.18](https://github.com/publishlab/node-acme-client/compare/v1.36.17...v1.36.18) (2025-08-28)

**Note:** Version bump only for package @certd/acme-client

## [1.36.17](https://github.com/publishlab/node-acme-client/compare/v1.36.16...v1.36.17) (2025-08-17)

**Note:** Version bump only for package @certd/acme-client

## [1.36.16](https://github.com/publishlab/node-acme-client/compare/v1.36.15...v1.36.16) (2025-08-16)

### Performance Improvements

* 部署到百度cdn支持自动获取域名列表选择 ([4e432ed](https://github.com/publishlab/node-acme-client/commit/4e432ed03f4fb564e85a2f284ee26b58400b82f5))

## [1.36.15](https://github.com/publishlab/node-acme-client/compare/v1.36.14...v1.36.15) (2025-08-07)

**Note:** Version bump only for package @certd/acme-client

## [1.36.14](https://github.com/publishlab/node-acme-client/compare/v1.36.13...v1.36.14) (2025-07-28)

**Note:** Version bump only for package @certd/acme-client

## [1.36.13](https://github.com/publishlab/node-acme-client/compare/v1.36.12...v1.36.13) (2025-07-23)

**Note:** Version bump only for package @certd/acme-client

## [1.36.12](https://github.com/publishlab/node-acme-client/compare/v1.36.11...v1.36.12) (2025-07-22)

**Note:** Version bump only for package @certd/acme-client

## [1.36.11](https://github.com/publishlab/node-acme-client/compare/v1.36.10...v1.36.11) (2025-07-22)

**Note:** Version bump only for package @certd/acme-client

## [1.36.10](https://github.com/publishlab/node-acme-client/compare/v1.36.9...v1.36.10) (2025-07-18)

**Note:** Version bump only for package @certd/acme-client

## [1.36.9](https://github.com/publishlab/node-acme-client/compare/v1.36.7...v1.36.9) (2025-07-15)

**Note:** Version bump only for package @certd/acme-client

## [1.36.7](https://github.com/publishlab/node-acme-client/compare/v1.36.6...v1.36.7) (2025-07-15)

**Note:** Version bump only for package @certd/acme-client

## [1.36.6](https://github.com/publishlab/node-acme-client/compare/v1.36.5...v1.36.6) (2025-07-14)

**Note:** Version bump only for package @certd/acme-client

## [1.36.5](https://github.com/publishlab/node-acme-client/compare/v1.36.4...v1.36.5) (2025-07-11)

**Note:** Version bump only for package @certd/acme-client

## [1.36.4](https://github.com/publishlab/node-acme-client/compare/v1.36.3...v1.36.4) (2025-07-10)

**Note:** Version bump only for package @certd/acme-client

## [1.36.3](https://github.com/publishlab/node-acme-client/compare/v1.36.2...v1.36.3) (2025-07-07)

**Note:** Version bump only for package @certd/acme-client

## [1.36.2](https://github.com/publishlab/node-acme-client/compare/v1.36.1...v1.36.2) (2025-07-06)

**Note:** Version bump only for package @certd/acme-client

## [1.36.1](https://github.com/publishlab/node-acme-client/compare/v1.36.0...v1.36.1) (2025-07-02)

**Note:** Version bump only for package @certd/acme-client

# [1.36.0](https://github.com/publishlab/node-acme-client/compare/v1.35.5...v1.36.0) (2025-07-01)

**Note:** Version bump only for package @certd/acme-client

## [1.35.5](https://github.com/publishlab/node-acme-client/compare/v1.35.4...v1.35.5) (2025-06-20)

**Note:** Version bump only for package @certd/acme-client

## [1.35.4](https://github.com/publishlab/node-acme-client/compare/v1.35.3...v1.35.4) (2025-06-13)

**Note:** Version bump only for package @certd/acme-client

## [1.35.3](https://github.com/publishlab/node-acme-client/compare/v1.35.2...v1.35.3) (2025-06-12)

**Note:** Version bump only for package @certd/acme-client

## [1.35.2](https://github.com/publishlab/node-acme-client/compare/v1.35.1...v1.35.2) (2025-06-09)

**Note:** Version bump only for package @certd/acme-client

## [1.35.1](https://github.com/publishlab/node-acme-client/compare/v1.35.0...v1.35.1) (2025-06-07)

### Performance Improvements

* 证书申请支持letencrypt profile选项 ([2eb0e54](https://github.com/publishlab/node-acme-client/commit/2eb0e54909d8ad36708e07c12fd598998159bc43))

# [1.35.0](https://github.com/publishlab/node-acme-client/compare/v1.34.11...v1.35.0) (2025-06-05)

**Note:** Version bump only for package @certd/acme-client

## [1.34.11](https://github.com/publishlab/node-acme-client/compare/v1.34.10...v1.34.11) (2025-06-05)

### Bug Fixes

* 修复中文域名使用cname方式校验无法通过的问题 ([f7d5baa](https://github.com/publishlab/node-acme-client/commit/f7d5baa6d04cb83c572b06e62f885890cfa0143a))

### Performance Improvements

* 优化cname检查，当有冲突的cname记录时，给出提示 ([e639a8f](https://github.com/publishlab/node-acme-client/commit/e639a8f9f12640ffcca69f1a6a0324459924afbd))

## [1.34.10](https://github.com/publishlab/node-acme-client/compare/v1.34.9...v1.34.10) (2025-06-03)

**Note:** Version bump only for package @certd/acme-client

## [1.34.9](https://github.com/publishlab/node-acme-client/compare/v1.34.8...v1.34.9) (2025-05-30)

**Note:** Version bump only for package @certd/acme-client

## [1.34.8](https://github.com/publishlab/node-acme-client/compare/v1.34.7...v1.34.8) (2025-05-28)

**Note:** Version bump only for package @certd/acme-client

## [1.34.7](https://github.com/publishlab/node-acme-client/compare/v1.34.6...v1.34.7) (2025-05-26)

**Note:** Version bump only for package @certd/acme-client

## [1.34.6](https://github.com/publishlab/node-acme-client/compare/v1.34.5...v1.34.6) (2025-05-25)

**Note:** Version bump only for package @certd/acme-client

## [1.34.5](https://github.com/publishlab/node-acme-client/compare/v1.34.4...v1.34.5) (2025-05-19)

**Note:** Version bump only for package @certd/acme-client

## [1.34.4](https://github.com/publishlab/node-acme-client/compare/v1.34.3...v1.34.4) (2025-05-16)

**Note:** Version bump only for package @certd/acme-client

## [1.34.3](https://github.com/publishlab/node-acme-client/compare/v1.34.2...v1.34.3) (2025-05-15)

**Note:** Version bump only for package @certd/acme-client

## [1.34.2](https://github.com/publishlab/node-acme-client/compare/v1.34.1...v1.34.2) (2025-05-11)

### Performance Improvements

* http方式支持校验443端口 ([d75fcb7](https://github.com/publishlab/node-acme-client/commit/d75fcb7fec421a9a638eaa27fe9378c84b5e0f19))

## [1.34.1](https://github.com/publishlab/node-acme-client/compare/v1.34.0...v1.34.1) (2025-05-05)

### Bug Fixes

* 根据SOA记录判断子域名托管有缺陷，改回手动配置子域名托管记录的方式 ([1b280a2](https://github.com/publishlab/node-acme-client/commit/1b280a2940f9e2d919b0bf23b89cc185be1fa498))

# [1.34.0](https://github.com/publishlab/node-acme-client/compare/v1.33.8...v1.34.0) (2025-04-28)

**Note:** Version bump only for package @certd/acme-client

## [1.33.8](https://github.com/publishlab/node-acme-client/compare/v1.33.7...v1.33.8) (2025-04-26)

### Bug Fixes

* 修复http上传方式无法清除记录文件的bug ([72a7b51](https://github.com/publishlab/node-acme-client/commit/72a7b51d479602b2c54c6c3ac8d8a0dcb9664e73))

### Performance Improvements

* 从域名的soa获取主域名，子域名托管无需额外配置 ([a586a92](https://github.com/publishlab/node-acme-client/commit/a586a92d5e32ea846ac37be52a7ad8c328d89966))
* 七牛oss支持删除过期备份 ([b7113bd](https://github.com/publishlab/node-acme-client/commit/b7113bda2378116d6c116dc583f563cce7cf9f00))

## [1.33.7](https://github.com/publishlab/node-acme-client/compare/v1.33.6...v1.33.7) (2025-04-22)

**Note:** Version bump only for package @certd/acme-client

## [1.33.6](https://github.com/publishlab/node-acme-client/compare/v1.33.5...v1.33.6) (2025-04-20)

**Note:** Version bump only for package @certd/acme-client

## [1.33.5](https://github.com/publishlab/node-acme-client/compare/v1.33.4...v1.33.5) (2025-04-17)

**Note:** Version bump only for package @certd/acme-client

## [1.33.4](https://github.com/publishlab/node-acme-client/compare/v1.33.3...v1.33.4) (2025-04-15)

**Note:** Version bump only for package @certd/acme-client

## [1.33.3](https://github.com/publishlab/node-acme-client/compare/v1.33.2...v1.33.3) (2025-04-14)

**Note:** Version bump only for package @certd/acme-client

## [1.33.2](https://github.com/publishlab/node-acme-client/compare/v1.33.1...v1.33.2) (2025-04-12)

**Note:** Version bump only for package @certd/acme-client

## [1.33.1](https://github.com/publishlab/node-acme-client/compare/v1.33.0...v1.33.1) (2025-04-12)

**Note:** Version bump only for package @certd/acme-client

# [1.33.0](https://github.com/publishlab/node-acme-client/compare/v1.32.0...v1.33.0) (2025-04-11)

**Note:** Version bump only for package @certd/acme-client

# [1.32.0](https://github.com/publishlab/node-acme-client/compare/v1.31.11...v1.32.0) (2025-04-04)

### Bug Fixes

* 修复从本地dns获取记录报错的bug ([c39b1bf](https://github.com/publishlab/node-acme-client/commit/c39b1bf823ddc6216bed2049e4c87e6107def08a))

### Features

* 优化证书申请速度，修复某些情况下letsencrypt 校验失败的问题 ([857589b](https://github.com/publishlab/node-acme-client/commit/857589b365c6f709e0ae67914d2f50ce182e6dd6))

### Performance Improvements

* 优化华为dns解析记录创建和删除问题 ([0948c5b](https://github.com/publishlab/node-acme-client/commit/0948c5bc691d2ee6eb47c72a85da1b7453361878))

## [1.31.11](https://github.com/publishlab/node-acme-client/compare/v1.31.10...v1.31.11) (2025-04-02)

**Note:** Version bump only for package @certd/acme-client

## [1.31.10](https://github.com/publishlab/node-acme-client/compare/v1.31.9...v1.31.10) (2025-03-29)

**Note:** Version bump only for package @certd/acme-client

## [1.31.9](https://github.com/publishlab/node-acme-client/compare/v1.31.8...v1.31.9) (2025-03-28)

### Performance Improvements

* dns支持火山引擎 ([99ff879](https://github.com/publishlab/node-acme-client/commit/99ff879d93658c29ea493a4bde7e9e3f85996d64))

## [1.31.8](https://github.com/publishlab/node-acme-client/compare/v1.31.7...v1.31.8) (2025-03-26)

### Performance Improvements

* 优化txt本地校验效率 ([fd507f2](https://github.com/publishlab/node-acme-client/commit/fd507f269253607e68c5c099c99e0de11636f229))

## [1.31.7](https://github.com/publishlab/node-acme-client/compare/v1.31.6...v1.31.7) (2025-03-24)

**Note:** Version bump only for package @certd/acme-client

## [1.31.6](https://github.com/publishlab/node-acme-client/compare/v1.31.5...v1.31.6) (2025-03-24)

**Note:** Version bump only for package @certd/acme-client

## [1.31.5](https://github.com/publishlab/node-acme-client/compare/v1.31.4...v1.31.5) (2025-03-22)

**Note:** Version bump only for package @certd/acme-client

## [1.31.4](https://github.com/publishlab/node-acme-client/compare/v1.31.3...v1.31.4) (2025-03-21)

**Note:** Version bump only for package @certd/acme-client

## [1.31.3](https://github.com/publishlab/node-acme-client/compare/v1.31.2...v1.31.3) (2025-03-13)

**Note:** Version bump only for package @certd/acme-client

## [1.31.2](https://github.com/publishlab/node-acme-client/compare/v1.31.1...v1.31.2) (2025-03-12)

**Note:** Version bump only for package @certd/acme-client

## [1.31.1](https://github.com/publishlab/node-acme-client/compare/v1.31.0...v1.31.1) (2025-03-11)

**Note:** Version bump only for package @certd/acme-client

# [1.31.0](https://github.com/publishlab/node-acme-client/compare/v1.30.6...v1.31.0) (2025-03-10)

**Note:** Version bump only for package @certd/acme-client

## [1.30.6](https://github.com/publishlab/node-acme-client/compare/v1.30.5...v1.30.6) (2025-02-24)

**Note:** Version bump only for package @certd/acme-client

## [1.30.5](https://github.com/publishlab/node-acme-client/compare/v1.30.4...v1.30.5) (2025-02-14)

**Note:** Version bump only for package @certd/acme-client

## [1.30.4](https://github.com/publishlab/node-acme-client/compare/v1.30.3...v1.30.4) (2025-02-14)

**Note:** Version bump only for package @certd/acme-client

## [1.30.3](https://github.com/publishlab/node-acme-client/compare/v1.30.2...v1.30.3) (2025-02-13)

**Note:** Version bump only for package @certd/acme-client

## [1.30.2](https://github.com/publishlab/node-acme-client/compare/v1.30.1...v1.30.2) (2025-02-09)

**Note:** Version bump only for package @certd/acme-client

## [1.30.1](https://github.com/publishlab/node-acme-client/compare/v1.30.0...v1.30.1) (2025-01-20)

**Note:** Version bump only for package @certd/acme-client

# [1.30.0](https://github.com/publishlab/node-acme-client/compare/v1.29.5...v1.30.0) (2025-01-19)

### Bug Fixes

* 修复查看任务日志偶发性无法自动滚动底部的bug ([7e482f7](https://github.com/publishlab/node-acme-client/commit/7e482f798c0142bce1866f84676cb40210f9638a))

## [1.29.5](https://github.com/publishlab/node-acme-client/compare/v1.29.4...v1.29.5) (2025-01-07)

**Note:** Version bump only for package @certd/acme-client

## [1.29.4](https://github.com/publishlab/node-acme-client/compare/v1.29.3...v1.29.4) (2025-01-06)

**Note:** Version bump only for package @certd/acme-client

## [1.29.3](https://github.com/publishlab/node-acme-client/compare/v1.29.2...v1.29.3) (2025-01-04)

### Performance Improvements

* 优化acme sdk ([54db744](https://github.com/publishlab/node-acme-client/commit/54db74428259de64d12230c2ab7353ae11197bbc))

## [1.29.2](https://github.com/publishlab/node-acme-client/compare/v1.29.1...v1.29.2) (2024-12-25)

**Note:** Version bump only for package @certd/acme-client

## [1.29.1](https://github.com/publishlab/node-acme-client/compare/v1.29.0...v1.29.1) (2024-12-25)

**Note:** Version bump only for package @certd/acme-client

# [1.29.0](https://github.com/publishlab/node-acme-client/compare/v1.28.4...v1.29.0) (2024-12-24)

**Note:** Version bump only for package @certd/acme-client

## [1.28.4](https://github.com/publishlab/node-acme-client/compare/v1.28.3...v1.28.4) (2024-12-12)

**Note:** Version bump only for package @certd/acme-client

## [1.28.3](https://github.com/publishlab/node-acme-client/compare/v1.28.2...v1.28.3) (2024-12-12)

**Note:** Version bump only for package @certd/acme-client

## [1.28.2](https://github.com/publishlab/node-acme-client/compare/v1.28.1...v1.28.2) (2024-12-09)

### Performance Improvements

* 支持mysql ([7cde1fd](https://github.com/publishlab/node-acme-client/commit/7cde1fdc4a9ed851900d231a5460c8dbfbcd148e))

## [1.28.1](https://github.com/publishlab/node-acme-client/compare/v1.28.0...v1.28.1) (2024-12-08)

**Note:** Version bump only for package @certd/acme-client

# [1.28.0](https://github.com/publishlab/node-acme-client/compare/v1.27.9...v1.28.0) (2024-11-30)

**Note:** Version bump only for package @certd/acme-client

## [1.27.9](https://github.com/publishlab/node-acme-client/compare/v1.27.8...v1.27.9) (2024-11-26)

**Note:** Version bump only for package @certd/acme-client

## [1.27.8](https://github.com/publishlab/node-acme-client/compare/v1.27.7...v1.27.8) (2024-11-25)

**Note:** Version bump only for package @certd/acme-client

## [1.27.7](https://github.com/publishlab/node-acme-client/compare/v1.27.6...v1.27.7) (2024-11-25)

**Note:** Version bump only for package @certd/acme-client

## [1.27.6](https://github.com/publishlab/node-acme-client/compare/v1.27.5...v1.27.6) (2024-11-19)

**Note:** Version bump only for package @certd/acme-client

## [1.27.5](https://github.com/publishlab/node-acme-client/compare/v1.27.4...v1.27.5) (2024-11-18)

**Note:** Version bump only for package @certd/acme-client

## [1.27.4](https://github.com/publishlab/node-acme-client/compare/v1.27.3...v1.27.4) (2024-11-14)

**Note:** Version bump only for package @certd/acme-client

## [1.27.3](https://github.com/publishlab/node-acme-client/compare/v1.27.2...v1.27.3) (2024-11-13)

**Note:** Version bump only for package @certd/acme-client

## [1.27.2](https://github.com/publishlab/node-acme-client/compare/v1.27.1...v1.27.2) (2024-11-08)

**Note:** Version bump only for package @certd/acme-client

## [1.27.1](https://github.com/publishlab/node-acme-client/compare/v1.27.0...v1.27.1) (2024-11-04)

**Note:** Version bump only for package @certd/acme-client

# [1.27.0](https://github.com/publishlab/node-acme-client/compare/v1.26.16...v1.27.0) (2024-10-31)

**Note:** Version bump only for package @certd/acme-client

## [1.26.16](https://github.com/publishlab/node-acme-client/compare/v1.26.15...v1.26.16) (2024-10-30)

**Note:** Version bump only for package @certd/acme-client

## [1.26.15](https://github.com/publishlab/node-acme-client/compare/v1.26.14...v1.26.15) (2024-10-28)

**Note:** Version bump only for package @certd/acme-client

## [1.26.14](https://github.com/publishlab/node-acme-client/compare/v1.26.13...v1.26.14) (2024-10-26)

### Bug Fixes

* 修复启动时自签证书无法保存的bug ([526c484](https://github.com/publishlab/node-acme-client/commit/526c48450bcd37b3ccded9b448f17de8140bdc6e))

## [1.26.13](https://github.com/publishlab/node-acme-client/compare/v1.26.12...v1.26.13) (2024-10-26)

**Note:** Version bump only for package @certd/acme-client

## [1.26.12](https://github.com/publishlab/node-acme-client/compare/v1.26.11...v1.26.12) (2024-10-25)

**Note:** Version bump only for package @certd/acme-client

## [1.26.11](https://github.com/publishlab/node-acme-client/compare/v1.26.10...v1.26.11) (2024-10-23)

### Bug Fixes

* 申请证书没有使用到系统设置的http代理的bug ([3db216f](https://github.com/publishlab/node-acme-client/commit/3db216f515ba404cb4330fdab452971b22a50f08))
* 修复google证书*.xx.com与xx.com同时申请时报错的bug ([f8b99b8](https://github.com/publishlab/node-acme-client/commit/f8b99b81a23e7e9fd5e05ebd5caf355c41d67a90))

### Performance Improvements

* 优化证书申请速度和成功率，反代地址优化，google基本可以稳定请求。增加请求重试。 ([41d9c3a](https://github.com/publishlab/node-acme-client/commit/41d9c3ac8398def541e65351cbe920d4a927182d))

## [1.26.10](https://github.com/publishlab/node-acme-client/compare/v1.26.9...v1.26.10) (2024-10-20)

**Note:** Version bump only for package @certd/acme-client

## [1.26.9](https://github.com/publishlab/node-acme-client/compare/v1.26.8...v1.26.9) (2024-10-19)

**Note:** Version bump only for package @certd/acme-client

## [1.26.8](https://github.com/publishlab/node-acme-client/compare/v1.26.7...v1.26.8) (2024-10-15)

**Note:** Version bump only for package @certd/acme-client

## [1.26.7](https://github.com/publishlab/node-acme-client/compare/v1.26.6...v1.26.7) (2024-10-14)

**Note:** Version bump only for package @certd/acme-client

## [1.26.6](https://github.com/publishlab/node-acme-client/compare/v1.26.5...v1.26.6) (2024-10-14)

**Note:** Version bump only for package @certd/acme-client

## [1.26.5](https://github.com/publishlab/node-acme-client/compare/v1.26.4...v1.26.5) (2024-10-14)

**Note:** Version bump only for package @certd/acme-client

## [1.26.4](https://github.com/publishlab/node-acme-client/compare/v1.26.3...v1.26.4) (2024-10-14)

**Note:** Version bump only for package @certd/acme-client

## [1.26.3](https://github.com/publishlab/node-acme-client/compare/v1.26.2...v1.26.3) (2024-10-12)

**Note:** Version bump only for package @certd/acme-client

## [1.26.2](https://github.com/publishlab/node-acme-client/compare/v1.26.1...v1.26.2) (2024-10-11)

**Note:** Version bump only for package @certd/acme-client

## [1.26.1](https://github.com/publishlab/node-acme-client/compare/v1.26.0...v1.26.1) (2024-10-10)

**Note:** Version bump only for package @certd/acme-client

# [1.26.0](https://github.com/publishlab/node-acme-client/compare/v1.25.9...v1.26.0) (2024-10-10)

### Features

* 域名验证方法支持CNAME间接方式，此方式支持所有域名注册商，且无需提供Access授权，但是需要手动添加cname解析 ([f3d3508](https://github.com/publishlab/node-acme-client/commit/f3d35084ed44f9f33845f7045e520be5c27eed93))

## [1.25.9](https://github.com/publishlab/node-acme-client/compare/v1.25.8...v1.25.9) (2024-10-01)

**Note:** Version bump only for package @certd/acme-client

## [1.25.8](https://github.com/publishlab/node-acme-client/compare/v1.25.7...v1.25.8) (2024-09-30)

**Note:** Version bump only for package @certd/acme-client

## [1.25.7](https://github.com/publishlab/node-acme-client/compare/v1.25.6...v1.25.7) (2024-09-29)

**Note:** Version bump only for package @certd/acme-client

## [1.25.6](https://github.com/publishlab/node-acme-client/compare/v1.25.5...v1.25.6) (2024-09-29)

### Performance Improvements

* 部署支持1Panel ([d047234](https://github.com/publishlab/node-acme-client/commit/d047234d98d31504f2e5a472b66e1b75806af26e))

## [1.25.5](https://github.com/publishlab/node-acme-client/compare/v1.25.4...v1.25.5) (2024-09-26)

**Note:** Version bump only for package @certd/acme-client

## [1.25.4](https://github.com/publishlab/node-acme-client/compare/v1.25.3...v1.25.4) (2024-09-25)

**Note:** Version bump only for package @certd/acme-client

## [1.25.3](https://github.com/publishlab/node-acme-client/compare/v1.25.2...v1.25.3) (2024-09-24)

**Note:** Version bump only for package @certd/acme-client

## [1.25.2](https://github.com/publishlab/node-acme-client/compare/v1.25.1...v1.25.2) (2024-09-24)

**Note:** Version bump only for package @certd/acme-client

## [1.25.1](https://github.com/publishlab/node-acme-client/compare/v1.25.0...v1.25.1) (2024-09-24)

**Note:** Version bump only for package @certd/acme-client

# [1.25.0](https://github.com/publishlab/node-acme-client/compare/v1.24.4...v1.25.0) (2024-09-24)

### Performance Improvements

* 证书支持旧版RSA，pkcs1 ([3d9c3ec](https://github.com/publishlab/node-acme-client/commit/3d9c3ecb3eb604b2458154f608bde0f01915d116))
* 支持七牛云 ([8ecc2f9](https://github.com/publishlab/node-acme-client/commit/8ecc2f9446a9ebd11b9bfbffbb6cf7812a043495))

## [1.24.4](https://github.com/publishlab/node-acme-client/compare/v1.24.3...v1.24.4) (2024-09-09)

**Note:** Version bump only for package @certd/acme-client

## [1.24.3](https://github.com/publishlab/node-acme-client/compare/v1.24.2...v1.24.3) (2024-09-06)

**Note:** Version bump only for package @certd/acme-client

## [1.24.2](https://github.com/publishlab/node-acme-client/compare/v1.24.1...v1.24.2) (2024-09-06)

### Performance Improvements

* 修复windows下无法执行第二条命令的bug ([d5bfcdb](https://github.com/publishlab/node-acme-client/commit/d5bfcdb6de1dcc1702155442e2e00237d0bbb6e5))

## [1.24.1](https://github.com/publishlab/node-acme-client/compare/v1.24.0...v1.24.1) (2024-09-02)

### Bug Fixes

* 修复在没有勾选使用代理的情况下，仍然会使用代理的bug ([0f66794](https://github.com/publishlab/node-acme-client/commit/0f6679425f6a736bb0128527dd99c085fac17d84))

### Performance Improvements

* 部署插件支持宝塔、易盾云等 ([ee61709](https://github.com/publishlab/node-acme-client/commit/ee617095efa1171548cf52fd45f0f98a368555a3))
* 授权配置支持加密 ([42a56b5](https://github.com/publishlab/node-acme-client/commit/42a56b581d754c3e5f9838179d19ab0d004ef2eb))

# [1.24.0](https://github.com/publishlab/node-acme-client/compare/v1.23.1...v1.24.0) (2024-08-25)

### Bug Fixes

* 修复成功后跳过之后丢失腾讯云证书id的bug ([37eb762](https://github.com/publishlab/node-acme-client/commit/37eb762afe25c5896b75dee25f32809f8426e7b7))
* 修复创建流水线后立即运行时报no id错误的bug ([17ead54](https://github.com/publishlab/node-acme-client/commit/17ead547aab25333603980304aa3aad3db1f73d5))
* 修复使用代理的情况下申请证书失败的bug ([95122e2](https://github.com/publishlab/node-acme-client/commit/95122e28609333f4df55c266e5434897954c0fb3))

### Features

* 支持google证书申请（需要使用代理） ([a593056](https://github.com/publishlab/node-acme-client/commit/a593056e79e99dd6a74f75b5eab621af7248cfbe))

### Performance Improvements

* 优化证书申请成功率 ([968c469](https://github.com/publishlab/node-acme-client/commit/968c4690a07f69c08dcb3d3a494da4e319627345))

## [1.22.6](https://github.com/publishlab/node-acme-client/compare/v1.22.5...v1.22.6) (2024-08-03)

**Note:** Version bump only for package @certd/acme-client

## [1.22.4](https://github.com/publishlab/node-acme-client/compare/v1.22.3...v1.22.4) (2024-07-26)

### Performance Improvements

* 证书申请支持反向代理，letsencrypt无法访问时的备用方案 ([b7b5df0](https://github.com/publishlab/node-acme-client/commit/b7b5df0587e0f7ea288c1b2af6f87211f207395f))

## [1.22.3](https://github.com/publishlab/node-acme-client/compare/v1.22.2...v1.22.3) (2024-07-25)

**Note:** Version bump only for package @certd/acme-client

## [1.22.2](https://github.com/publishlab/node-acme-client/compare/v1.22.1...v1.22.2) (2024-07-23)

**Note:** Version bump only for package @certd/acme-client

## [1.22.1](https://github.com/publishlab/node-acme-client/compare/v1.22.0...v1.22.1) (2024-07-20)

**Note:** Version bump only for package @certd/acme-client

# [1.22.0](https://github.com/publishlab/node-acme-client/compare/v1.21.2...v1.22.0) (2024-07-19)

### Features

* 升级midway，支持esm ([485e603](https://github.com/publishlab/node-acme-client/commit/485e603b5165c28bc08694997726eaf2a585ebe7))

## [1.21.2](https://github.com/publishlab/node-acme-client/compare/v1.21.1...v1.21.2) (2024-07-08)

**Note:** Version bump only for package @certd/acme-client

## [1.21.1](https://github.com/publishlab/node-acme-client/compare/v1.21.0...v1.21.1) (2024-07-08)

**Note:** Version bump only for package @certd/acme-client

# [1.21.0](https://github.com/publishlab/node-acme-client/compare/v1.20.17...v1.21.0) (2024-07-03)

### Features

* 支持zero ssl ([eade2c2](https://github.com/publishlab/node-acme-client/commit/eade2c2b681569f03e9cd466e7d5bcd6703ed492))

## [1.20.17](https://github.com/publishlab/node-acme-client/compare/v1.20.16...v1.20.17) (2024-07-03)

### Performance Improvements

* 创建dns解析后，强制等待60s ([f47b35f](https://github.com/publishlab/node-acme-client/commit/f47b35f6d5bd7d675005c3e286b7e9a029201f8b))
* 优化cname verify ([eba333d](https://github.com/publishlab/node-acme-client/commit/eba333de7a5b5ef4b0b7eaa904f578720102fa61))

## [1.20.16](https://github.com/publishlab/node-acme-client/compare/v1.20.15...v1.20.16) (2024-07-01)

### Bug Fixes

* 修复配置了cdn cname后申请失败的bug ([4a5fa76](https://github.com/publishlab/node-acme-client/commit/4a5fa767edc347d03d29a467e86c9a4d70b0220c))

## [1.20.15](https://github.com/publishlab/node-acme-client/compare/v1.20.14...v1.20.15) (2024-06-28)

### Performance Improvements

* 腾讯云dns provider 支持腾讯云的accessId ([e0eb3a4](https://github.com/publishlab/node-acme-client/commit/e0eb3a441384d474fe2923c69b25318264bdc9df))

## [1.20.14](https://github.com/publishlab/node-acme-client/compare/v1.20.13...v1.20.14) (2024-06-23)

**Note:** Version bump only for package @certd/acme-client

## [1.20.13](https://github.com/publishlab/node-acme-client/compare/v1.20.12...v1.20.13) (2024-06-18)

**Note:** Version bump only for package @certd/acme-client

## [1.20.12](https://github.com/publishlab/node-acme-client/compare/v1.20.10...v1.20.12) (2024-06-17)

### Bug Fixes

* 修复aliyun域名超过100个找不到域名的bug ([5b1494b](https://github.com/publishlab/node-acme-client/commit/5b1494b3ce93d1026dc56ee741342fbb8bf7be24))

### Performance Improvements

* 支持cloudflare域名 ([fbb9a47](https://github.com/publishlab/node-acme-client/commit/fbb9a47e8f7bb805289b9ee64bd46ffee0f01c06))

## [1.20.10](https://github.com/publishlab/node-acme-client/compare/v1.20.9...v1.20.10) (2024-05-30)

**Note:** Version bump only for package @certd/acme-client

## [1.20.9](https://github.com/publishlab/node-acme-client/compare/v1.20.8...v1.20.9) (2024-03-22)

**Note:** Version bump only for package @certd/acme-client

## [1.20.8](https://github.com/publishlab/node-acme-client/compare/v1.20.7...v1.20.8) (2024-03-22)

**Note:** Version bump only for package @certd/acme-client

## [1.20.7](https://github.com/publishlab/node-acme-client/compare/v1.20.6...v1.20.7) (2024-03-22)

**Note:** Version bump only for package @certd/acme-client

## [1.20.6](https://github.com/publishlab/node-acme-client/compare/v1.20.5...v1.20.6) (2024-03-21)

**Note:** Version bump only for package @certd/acme-client

## [1.20.5](https://github.com/publishlab/node-acme-client/compare/v1.20.2...v1.20.5) (2024-03-11)

### Bug Fixes

* 修复腾讯云cdn部署无法选择端点的bug ([154409b](https://github.com/publishlab/node-acme-client/commit/154409b1dfee3ea1caae740ad9c1f99a6e7a9814))

# Changelog

## v5.4.0 (2024-07-16)

* `added` Directory URLs for [Google](https://cloud.google.com/certificate-manager/docs/overview) ACME provider
* `fixed` Invalidate ACME provider directory cache after 24 hours
* `fixed` Retry HTTP requests on server errors or when rate limited - [#89](https://github.com/publishlab/node-acme-client/issues/89)

## v5.3.1 (2024-05-22)

* `fixed` Allow `client.auto()` being called with an empty CSR common name
* `fixed` Bug when calling `updateAccountKey()` with external account binding

## v5.3.0 (2024-02-05)

* `added` Support and tests for satisfying `tls-alpn-01` challenges
* `changed` Replace `jsrsasign` with `@peculiar/x509` for certificate and CSR handling
* `changed` Method `getChallengeKeyAuthorization()` now returns `$token.$thumbprint` when called with a `tls-alpn-01` challenge
    * Previously returned base64url encoded SHA256 digest of `$token.$thumbprint` erroneously
    * This change is not considered breaking since the previous behavior was incorrect

## v5.2.0 (2024-01-22)

* `fixed` Allow self-signed or invalid certs when validating `http-01` challenges that redirect to HTTPS - [#65](https://github.com/publishlab/node-acme-client/issues/65)
* `fixed` Wait for all challenge promises to settle before rejecting `client.auto()` - [#75](https://github.com/publishlab/node-acme-client/issues/75)

## v5.1.0 (2024-01-20)

* `fixed` Upgrade `jsrsasign@11.0.0` - [GHSA-rh63-9qcf-83gf](https://github.com/kjur/jsrsasign/security/advisories/GHSA-rh63-9qcf-83gf)
* `fixed` Upgrade `axios@1.6.5` - [CVE-2023-45857](https://cve.mitre.org/cgi-bin/cvename.cgi?name=2023-45857)

## v5.0.0 (2022-07-28)

* [Upgrade guide here](docs/upgrade-v5.md)
* `added` New native crypto interface, ECC/ECDSA support
* `breaking` Remove support for Node v10, v12 and v14
* `breaking` Prioritize issuer closest to root during preferred chain selection - [#46](https://github.com/publishlab/node-acme-client/issues/46)
* `changed` Replace `bluebird` dependency with native promise APIs
* `changed` Replace `backo2` dependency with internal utility

## v4.2.5 (2022-03-21)

* `fixed` Upgrade `axios@0.26.1`
* `fixed` Upgrade `node-forge@1.3.0` - [CVE-2022-24771](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2022-24771), [CVE-2022-24772](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2022-24772), [CVE-2022-24773](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2022-24773)

## v4.2.4 (2022-03-19)

* `fixed` Use SHA-256 when signing CSRs

## v3.3.2 (2022-03-19)

* `backport` Use SHA-256 when signing CSRs

## v4.2.3 (2022-01-11)

* `added` Directory URLs for ACME providers [Buypass](https://www.buypass.com) and [ZeroSSL](https://zerossl.com)
* `fixed` Skip already valid authorizations when using `client.auto()`

## v4.2.2 (2022-01-10)

* `fixed` Upgrade `node-forge@1.2.0`

## v4.2.1 (2022-01-10)

* `fixed` ZeroSSL `duplicate_domains_in_array` error when using `client.auto()`

## v4.2.0 (2022-01-06)

* `added` Support for external account binding - [RFC 8555 Section 7.3.4](https://datatracker.ietf.org/doc/html/rfc8555#section-7.3.4)
* `added` Ability to pass through custom logger function
* `changed` Increase default `backoffAttempts` to 10
* `fixed` Deactivate authorizations where challenges can not be completed
* `fixed` Attempt authoritative name servers when verifying `dns-01` challenges
* `fixed` Error verbosity when failing to read ACME directory
* `fixed` Correctly recognize `ready` and `processing` states - [RFC 8555 Section 7.1.6](https://datatracker.ietf.org/doc/html/rfc8555#section-7.1.6)

## v4.1.4 (2021-12-23)

* `fixed` Upgrade `axios@0.21.4` - [CVE-2021-3749](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2021-3749)

## v4.1.3 (2021-02-22)

* `fixed` Upgrade `axios@0.21.1` - [CVE-2020-28168](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2020-28168)

## v4.1.2 (2020-11-16)

* `fixed` Bug when encoding PEM payloads, potentially causing malformed requests

## v4.1.1 (2020-11-13)

* `fixed` Missing TypeScript definitions

## v4.1.0 (2020-11-12)

* `added` Option `preferredChain` added to `client.getCertificate()` and `client.auto()` to indicate which certificate chain is preferred if a CA offers multiple
    * Related: [https://community.letsencrypt.org/t/transition-to-isrgs-root-delayed-until-jan-11-2021/125516](https://community.letsencrypt.org/t/transition-to-isrgs-root-delayed-until-jan-11-2021/125516)
* `added` Method `client.getOrder()` to refresh order from CA
* `fixed` Upgrade `axios@0.21.0`
* `fixed` Error when attempting to revoke a certificate chain
* `fixed` Missing URL augmentation in `client.finalizeOrder()` and `client.deactivateAuthorization()`
* `fixed` Add certificate issuer to response from `forge.readCertificateInfo()`

## v4.0.2 (2020-10-09)

* `fixed` Explicitly set default `axios` HTTP adapter - [axios/axios#1180](https://github.com/axios/axios/issues/1180)

## v4.0.1 (2020-09-15)

* `fixed` Upgrade `node-forge@0.10.0` - [CVE-2020-7720](https://cve.mitre.org/cgi-bin/cvename.cgi?name=CVE-2020-7720)

## v4.0.0 (2020-05-29)

* `breaking` Remove support for Node v8
* `breaking` Remove deprecated `openssl` crypto module
* `fixed` Incorrect TypeScript `CertificateInfo` definitions
* `fixed` Allow trailing whitespace character in `http-01` challenge response

## v3.3.1 (2020-01-07)

* `fixed` Improvements to TypeScript definitions

## v3.3.0 (2019-12-19)

* `added` TypeScript definitions
* `fixed` Allow missing ACME directory meta field - [RFC 8555 Section 7.1.1](https://datatracker.ietf.org/doc/html/rfc8555#section-7.1.1)

## v3.2.1 (2019-11-14)

* `added` New option `skipChallengeVerification` added to `client.auto()` to bypass internal challenge verification

## v3.2.0 (2019-08-26)

* `added` More extensive testing using [letsencrypt/pebble](https://github.com/letsencrypt/pebble)
* `changed` When creating a CSR, `commonName` no longer defaults to `'localhost'`
    * This change is not considered breaking since `commonName: 'localhost'` will result in an error when ordering a certificate
* `fixed` Retry signed API requests on `urn:ietf:params:acme:error:badNonce` - [RFC 8555 Section 6.5](https://datatracker.ietf.org/doc/html/rfc8555#section-6.5)
* `fixed` Minor bugs related to `POST-as-GET` when calling `updateAccount()`
* `fixed` Ensure subject common name is present in SAN when creating a CSR - [CAB v1.2.3 Section 9.2.2](https://cabforum.org/wp-content/uploads/BRv1.2.3.pdf)
* `fixed` Send empty JSON body when responding to challenges - [RFC 8555 Section 7.5.1](https://datatracker.ietf.org/doc/html/rfc8555#section-7.5.1)

## v2.3.1 (2019-08-26)

* `backport` Minor bugs related to `POST-as-GET` when calling `client.updateAccount()`
* `backport` Send empty JSON body when responding to challenges

## v3.1.0 (2019-08-21)

* `added` UTF-8 support when generating a CSR subject using forge - [RFC 5280](https://datatracker.ietf.org/doc/html/rfc5280)
* `fixed` Implement `POST-as-GET` for all ACME API requests - [RFC 8555 Section 6.3](https://datatracker.ietf.org/doc/html/rfc8555#section-6.3)

## v2.3.0 (2019-08-21)

* `backport` Implement `POST-as-GET` for all ACME API requests

## v3.0.0 (2019-07-13)

* `added` Expose `axios` instance to allow manipulating HTTP client defaults
* `breaking` Remove support for Node v4 and v6
* `breaking` Remove Babel transpilation

## v2.2.3 (2019-01-25)

* `added` DNS CNAME detection when verifying `dns-01` challenges

## v2.2.2 (2019-01-07)

* `added` Support for `tls-alpn-01` challenge key authorization

## v2.2.1 (2019-01-04)

* `fixed` Handle and throw errors from OpenSSL process

## v2.2.0 (2018-11-06)

* `added` New [node-forge](https://www.npmjs.com/package/node-forge) crypto interface, removes OpenSSL CLI dependency
* `added` Support native `crypto.generateKeyPair()` API when generating key pairs

## v2.1.0 (2018-10-21)

* `added` Ability to set and get current account URL
* `fixed` Replace HTTP client `request` with `axios`
* `fixed` Auto-mode no longer tries to create account when account URL exists

## v2.0.1 (2018-08-17)

* `fixed` Key rollover in compliance with [draft-ietf-acme-13](https://datatracker.ietf.org/doc/html/draft-ietf-acme-acme-13)

## v2.0.0 (2018-04-02)

* `breaking` ACMEv2
* `breaking` API changes
* `breaking` Rewrite to ES6
* `breaking` Promises instead of callbacks

## v1.0.0 (2017-10-20)

* API stable

## v0.2.1 (2017-09-27)

* `fixed` Bug causing invalid anti-replay nonce

## v0.2.0 (2017-09-21)

* `breaking` OpenSSL method `readCsrDomains` and `readCertificateInfo` now return domains as an object
* `fixed` Added and fixed some tests

## v0.1.0 (2017-09-14)

* `acme-client` released
