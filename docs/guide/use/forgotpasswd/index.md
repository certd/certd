# 忘记管理员密码
解决方法如下：

## 1. 修改环境变量
修改docker-compose.yaml文件，将环境变量`certd_system_resetAdminPasswd`改为`true`
```yaml
services:
  certd:
    environment: # 环境变量
      - certd_system_resetAdminPasswd=false
```
## 2. 重启容器
```shell
docker compose up -d
docker logs -f --tail 500 certd
# 观察日志，当日志中输出“重置1号管理员用户的密码完成”，即可操作下一步
```
## 3. 恢复环境变量
修改docker-compose.yaml，将`certd_system_resetAdminPasswd`改回`false`

## 4. 再次重启容器
```shell
docker compose up -d
```
## 5. 默认密码登录
使用`admin/123456`登录系统，请及时修改管理员密码
