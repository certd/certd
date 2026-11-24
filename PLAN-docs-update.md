# Certd 文档补充待办

更新于 2026 年 11 月 22 日。代码以 `v1.47.2` 为核对基准，文档以当前仓库的 `docs` 为准。版本取自远端 Git 标签，提交数包含合并提交，功能版本按首次包含该变更的正式标签记录。

| 批次 | 版本范围 | Git 比较范围 | 提交数 |
| --- | --- | --- | --- |
| 第一轮 | `v1.42.5` 至 `v1.47.2`，2026 年 7 月 15 日至 11 月 22 日 | `v1.42.4..v1.47.2` | 460 |
| 第二轮 | `v1.39.13` 至 `v1.42.4`，2026 年 5 月 11 日至 7 月 12 日 | `v1.39.12..v1.42.4` | 370 |
| 第三轮 | `v1.38.6` 至 `v1.39.12`，2026 年 2 月 5 日至 4 月 29 日 | `v1.38.5..v1.39.12` | 401 |
| 第四轮 | `v1.37.4` 至 `v1.38.5`，2025 年 10 月 29 日至 2026 年 2 月 3 日 | `v1.37.3..v1.38.5` | 488 |
| 第五轮 | `v1.36.10` 至 `v1.37.3`，2025 年 7 月 18 日至 10 月 25 日 | `v1.36.9..v1.37.3` | 405 |

P0 用于与现行行为冲突或可能影响升级的说明，P1 用于需要完整操作流程的功能，P2 用于目录条目和简短补充。提交短哈希可用 `git show <hash>` 查阅。

## 本次覆盖情况

| 范围 | 已写入文档的内容 | 尚待核对 |
| --- | --- | --- |
| P0 现有说明与升级影响 | 安全中心、Lego、`certZip`、插件模块迁移、腾讯云旧任务、API 消息字段、IP 证书和企业模式。[版本升级](docs/guide/install/upgrade.md) · [证书申请](docs/guide/use/cert/) · [企业模式](docs/guide/use/mode/enterprise.md) | |
| P1 申请、验证与托管 | 自定义 ACME、EAB、Google DNS 持久验证、域名映射、DNS/HTTP 排错、证书链、上传及远程拉取、SSH 跳板机。[证书申请与托管](docs/guide/use/cert/) · [Google EAB](docs/guide/use/google/) · [部署到 SSH 主机](docs/guide/use/host/) | |
| P1 流水线与接口 | 批量修改、历史保留、失败重试、后置任务、定时与 Webhook、申请参数模板、OpenAPI 签名与错误响应、Certd Client。[流水线](docs/guide/use/pipeline/) · [开放接口](docs/guide/open/) · [Certd Client](docs/guide/open/client.md) | |
| P1 域名、站点与项目 | 批量导入与指定 IP、域名到期、CNAME 批量管理、管理员管理用户资源与授权委托、项目协作与迁移。[监控](docs/guide/use/monitor/) · [CNAME 代理](docs/guide/feature/cname/) · [系统管理](docs/guide/use/setting/admin.md) · [企业模式](docs/guide/use/mode/enterprise.md) | |
| P1 运营与部署 | SQLite 远程备份、SMTP 与邮件模板、插件市场与开发、运行时依赖、OAuth、Passkey、验证码、安全与审计、网络探针、商业版套餐与钱包。[数据库备份](docs/guide/use/backup/) · [邮箱配置](docs/guide/use/email/) · [插件市场](docs/guide/plugins/market.md) · [运行时依赖](docs/guide/use/setting/runtime-dependencies.md) · [商业版](docs/guide/use/comm/) | |
| P2 使用细节 | 步骤复制、下次执行时间、随机定时、Webhook 部署、授权测试、站点绑定地址、公告、页脚及指定 IP。[流水线](docs/guide/use/pipeline/) · [授权列表](docs/guide/plugins/access.md) · [监控](docs/guide/use/monitor/) · [站点设置](docs/guide/use/setting/admin.md) | |
| P2 镜像与服务商 | 镜像发布通道、SQLite 写入错误排查、已确认的服务商部署设置。[镜像说明](docs/guide/image.md) · [Docker 部署](docs/guide/install/docker/) · [任务插件](docs/guide/plugins/deploy.md) | iKuai 和金山云 KCM SLB 的正式插件名、安装入口和版本限制。SQLite 切换 slim 镜像的效果仍待在出现相同错误的环境中实测。 |

