# 切换数据库

certd支持如下几种数据库：
1. sqlite3 (默认)
2. mysql 
3. postgresql
   
您可以按如下两种方式切换数据库


## 一、全新安装
::: tip   
以下按照`docker-compose`安装方式介绍如何使用mysql或postgresql数据库    
如果您使用其他方式部署，请自行修改对应的环境变量即可。   
:::

### 1.1、使用mysql数据库

1. 安装mysql，创建数据库 `(注意：charset=utf8mb4, collation=utf8mb4_bin)`
2. 下载最新的docker-compose.yaml
3. 修改环境变量配置
```yaml
services:
  certd:
    environment:
      # 使用mysql数据库，需要提前创建数据库 charset=utf8mb4, collation=utf8mb4_bin
      - certd_flyway_scriptDir=./db/migration-mysql                     # 升级脚本目录 【照抄】
      - certd_typeorm_dataSource_default_type=mysql                     # 数据库类型， 或者 mariadb 
      - certd_typeorm_dataSource_default_host=localhost                 # 数据库地址
      - certd_typeorm_dataSource_default_port=3306                      # 数据库端口
      - certd_typeorm_dataSource_default_username=root                  # 用户名
      - certd_typeorm_dataSource_default_password=yourpasswd            # 密码
      - certd_typeorm_dataSource_default_database=certd                 # 数据库名

```
4. 启动certd
```shell
docker-compose up -d
```


### 1.2、使用Postgresql数据库

1. 安装postgresql，创建数据库
2. 下载最新的docker-compose.yaml
3. 修改环境变量配置
```yaml
services:
  certd:
    environment:
      # 使用postgresql数据库，需要提前创建数据库
      - certd_flyway_scriptDir=./db/migration-pg                        # 升级脚本目录 【照抄】
      - certd_typeorm_dataSource_default_type=postgres                  # 数据库类型 【照抄】
      - certd_typeorm_dataSource_default_host=localhost                 # 数据库地址
      - certd_typeorm_dataSource_default_port=5433                      # 数据库端口
      - certd_typeorm_dataSource_default_username=postgres              # 用户名
      - certd_typeorm_dataSource_default_password=yourpasswd            # 密码
      - certd_typeorm_dataSource_default_database=certd                 # 数据库名

```
4. 启动certd
```shell
docker-compose up -d
```

## 二、从旧版的sqlite切换数据库

从旧版`sqlite`迁移到`mysql`或`postgresql`数据库

下面以 `SQLite` 转 `MySQL` 为例进行演示

![db-0.png](images/db-0.png)

#### 0.前提条件： 
1. SQLite版Certd站点已经`升级到最新版` （`建议：备份sqlite数据库` ）
2. `全新安装`MySQL版本Certd（`确保是全新的，因为里面的数据会被清空覆盖`）
3. 两套Certd站点版本一致

#### 1. 安装DBeaver工具

[https://dbeaver.io/download/](https://dbeaver.io/download/)

![db-1.png](images/db-1.png)

#### 2. 连接到sqlite数据库

![db-2.png](images/db-sqlite-1.png)

![db-3.png](images/db-sqlite-2.png)

#### 3. 连接到mysql或postgresql数据库

![db-4.png](images/db-mysql-1.png)

![db-5.png](images/db-mysql-2.png)


#### 4. 开始同步数据

选择mysql数据库，选择所有的表（`flyway_history除外`），右键导入数据

> 切记flyway_history数据表不要导入

![db-6.png](images/db-sync-1.jpg)
![db-7.png](images/db-sync-2.png)
![db-8.png](images/db-sync-3.png)
下一步、下一步，直到数据加载设置，勾选`在加载前截断目标表`（此选项很重要，并且会清空mysql certd数据库中的数据）
![db-7.png](images/db-sync-4.png)

#### 5. 导入完成

![db-9.png](images/db-success.png)

#### 6. 重启MySQL版本Certd

访问MySQL版本测试，数据已成功迁移     

确认没有问题之后，删除旧版certd


## 三、问题

### 1. 迁移到PG之后，所有表的Sequence会从1开始

执行如下sql 语句，批量将所有表的id自增设置到当前数据的最大值
```sql
DO $$
DECLARE
    rec RECORD;
    seq_name TEXT;
    max_id BIGINT;
BEGIN
    -- 遍历所有用户表（排除系统schema）
    FOR rec IN 
        SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_type = 'BASE TABLE'
          AND table_schema NOT IN ('pg_catalog', 'information_schema')
    LOOP
        -- 检查表是否存在名为 'id' 的列
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = rec.table_schema 
              AND table_name = rec.table_name 
              AND column_name = 'id'
        ) THEN
            -- 获取该列关联的序列名（如果是 serial 或 identity 列）
            seq_name := pg_get_serial_sequence(
                quote_ident(rec.table_schema) || '.' || quote_ident(rec.table_name), 
                'id'
            );
            
            IF seq_name IS NOT NULL THEN
                -- 查询当前表中 id 的最大值
                EXECUTE format('SELECT MAX(id) FROM %I.%I', rec.table_schema, rec.table_name) INTO max_id;
                
                IF max_id IS NULL THEN
                    -- 表为空，将序列重置为初始值 1（下次调用 nextval 返回 1）
                    PERFORM setval(seq_name, 1, false);
                    RAISE NOTICE '表 %.% 为空，序列 % 已重置为 1', rec.table_schema, rec.table_name, seq_name;
                ELSE
                    -- 将序列当前值设置为最大值，下次调用 nextval 返回 max_id + 1
                    PERFORM setval(seq_name, max_id, true);
                    RAISE NOTICE '表 %.% 的序列 % 已设置为 %', rec.table_schema, rec.table_name, seq_name, max_id;
                END IF;
            END IF;
        END IF;
    END LOOP;
END $$;

```