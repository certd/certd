# google证书申请教程

## 1、启用API
打开如下链接，启用 API

https://console.cloud.google.com/apis/library/publicca.googleapis.com

打开该链接后点击“启用”，随后等待右侧出现“API已启用”则可以关闭该页。

## 2、 申请Key
随后打开“Google Cloud Shell”（在右上角点击激活CloudShell图标）。

等待分配完成后在 Shell 窗口内输入如下命令：
    
```shell
gcloud beta publicca external-account-keys create
```
此时会弹出“为 Cloud Shell 提供授权”，点击授权即可。

执行完成后会返回类似如下输出；注意不要在没有收到 Google 的邮件时执行该命令，会返回命令不存在。

```shell
Created an external account key
[b64MacKey: xxxxxxxxxxxxx
keyId: xxxxxxxxx]
```
记录以上信息备用


## 3、 创建证书流水线
选择证书提供商为google， 开启使用代理

## 4、 将key信息作为EAB授权信息
google证书需要EAB授权， 使用第二步中的 keyId 和 b64MacKey 信息创建一条EAB授权记录      

## 5、 其他就跟正常申请证书一样了