截图暂缓，位置已用 Markdown 注释标记。后续补图时可按占位说明标注页面入口和关键字段。

## P0 现有说明与升级影响

| 待办 | 建议更新位置 | 核对依据 |
| --- | --- | --- |
| 安全中心仍写扫描达到阈值就自动封禁 24 小时。更新为 `v1.47.2` 已暂停扫描触发的自动封禁，持续提供风险记录和手动处置。说明普通版可看安全摘要，专业版可看详情、调整检测设置并处置风险。 | [站点安全](docs/guide/feature/safe/index.md)、[版本权益](docs/guide/donate/index.md) | `v1.46.1–v1.47.2`，`78bc89a0e`、`f95ed3b4c`，商业版提交 `c6e443a` |
| Lego 证书申请仍被目录推荐。标记暂停使用，补已有流水线迁移到 JS 版证书申请的步骤。 | [任务插件](docs/guide/plugins/deploy.md)、[版本升级](docs/guide/install/upgrade.md) | `v1.45.6`，`bec2f11ec`、`4ce4d4f6c` |
| 证书申请任务移除了 `certZip` 输出。补使用旧输出的流水线和自定义插件的迁移说明。流水线页面在下载时打包，邮件部署任务根据证书对象生成附件，自定义插件需要压缩包时可用 `CertReader.buildZip()`。 | [版本升级](docs/guide/install/upgrade.md)、[插件开发](docs/guide/use/dev/plugin.md) | `v1.42.0`，`7cff1a984` |
| `v1.38.0` 改为按元数据加载插件，`@certd/plugin-cert` 和 `@certd/plugin-lib` 的部分实现移入服务端。补自定义插件升级时如何识别受影响的引用，给保留的包导出和从服务端加载模块各举一个迁移例子，说明 `v1.38.1` 引入的 `_ctx.import("/@/...")`。 | [版本升级](docs/guide/install/upgrade.md)、[插件开发](docs/guide/use/dev/plugin.md) | `a3fb24993`、`9eace86ae` |
| 「腾讯云-更新证书(Id不变)」已下架，目录仍描述可用于 CLB。标记下架，链接现有 CLB 部署流程。 | [任务插件](docs/guide/plugins/deploy.md)、[版本升级](docs/guide/install/upgrade.md) | `v1.39.13`，`490b72480` |
| `v1.39.0` 将 API 错误消息字段从 `msg` 改为 `message`。补响应结构、错误响应示例和升级迁移说明。跨版本调用方可优先读取 `message`，并兼容旧实例的 `msg`。 | [开放接口](docs/guide/open/index.md)、[版本升级](docs/guide/install/upgrade.md) | `v1.39.0`，`51ab6d6da`，`v1.47.2` 的 `Result` 仍使用 `message` |
| FAQ 仍称不支持 IP 证书。改成指向现有申请指南，补短有效期和续期配置，按当前代码说明自动换算何时生效。 | [常见问题](docs/guide/qa/use.md)、[IP 证书申请](docs/guide/use/cert/ip.md) | 属于两轮审查发现的旧文档冲突，续期逻辑见 `v1.42.0` 的 `56e5524a0` |
| 企业模式指南仍写商业版无法启用。现行界面允许具备专业版权益的实例选择企业模式，并对商业版显示适用场景提示。文档需说明版本权限、项目资源和个人数据迁移入口。 | [企业模式](docs/guide/use/mode/enterprise.md)、[商业版](docs/guide/use/comm/index.md) | `v1.39.11` 放开限制，`ab4373b26`，`v1.40.1` 后续调整 `6450d2bd5` |

## P1 操作指南

