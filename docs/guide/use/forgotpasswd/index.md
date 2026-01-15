# 忘记密码/无法登录

无法登录的情况：
1、忘记管理员密码
2、仅有第三方登录，但第三方登录失效，导致无法登录

请查看如下方法恢复的登录

## 一、忘记管理员密码
解决方法如下：

### 1. 修改环境变量

docker部署的：
修改docker-compose.yaml文件，将环境变量`certd_system_resetAdminPasswd`改为`true`
```yaml
services:
  certd:
    environment: # 环境变量
      - certd_system_resetAdminPasswd=true
```

源码部署的，修改`packages/ui/certd-server/.env`文件  

```ini
certd_system_resetAdminPasswd=true
```

### 2. 重启容器
```shell
docker compose up -d
docker logs -f --tail 500 certd
# 观察日志，当日志中输出“重置1号管理员用户密码完成”，即可操作下一步
# 这里会打印1号管理员记录的用户名，如果你修改过管理员用户名，请注意查看此条日志
```
### 3. 恢复环境变量
修改docker-compose.yaml，将`certd_system_resetAdminPasswd`改回`false`

### 4. 再次重启容器
```shell
docker compose up -d
```
### 5. 默认密码登录
使用`原管理员账号/123456`登录系统，请及时修改管理员密码
> 默认管理员账号： admin
> 如果忘记管理员账号，请查看修改密码时的启动日志，会打印管理员账号名


## 二、仅有第三方登录，没有登录窗口

当开启仅使用第三方登录模式时，如果第三方登录未配置或已失效，则会导致无法登录

您可以通过访问 `http://你的certd地址/#/login?oauthOnly=false` 来临时关闭仅使用第三方登录模式，以使用密码登录。