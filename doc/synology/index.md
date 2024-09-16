# 群晖部署和证书更新


## 一、群晖系统上部署Certd教程

### 1. 打开Container Manager

![](./images/1.png)

### 2. 新增项目

![](./images/2.png)

### 3. 配置Certd项目

![](./images/3.png)

### 4. 外网访问设置

![](./images/4.png)

### 5. 确认项目信息

![](./images/5.png)

点击完成安装，等待certd启动完成即可

### 6. 门户配置向导【可选】

![](./images/6.png)



## 二、更新群晖证书

## 1. 前提条件
* 已经部署了certd
* 群晖上已经设置好了证书(证书建议设置好描述，插件需要根据描述查找证书)

## 2. 在certd上配置自动更新群晖证书插件
![](./images/deploy.png)