| 待办 | 建议更新位置 | 核对依据 |
| --- | --- | --- |
| 自定义 ACME 和 EAB。补「系统设置 → 流水线设置 → 自定义 ACME 管理」、Directory URL、CA 对应的 ACME 账号、按需配置 EAB。补旧 ACME 反向代理启动迁移和编辑入口，以及更换 EAB `kid` 后重新生成账号私钥。 | 从[快速开始](docs/guide/start.md)和 [Google EAB](docs/guide/use/google/index.md)链接证书申请指南，[版本升级](docs/guide/install/upgrade.md)补迁移说明 | `v1.44.0–v1.44.4`，`97c417b1a`、`c57110e42`、`6a649aaca` |
| DNS 持久验证。补 Google 证书的完整例子，覆盖 ACME 账号、`_validation-persist` TXT 记录校验和续期时的记录复用。 | [Google EAB](docs/guide/use/google/index.md)或证书申请指南 | `v1.41.0` 引入，`v1.45.0` 支持 Google，`67b05e2d7`、`97d2b5007` |
| 域名映射。补域名管理的「映射域名」字段、DNS 授权配置和 TXT 记录示例，并关联 CNAME 代理及二级子域名托管。 | 域名管理指南、[CNAME 代理](docs/guide/feature/cname/index.md)、[二级子域名托管](docs/guide/use/cert/subdomain.md) | `v1.47.2`，`edae6006d` |
| DNS 和 HTTP 验证排查。补「流水线设置 → 从权威 NS 检查 TXT 记录」及适用的网络故障场景。关闭后 Certd 仍用本地解析器检查 TXT。补子域名托管的通配符配置，以及 HTTP-01 通过 SFTP/SCP 上传验证文件时的授权、Web 根目录和外部访问测试。 | [常见问题](docs/guide/qa/use.md)、[二级子域名托管](docs/guide/use/cert/subdomain.md)、证书申请指南 | `v1.38.8`、`v1.38.10`、`v1.39.12`，`3f7ac9393`、`4eb940ffe`、`1aa50cf53` |
| 证书链与上传托管。补 Let's Encrypt 和 Google Trust Services 可选的首选证书链，说明系统默认选项与兼容性考虑。补「已有证书托管」的到期前提醒阈值，说明证书已过期或进入阈值时任务报错并停止部署，上传替换证书后如何再次运行。 | 证书申请指南、[Google EAB](docs/guide/use/google/index.md)、[任务插件](docs/guide/plugins/deploy.md) | `v1.36.20–v1.36.23`，`902359f24`、`e31d26a88`、`3d42bfd47` |
| 流水线编辑与后置任务。补批量修改申请参数及成功通知、导出、历史保留设置和申请失败重试。新增流水线的历史默认值为 100。补后置任务成功、失败和手动标记成功三种触发方式，以及后置任务失败对运行结果和通知的影响。说明「吊销旧证书」只处理同一申请任务产生的已替换证书，吊销前核对仍在使用旧证书的部署。 | 新增流水线指南，从[任务插件](docs/guide/plugins/deploy.md)链接 | `v1.39.13–v1.45.1`，`63be1c1cb`、`99fd3083f`、`d3e4677ea`、`0ddb1f69d`、`e5a184485`、`1cc9641f5`、`22715a430` |
| 证书申请参数模板和 OpenAPI。补模板的创建、设为默认、创建流水线时选择，以及 OpenAPI 显式传 `autoApplyTemplateId` 时的模板作用、`autoApplyParams` 覆盖顺序和申请中响应。补按域名查询时优先选择匹配范围较小的证书，用具体域名与通配符举例。列出 `pipelineId`、`format`（含 `p7b`）、响应 `detail.id/domains/notAfter`、`POST /api/v1/notification/send`、OpenKey 的用途备注和「返回证书密码」开关。按实际鉴权说明密钥权限范围，企业模式使用密钥绑定的项目，非企业模式禁止指定项目 ID。 | [开放接口](docs/guide/open/index.md)、流水线指南 | `v1.36.18–v1.45.5`，`2085bcceb`、`f8b71a0e6`、`6339cdffa`、`edb249c2a`、`bbeaf617d`、`3e001b8ba`、`f50651ef9`、`cc1c9c7fe` |
| Certd Client 接入。补从创建 OpenKey、配置客户端到确认首次同步的步骤，以及站点数量和心跳状态。客户端页面说明每 10 分钟上报，超过 30 分钟未上报标记离线。 | [开放接口](docs/guide/open/index.md)的客户端小节，或单独的客户端指南 | `v1.45.0–v1.45.1`，`3dbbe72fc`、`3e001b8ba` |
| 证书拉取托管、SSH 跳板机。给出 PEM 完整链和私钥的拉取及下游部署示例，按插件表单列出 HTTP/HTTPS、阿里云 OSS、腾讯云 COS、七牛云 KODO、S3/MinIO、SFTP、FTP。SSH 指南补先创建跳板机 SSH 授权、再在目标授权中引用的步骤。 | [任务插件](docs/guide/plugins/deploy.md)、[授权列表](docs/guide/plugins/access.md)及证书、主机部署指南 | `v1.43.0`、`v1.46.1`，`2cb4e551f`、`1b8565443` |
| 站点证书监控与后台管理。补创建流水线时添加监控的专业版开关、证书到期提醒天数、批量导入的分组和备注。补 DNS 批量导入的授权、支持的服务商、跳过记录和导入结果，以及站点导出、筛选、手动检查和指定 IP 检查。说明管理员管理用户流水线和站点的入口，以及下载用户证书需要用户在「设置 → 授权委托」开启对应权限。 | 新增站点监控指南，关联流水线和系统管理 | `v1.37.2–v1.46.1`，`cd35568e0`、`59ba40807`、`77b4a1eaf`、`2ed12c429`、`83d81b64b`、`021155278`、`99fd3083f`、`f9541fab7`、`7cff1a984`、`f60e63fba`、`c81d40611` |
| 域名注册到期监控。说明注册到期与 TLS 证书到期各自的检查入口。补专业版开启方式、提前提醒天数、定时、通知渠道，以及在「监控执行记录」区分域名到期检查与站点证书检查。 | 域名管理和站点监控指南 | `v1.39.9`，`c6628e731`、`b5cc79406` |
| 域名和 CNAME 记录批量管理。补选择 DNS 提供商授权导入注册域名、查看导入进度、同步到期时间和在申请表单选用域名。CNAME 代理补每行一个域名、泛域名去掉 `*.`、跳过已有项、选择 CNAME 服务及导出记录。 | 域名管理指南、[CNAME 代理](docs/guide/feature/cname/index.md) | `v1.38.2–v1.38.3`，`f4423638a`、`607afe864`、`a97cee84f`、`7058d5cb9`、`40be42406` |
| 流水线触发与排队。补 Webhook 触发器的创建、每条流水线一个地址、支持 GET 和 POST、重生成后旧地址失效、保护触发地址。在流水线指南区分触发用 Webhook、通知 Webhook 和证书部署 Webhook。补定时流水线按用户排队、并发默认值为 10、批量清除定时／随机分配时间，以及普通运行和强制重新运行的区别。 | 流水线指南、[强制重新执行](docs/guide/use/rerun/index.md) | `v1.37.16–v1.38.0`，`63d8bcf88`、`888d9591f`、`cd944882c`、`d0f653da9`、`039c62b09`、`1a2954114`、`840bd5267`、`6c39d7b1e` |
| 企业项目协作。补申请加入与审批、项目成员的查看／编辑／管理权限，以及个人数据迁移和跨项目批量转移的步骤。核对迁移范围、目标项目权限和依赖授权复制规则。 | [企业模式](docs/guide/use/mode/enterprise.md) | `v1.39.0–v1.39.2`，`37340838b`、`c6ca83273`、`8a3841f63` |
| SQLite 远程备份。补「OSS 上传 → SCP」入口、来源授权、远端目录和恢复演练，更新只有截图的备份方式小节。 | [数据库备份](docs/guide/use/backup/index.md) | `v1.38.10`，`66ac4716f` |
| 邮件模板。补系统邮件模板的配置入口和测试邮件发送流程，分别介绍通用、流水线结果、验证码、找回密码、证书附件模板及各自的变量。写清楚「发送证书到邮箱」任务与系统证书邮件模板的关系。 | [邮箱配置](docs/guide/use/email/index.md)、[任务插件](docs/guide/plugins/deploy.md) | `v1.37.16–v1.38.0`，`a6c0d2c6f`、`c5a3003cf`、`cabc4da3a` |
| 插件运行时依赖。补首次使用插件时如何按需安装、npm 镜像连通性、默认缓存目录 `data/.runtime-deps`，以及在插件管理清理第三方依赖缓存后重启 Certd 再试的步骤。 | [Docker 部署](docs/guide/install/docker/index.md)、[常见问题](docs/guide/qa/use.md)、[插件开发](docs/guide/use/dev/plugin.md) | `v1.42.0` 引入，`01568ca14`，后续 `2d0b85b30`、`912b285c5` |
| 插件市场和 AI 插件开发。补搜索、安装、依赖、同步、批量升级、卸载，覆盖通知插件及受限令牌开发、测试、发布和送审。 | [插件开发](docs/guide/use/dev/plugin.md)，增加插件市场入口 | `v1.44.0–v1.45.1`，`255960d43`、`e79660c5d`、`5bff2c8fa`、`6f9dffe6e`、`3a9069f6e`、`41ca19811` |
| Passkey 与第三方登录。补 HTTPS、注册入口、一个实例用多个域名访问时每个域名分别注册 Passkey，以及换域名后重新注册。当前系统设置提示写的是主绑定域名，服务端实际取本次请求的 Origin 主机名，应一并校正文档。为 GitHub、Google、Microsoft 分别补应用注册和回调地址，并补彩虹登录多个渠道、自动注册用户设置初始密码及已有的重启后 10 分钟密码登录恢复流程。 | [第三方登录](docs/guide/use/setting/oauth.md)、[站点安全](docs/guide/feature/safe/index.md)、[无法登录](docs/guide/use/forgotpasswd/index.md) | `v1.38.6–v1.46.1`，`693a4a663`、`beb7a4c99`、`10b7644bb`、`7aa0c7e49`、`a815d0245`、`79f65868c`、`d176f9cc0`、`1d12ad73c`、`2a38b32c2` |
| 安全中心、审计日志与网络设置。补风险状态筛选和批量标记、查看加密密钥的 2FA、关闭 2FA 时验证登录密码、清理 90 天前的审计日志。补反向代理下来源 IP 的确认方式、HTTP/HTTPS 出站代理的 `NO_PROXY` 格式、公共请求头配置的作用范围和敏感信息限制。 | [站点安全](docs/guide/feature/safe/index.md)、[Docker 部署](docs/guide/install/docker/index.md)或新增网络设置指南 | `v1.39.15–v1.47.2`，`aad9045de`、`c0df8be83`、`178f9b1e9`、`a32a9f98b`、`31ab2395e`、`ab18c465c`、`08e503149`、`8a309658d` |
| 统一登录与验证码。第三方登录页补 OIDC 的服务地址、Client ID、回调和自动注册用户名规则，再补 Gitee、微信扫码和彩虹聚合登录。站点安全页补 Cloudflare Turnstile 的站点密钥配置与启用前测试入口。 | [第三方登录](docs/guide/use/setting/oauth.md)、[站点安全](docs/guide/feature/safe/index.md) | `v1.37.11–v1.38.4`，`ec75afbc4`、`fbf12f16b`、`b6fea0c85`、`73325aaef`、`5cee7d44f`、`6f186932c`、`ca43c7752` |
| 注册、验证码与找回密码。补图片、极验及腾讯云验证码的配置和登录启用前测试，说明重置管理员密码会关闭验证码，恢复后需重新启用。商业版补手机注册与登录开关、腾讯云等短信渠道和测试发送步骤。 | [站点安全](docs/guide/feature/safe/index.md)、[无法登录](docs/guide/use/forgotpasswd/index.md)、[商业版](docs/guide/use/comm/index.md) | `v1.36.14–v1.37.3`，`81ac240ac`、`9108459ae`、`7bdde68ec`、`03f317ffd`、`83e647640`、`03899d4d9`、`6b2f1fcd3` |
| 部署健康检查与连通性排查。给 Docker 健康检查和 Kubernetes 探针示例，使用现行路径 `/health/liveliness` 和 `/health/readiness`。说明两者当前均返回 `ok`，用于确认应用 HTTP 接口可响应。补「系统管理 → 网络测试」的域名解析、Ping、TCP 端口和容器网络信息，给部署目标连不上的排查顺序。 | [Docker 部署](docs/guide/install/docker/index.md)、[常见问题](docs/guide/qa/use.md) | `v1.36.19`、`v1.37.2`，`44019e104`、`2bef608e0` |
| 商业版运营。补管理员生成套餐激活码、用户兑换、套餐叠加和泛域名配额。补邀请推广、佣金等级、提现审核、余额流水和管理员充值，区分后台配置和用户操作。 | [商业版](docs/guide/use/comm/index.md)增加套餐和推广、钱包指南 | `v1.40.1–v1.44.4`，`c63745d1b`、`f1d2a1033`、`5096df5cc`、`81d6289a8`、`83a5a21f9`、`bded368cb` |

