# 版本升级

## 升级方法
根据不同部署方式查看升级方法

1. [Docker方式部署升级](./docker/#二、升级)
2. [宝塔面板方式部署升级](./baota/#三、如何升级)
3. [1Panel面板方式部署升级](./1panel/#三、升级)
4. [源码方式部署](./source/#二、升级)

::: warning   
如果您是第一次升级certd版本，切记切记先备份一下数据    
很多人docker不太会配置，数据目录没有映射出来，升级导致数据丢失
```
# docker-compose.yaml配置
- /data/certd:/app/data   #  请务必确保 /app/data 这个路径没有改动，固定写死
```
具体备份方法可以参考上面每种部署方式升级方法后面的备份章节
:::

## 升级日志
可以查看最新版本号，以及所有版本的更新日志     
[CHANGELOG](../changelogs/CHANGELOG.md)

