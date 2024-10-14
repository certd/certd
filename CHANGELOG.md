# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

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

**Note:** Version bump only for package root

# [1.26.0](https://github.com/certd/certd/compare/v1.25.9...v1.26.0) (2024-10-10)

### Bug Fixes

* 修复管理员编辑其他用户流水线任务时归属userid也被修改的bug ([e85c477](https://github.com/certd/certd/commit/e85c47744cf740b4af3b93dca7c2f0ccc818ec2f))
* 修复历史记录根据流水线名称查询报错的bug ([ce9a986](https://github.com/certd/certd/commit/ce9a9862f122fce2186e7727eaa4b251b59e6032))
* 修复某些代理情况下 报 400 The plain HTTP request was sent to HTTPS port use proxy 的bug ([a13203f](https://github.com/certd/certd/commit/a13203fb3f48c427d0d81a504912248dcc07df1a))

### Features

* 域名验证方法支持CNAME间接方式，此方式支持所有域名注册商，且无需提供Access授权，但是需要手动添加cname解析 ([f3d3508](https://github.com/certd/certd/commit/f3d35084ed44f9f33845f7045e520be5c27eed93))
* 站点个性化设置 ([11a9fe9](https://github.com/certd/certd/commit/11a9fe9014d96cba929e5a066e78f2af7ae59d14))

### Performance Improvements

* 并行任务名称改成添加任务，取消并行，可以在同一个阶段获取上一个task的输出 ([c5e5877](https://github.com/certd/certd/commit/c5e58770d1c5edc19c6f9ea1618f44b68e091f35))
* 调整静态资源到static目录 ([0584b36](https://github.com/certd/certd/commit/0584b3672b40f9042a2ed87e5627022606d046cd))
* 调整全部静态资源到static目录 ([a218890](https://github.com/certd/certd/commit/a21889080d6c7ffdf0af526a3a21f0b2d1c77288))
* 检查cname是否正确配置 ([b5d8935](https://github.com/certd/certd/commit/b5d8935159374fbe7fc7d4c48ae0ed9396861bdd))
* 七牛云cdn支持配置多个域名 ([88d745e](https://github.com/certd/certd/commit/88d745e29063a089864fb9c6705be7b8d4c2669a))
* 上传到主机插件支持注入环境变量 ([81fac73](https://github.com/certd/certd/commit/81fac736f9ccc8d1cda7ef4178752239cec20849))
* 优化宝塔网站部署插件远程获取数据的提示 ([2a3ca9f](https://github.com/certd/certd/commit/2a3ca9f552d96594ec6690a1c4c91f598451b9a1))
* 优化缩短首页缓存时间 ([49395e8](https://github.com/certd/certd/commit/49395e8cb65f4b30c0145329ed5de48be4ef3842))
* 域名输入增加校验提示，避免输入错误的域名 ([0c8e83e](https://github.com/certd/certd/commit/0c8e83e1254a9ce4d5a4e7888eb1710394a4b77c))
* cname校验配置增加未校验通过提示 ([77cc3c4](https://github.com/certd/certd/commit/77cc3c4a5cbd81f8233a8e0bb33fab0621c0905f))
* google eab授权支持自动获取，不过要配置代理 ([592791d](https://github.com/certd/certd/commit/592791d1356fc252fbb70d7f168567aee9585507))

## [1.25.9](https://github.com/certd/certd/compare/v1.25.8...v1.25.9) (2024-10-01)

### Bug Fixes

* 修复西部数码账户级别apikey不可用的bug ([f8f3e8b](https://github.com/certd/certd/commit/f8f3e8b43fd5d815887bcb53b95f46dc96424b79))

### Performance Improvements

* 增加等待插件 ([3ef0541](https://github.com/certd/certd/commit/3ef0541cc85ab6abf698ead3b258ae1ac156ef98))

## [1.25.8](https://github.com/certd/certd/compare/v1.25.7...v1.25.8) (2024-09-30)

### Bug Fixes

* 修复pfxPassword无效的bug ([251e450](https://github.com/certd/certd/commit/251e450fabfe62405bac13e39f2153736c081ef0))

### Performance Improvements

* 群晖获取deviceid优化 ([8d42273](https://github.com/certd/certd/commit/8d4227366548eb70f6bc04303829e6933168f906))

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
* 增加使用教程 ([9d9c021](https://github.com/certd/certd/commit/9d9c0218195af5b9896cce7109b26a433480571d))

## [1.25.5](https://github.com/certd/certd/compare/v1.25.4...v1.25.5) (2024-09-26)

**Note:** Version bump only for package root

## [1.25.4](https://github.com/certd/certd/compare/v1.25.3...v1.25.4) (2024-09-25)

### Bug Fixes

* 修复启动报授权验证失败的bug ([3460d3d](https://github.com/certd/certd/commit/3460d3ddca222ea702816ab805909d489eff957f))

## [1.25.3](https://github.com/certd/certd/compare/v1.25.2...v1.25.3) (2024-09-24)

### Bug Fixes

* 修复upload to host trim错误 ([0f0ddb9](https://github.com/certd/certd/commit/0f0ddb9c5963fd643d6d203334efac471c43ec3b))

## [1.25.2](https://github.com/certd/certd/compare/v1.25.1...v1.25.2) (2024-09-24)

**Note:** Version bump only for package root

## [1.25.1](https://github.com/certd/certd/compare/v1.25.0...v1.25.1) (2024-09-24)

**Note:** Version bump only for package root

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
* 优化主机登录失败提示 ([9de77b3](https://github.com/certd/certd/commit/9de77b327d39cff5ed6660ec53b58ba0eea18e5a))
* 增加重启certd插件 ([48238d9](https://github.com/certd/certd/commit/48238d929e6c4afa1d428e4d35b9159d37a47ae0))
* 证书支持旧版RSA，pkcs1 ([3d9c3ec](https://github.com/certd/certd/commit/3d9c3ecb3eb604b2458154f608bde0f01915d116))
* 支持阿里云ACK证书部署 ([d331fea](https://github.com/certd/certd/commit/d331fea47789122650e057ec7c9e85ee8e66f09b))
* 支持七牛云 ([8ecc2f9](https://github.com/certd/certd/commit/8ecc2f9446a9ebd11b9bfbffbb6cf7812a043495))
* 支持k8s ingress secret ([e5a5d0a](https://github.com/certd/certd/commit/e5a5d0a607bb6b4e1a1f7a1a419bada5f2dee59f))
* http请求增加默认超时时间 ([664bd86](https://github.com/certd/certd/commit/664bd863e5b4895aabe2384277c0c65f5902fdb2))
* plugins增加图标 ([a8da658](https://github.com/certd/certd/commit/a8da658a9723342b4f43a579f7805bfef0648efb))

## [1.24.4](https://github.com/certd/certd/compare/v1.24.3...v1.24.4) (2024-09-09)

### Bug Fixes

* 修复腾讯云cdn证书部署后会自动关闭hsts，http2.0等配置的bug ([7908ab7](https://github.com/certd/certd/commit/7908ab79da624c94fa05849925b15e480e3317c4))
* 修复腾讯云tke证书部署报错的bug ([653f409](https://github.com/certd/certd/commit/653f409d91a441850d6381f89a8dd390831f0d5e))

### Performance Improvements

* 插件选择支持搜索 ([d1498a7](https://github.com/certd/certd/commit/d1498a71601b74d38343b1d070eadd03705dd9d5))
* 前置任务步骤增加错误提示 ([ae3daa9](https://github.com/certd/certd/commit/ae3daa9bcf4fc363825aad9b77f5d3879aeeff70))
* 群晖部署教程 ([0f0af2f](https://github.com/certd/certd/commit/0f0af2f309390f388e7a272cea3a1dd30c01977d))
* 支持群晖 ([5c270b6](https://github.com/certd/certd/commit/5c270b6b9d45a2152f9fdb3c07bd98b7c803cb8e))

## [1.24.3](https://github.com/certd/certd/compare/v1.24.2...v1.24.3) (2024-09-06)

### Performance Improvements

* 支持多吉云cdn证书部署 ([65ef685](https://github.com/certd/certd/commit/65ef6857296784ca765926e09eafcb6fc8b6ecde))

## [1.24.2](https://github.com/certd/certd/compare/v1.24.1...v1.24.2) (2024-09-06)

### Bug Fixes

* 修复复制流水线出现的各种问题 ([6314e8d](https://github.com/certd/certd/commit/6314e8d7eb58cd52e2a7bd3b5ffb9112b0b69577))
* 修复windows下无法执行第二条命令的bug ([71ac8aa](https://github.com/certd/certd/commit/71ac8aae4aa694e1a23761e9761c9fba30b43a21))

### Performance Improvements

* 阶段、任务、步骤全面支持拖动排序 ([bd73a16](https://github.com/certd/certd/commit/bd73a163cd0497f062bd424ddc6bc9bbc95f81ea))
* 任务配置不需要的字段可以自动隐藏 ([192d9dc](https://github.com/certd/certd/commit/192d9dc7e36737d684c769f255f407c28b1152ac))
* 任务支持拖动排序 ([1e9b563](https://github.com/certd/certd/commit/1e9b5638aa36a8ce70019a9c750230ba41938327))
* 西部数据支持用户级的apikey ([1c17b41](https://github.com/certd/certd/commit/1c17b41e160944b073e1849e6f9467c3659a4bfc))
* 修复windows下无法执行第二条命令的bug ([d5bfcdb](https://github.com/certd/certd/commit/d5bfcdb6de1dcc1702155442e2e00237d0bbb6e5))
* 优化跳过处理逻辑 ([b80210f](https://github.com/certd/certd/commit/b80210f24bf5db1c958d06ab27c9e5d3db452eda))
* 支持阿里云oss ([87a2673](https://github.com/certd/certd/commit/87a2673e8c33dff6eda1b836d92ecc121564ed78))
* 支持西部数码DNS ([c59cab1](https://github.com/certd/certd/commit/c59cab1aaeb19f86df8e3e0d8127cbd0a9ef77f3))
* 支持pfx、der ([fbeaed2](https://github.com/certd/certd/commit/fbeaed203519f59b6d9396c4e8953353ccb5e723))
* client 请求超时时间延长为10s ([ff46771](https://github.com/certd/certd/commit/ff46771d8dd43e71c1ca70e3ba783945750342cc))

## [1.24.1](https://github.com/certd/certd/compare/v1.24.0...v1.24.1) (2024-09-02)

### Bug Fixes

* 激活仅限管理员 ([1c17970](https://github.com/certd/certd/commit/1c17970b981f0987c506744ee6b2283fd5e40493))
* 修复在没有勾选使用代理的情况下，仍然会使用代理的bug ([0f66794](https://github.com/certd/certd/commit/0f6679425f6a736bb0128527dd99c085fac17d84))

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
* 修复使用代理的情况下申请证书失败的bug ([95122e2](https://github.com/certd/certd/commit/95122e28609333f4df55c266e5434897954c0fb3))
* 修复执行日志没有清理的bug ([22a3363](https://github.com/certd/certd/commit/22a336370a88a7df2a23c967043bae153da71ed5))
* 修复重置密码参数配置后无效的bug ([e358a88](https://github.com/certd/certd/commit/e358a8869696578687306e4cd0dcda53f898fe13))
* 修复ssh无法连接成功，无法执行命令的bug ([41b9837](https://github.com/certd/certd/commit/41b9837582323fb400ef8525ce65e8b37ad4b36f))

### Features

* 支持ECC类型 ([a7424e0](https://github.com/certd/certd/commit/a7424e02f5c7e02ac1688791040785920ce67473))
* 支持google证书申请（需要使用代理） ([a593056](https://github.com/certd/certd/commit/a593056e79e99dd6a74f75b5eab621af7248cfbe))

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
* 优化默认值设置 ([1af19f0](https://github.com/certd/certd/commit/1af19f0ac053fe109782882964533636b5969d6b))

# [1.23.0](https://github.com/certd/certd/compare/v1.22.9...v1.23.0) (2024-08-05)

### Bug Fixes

* 修复环境变量多个下划线不生效的bug ([7ec2218](https://github.com/certd/certd/commit/7ec2218c9fee5bee2bf0aa31f3e3a4301575f247))

### Features

* use node 20 ([e8ed972](https://github.com/certd/certd/commit/e8ed97206bf28e83f942db2ef4ea07fa76fd3567))

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
* 优化前置任务输出为空的提示 ([6ed1e18](https://github.com/certd/certd/commit/6ed1e18c7d9c46d964ecc6abc90f3908297b7632))

## [1.22.5](https://github.com/certd/certd/compare/v1.22.4...v1.22.5) (2024-07-26)

### Bug Fixes

* 修复用户管理无法添加用户的bug ([e7e89b8](https://github.com/certd/certd/commit/e7e89b8de7386e84c0d6b8e217e2034909657d68))

## [1.22.4](https://github.com/certd/certd/compare/v1.22.3...v1.22.4) (2024-07-26)

### Performance Improvements

* 证书申请支持反向代理，letsencrypt无法访问时的备用方案 ([b7b5df0](https://github.com/certd/certd/commit/b7b5df0587e0f7ea288c1b2af6f87211f207395f))
* 支持arm64 ([fa14f87](https://github.com/certd/certd/commit/fa14f87a8093ef3addc5e5f3315ce1bfc9982782))

## [1.22.3](https://github.com/certd/certd/compare/v1.22.2...v1.22.3) (2024-07-25)

### Bug Fixes

* lege 无执行权限问题 ([338eb3b](https://github.com/certd/certd/commit/338eb3bdfeb461e9b3bc7eee97b97a59f5642ffe))

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