## P2 现有页面补充

- **升级和镜像。** [自动升级](docs/guide/install/auto.md)已存在，补到[版本升级](docs/guide/install/upgrade.md)入口。统一自动升级、[Docker 部署](docs/guide/install/docker/index.md)和[镜像说明](docs/guide/image.md)中的镜像地址和发布通道，按发布工作流及仓库实际发布标签复核 ARMv7 稳定标签。按实测补 SQLite 磁盘 I/O 用 slim 镜像排查的说明。依据 `229f22d5a`、`b91c9e4ea`、`15740904e` 和 `.github/workflows/stable-release.yml`。
- **插件配置。** 在[任务插件](docs/guide/plugins/deploy.md)和相关服务商指南中，补火山引擎 VKE 按 Ingress 或 Secret 替换及两种字典类型、ALB 的默认证书和扩展证书、点播的自定义源站，宝塔全自动部署对 Docker 站点的支持，网宿鉴权兼容，UCloud US3 地域，京东云 CDN 跳转，以及阿里云 ESA 证书模式的选择说明。依据 `b8a64a6b5`、`77b802445`、`0a068a274`、`095791cdc`、`61ef97151`、`241b2e558`、`8165a5ff8`、`e9921928d`、`82276b53a`。
- **域名和首页。** 补域名到期同步进度、备注和到期排序，以及首页启用开关、隐藏首页插件列表的设置入口。依据 `9d2937dd4`、`e4041eabe`、`a9bbe7722`、`25ad1e6f8`、`abaf374a4`。
- **部署选项。** 1Panel 补面板证书的 Mux 模式和版本要求、站点任务先上传再选择证书的流程。阿里云 CDN/DCDN 补手动选择和按证书域名自动匹配两种模式、后续新增域名的行为。APISIX 补 v2 配置。依据 `d05129ec6`、`7a9eec88e`、`a68301e4d`、`c6a988bc9`、`23b465867`。建议更新 [1Panel 部署](docs/guide/install/1panel/index.md)、[阿里云相关](docs/guide/use/aliyun/index.md)、[任务插件](docs/guide/plugins/deploy.md)。
- **流水线和站点设置。** 补任务步骤复制粘贴、串行提示、下次执行时间、从模板创建时随机分配触发时间，以及在授权页先测试连接。补站点绑定地址修改入口、自定义页脚和发件人显示名的 `名称<邮箱>` 格式。依据 `acc2df29d`、`787f6ef52`、`a3cabd5f3`、`575415b93`、`7a3e68d65`、`11b7cfe5c`、`c985a1354`、`bab9adce2`。建议更新流水线指南、[授权列表](docs/guide/plugins/access.md)及[邮箱配置](docs/guide/use/email/index.md)。
- **发布前复核。** iKuai 和金山云 KCM SLB 的提交标题指向新能力，仓库代码可见通用支持或授权调整。写入公开目录前，仍待核对插件市场的正式名称、安装入口和版本限制。依据 `5f8369342`、`62751bee7`。
- **看站点、绑定地址和公告。** 在站点监控指南补指定 IP 的自动同步及「忽略证书一致性」的行为，在站点设置补系统公告和两个绑定地址的用途，并介绍授权委托给管理员查看／下载证书的入口。依据 `52689049a`、`26f75c71b`、`a79fe1f35`、`a2e9a41a7`、`1347355cb`。
- **证书来源和部署。** 在[阿里云相关](docs/guide/use/aliyun/index.md)补订阅证书 API 1.0／2.0 对应的订单或实例选择，以及 ESA 证书数量上限与旧证书清理行为。证书申请指南补 LiteSSL、SSL.com 的 ECC 选项和 Let's Encrypt 测试环境申请 IP 证书。SSH 指南说明 PPK 解析来自 Dockerfile 中的补丁，其他部署方式的支持情况需单独核对。依据 `887246696`、`64b3184b2`、`230256793`、`6be759133`、`b5ec04723`、`86ce00adf`、`575ae164c`。
- **CNAME 与子域名托管。** 补如何选用有权限的 CNAME 服务，以及更改子域名托管后如何重置已有 CNAME 记录的校验状态并重试。依据 `9cc5f0f88`、`54c8d6224`。建议更新 [CNAME 代理](docs/guide/feature/cname/index.md)、[二级子域名托管](docs/guide/use/cert/subdomain.md)。
- **主机与集群部署。** 补 SSH 脚本解释器及执行超时、群晖请求超时配置、Kubernetes Secret 自动创建与 ACK/TKE 的 Ingress 重载选项，以及腾讯云国际站和到期通知开关。依据 `ae41c6038`、`c24a040c1`、`b3814920b`、`c09c962cb`、`95715a007`、`58e82d5db`、`a77c77798`。建议更新 [授权列表](docs/guide/plugins/access.md)、[群晖部署](docs/guide/use/synology/index.md)、[腾讯云相关](docs/guide/use/tencent/index.md)和[任务插件](docs/guide/plugins/deploy.md)。
- **通过 Webhook 部署证书。** 补在流水线中选择前置证书输出、填写请求方法与请求头、配置证书和私钥模板的示例。使用示例接收端和占位值，说明接收端应如何接收证书与私钥。依据 `v1.36.15` 的 `cbe0b1c5a` 和后续模板换行修复 `2735feb33`。建议更新[任务插件](docs/guide/plugins/deploy.md)。

