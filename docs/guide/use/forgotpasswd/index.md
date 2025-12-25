# 忘记管理员密码
解决方法如下：

## 1. 修改环境变量
修改docker-compose.yaml文件，将环境变量`certd_system_resetAdminPasswd`改为`true`
```yaml
services:
  certd:
    environment: # 环境变量
      - certd_system_resetAdminPasswd=true
```
## 2. 重启容器
```shell
docker compose up -d
docker logs -f --tail 500 certd
# 观察日志，当日志中输出“重置1号管理员用户密码完成”，即可操作下一步
# 这里会打印1号管理员记录的用户名，如果你修改过管理员用户名，请注意查看此条日志
```
## 3. 恢复环境变量
修改docker-compose.yaml，将`certd_system_resetAdminPasswd`改回`false`

## 4. 再次重启容器
```shell
docker compose up -d
```
## 5. 默认密码登录
使用`原管理员账号/123456`登录系统，请及时修改管理员密码
> 默认管理员账号： admin
> 如果忘记管理员账号，请查看修改密码时的启动日志，会打印管理员账号名
