# CertD

CertD 是一个帮助你全自动申请和部署SSL证书的工具     
后缀D取自linux守护进程的命名风格，意为证书守护进程。

## 特性
* 自动申请证书
* 流程化部署证书（目前支持服务器上传部署、阿里云、腾讯云等）
* 可与CI/DI工具结合使用

## 快速开始
本案例演示，如何配置自动申请证书，并部署到阿里云CDN，然后快要到期前自动更新证书并重新部署    

1. 环境准备   
安装[nodejs](https://nodejs.org/zh-cn/)

2. 创建任务项目
```
mkdir certd-run # 项目名称可以任意命名
cd certd-run -y
npm install @certd/executor -s --production
```

3. 创建index.js
```js
import { Executor } from '@certd/executor'
const options =  {
    args: { // 运行时参数
        forceDeploy: true,
    },
    accessProviders: { //授权提供者
         aliyun: { // 阿里云accessKey，用于dns验证和上传证书到阿里云，并部署到cdn
          providerType: 'aliyun',
          accessKeyId: 'Your accessKeyId',
          accessKeySecret: 'Your accessKeySecret'
        },
    },
        cert: { //免费证书申请配置
            domains: [  //可以在一张证书上绑定多个域名（前提是他们的验证方式要一样，目前仅支持dns验证）
                '*.yourdomain.com',
                '*.test.yourdomain.com',
                'yourdomain.com'
            ],
            email: 'Your email',
            dnsProvider: 'aliyun', //上方accessProviders里面配置的
            csrInfo: { //证书csr信息
                country: 'CN',
                state: 'GuangDong',
                locality: 'ShengZhen',
                organization: 'Your company Org.',
                organizationUnit: 'IT Department',
                emailAddress: 'Your email'
            }
        },
        deploy: [ //部署流程配置，数组，可以配置多条流程
            { 
                deployName: '流程1-部署到阿里云CDN',
                tasks: [ //流程任务，一个流程下可以包含多个部署任务，并且将按顺序执行
                    { //任务1
                        taskName: '上传到阿里云', //任务名称
                        type: 'uploadCertToAliyun', //任务插件名称
                        props: { //任务插件参数
                            accessProvider: 'aliyun'
                        }
                    },
                     { // 任务2 
                          taskName: '部署证书到CDN',
                          type: 'deployCertToAliyunCDN', //任务插件名称
                          props:{
                            domainName: 'your cdn domain 全称', //cdn域名全称
                            certName: 'certd自动部署',//证书名称前缀
                            accessProvider: 'aliyun'
                          }
                     }
                   
                ]
            }
        ]
    
}

const executor = new Executor()
await executor.run(options)
```

4. 运行
```
node index.js
```
5. 执行效果

```
[2021-01-08T16:15:04.681] [INFO] certd - 任务完成
[2021-01-08T16:15:04.681] [INFO] certd - ---------------------------任务结果总览--------------------------
[2021-01-08T16:15:04.682] [INFO] certd - 【更新证书】---------------------------------------	[success]   证书申请成功
[2021-01-08T16:15:04.682] [INFO] certd - 【流程1-部署到阿里云CDN】----------------------------	[success]  	执行成功
[2021-01-08T16:15:04.682] [INFO] certd -    └【上传到阿里云】--------------------------------	[success]  	执行成功
[2021-01-08T16:15:04.682] [INFO] certd -    └【部署证书到CDN】-------------------------------	[success]  	执行成功
```