## 已有说明

- Fastly、Dynadot、橙域网络、阿里云直播已有插件条目。阿里云 ESA 的边缘证书与 SaaS 证书两种模式已列出，配置步骤可按需扩充。
- Docker 安装已介绍稳定版和预览版，数据库指南已有 MariaDB 配置和 PostgreSQL 迁移后的序列修复。商业版插件下拉选项映射及仅第三方登录的恢复窗口已有独立说明。
- Docker 一键安装、Certd 自身 HTTPS 证书更新和 Azure DNS 已有操作说明。Google Cloud DNS、BIND9、Technitium、Nginx Proxy Manager、Next Terminal 和阿里云 WAF 两种接入方式已有插件条目。Swagger 的组件注册在当前代码中仍处于注释状态，公开接口指南应以已发布的接口入口为准。依据 `dc969dd7e`、`3cd1aaeb0`、`1f1d68731`、`684964da4`。
- 群晖 `:delegated`、1Panel 应用商店安装、流水线有效期和 ESXi 部署已有指南。K8S 自定义 YAML、OpenWrt、AcePanel、GoEdge、Zenlayer、中国移动 CDN 和 AWS Route53 已有插件条目。
- 宝塔动态 IP 白名单和 IPv6 网络已有配置说明。任务插件目录已标注数据库备份仅管理员可用，通知插件目录已收录 MeoW 和 OneBot V11。

下次继续回溯可从 `v1.36.9` 开始，比较时取其前一个现有标签 `v1.36.7` 作为基线。
