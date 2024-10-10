# google证书申请教程

## 1、启用API
打开如下链接，启用 API

https://console.cloud.google.com/apis/library/publicca.googleapis.com

打开该链接后点击“启用”，随后等待右侧出现“API已启用”则可以关闭该页。

## 2、 获取授权
以下两种方式任选其一
### 2.1 直接获取EAB

1. 打开“Google Cloud Shell”（在右上角点击激活CloudShell图标）。   
等待分配完成后在 Shell 窗口内输入如下命令：
    
```shell
gcloud beta publicca external-account-keys create
```
2. 此时会弹出“为 Cloud Shell 提供授权”，点击授权即可。    
执行完成后会返回类似如下输出；注意不要在没有收到 Google 的邮件时执行该命令，会返回命令不存在。

```shell
Created an external account key
[b64MacKey: xxxxxxxxxxxxxxxx
keyId: xxxxxxxxxxxxx]
```

3. 到Certd中，创建一条EAB授权记录，填写keyId(=kid) 和 b64MacKey 信息    
   注意：keyId没有`]`结尾，不要把`]`也复制了   


### 2.2 通过服务账号获取EAB

此方式可以自动EAB，需要配置代理

1. 创建服务账号    
https://console.cloud.google.com/projectselector2/iam-admin/serviceaccounts/create?walkthrough_id=iam--create-service-account&hl=zh-cn#step_index=1

2. 选择一个项目，进入创建服务账号页面
3. 给服务账号起一个名字，点击`创建并继续`
4. 向此服务账号授予对项目的访问权限： `选择角色`->`基本`->`Owner`
5. 点击完成
6. 点击服务账号，进入服务账号详情页面
7. 点击`添加密钥`->`创建新密钥`->`JSON`，下载密钥文件
8. 将json文件内容粘贴到 certd中 Google服务授权输入框中


## 3、 创建证书流水线
选择证书提供商为google， 选择EAB授权 或 服务账号授权

## 4、 其他就跟正常申请证书一样了

