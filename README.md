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
生成的证书默认会存储在 `${home}/.certd/${email}/certs/${domain}/current`目录下 
```
[2021-01-08T16:15:04.681] [INFO] certd - 任务完成
[2021-01-08T16:15:04.681] [INFO] certd - ---------------------------任务结果总览--------------------------
[2021-01-08T16:15:04.682] [INFO] certd - 【更新证书】---------------------------------------	[success]   证书申请成功
[2021-01-08T16:15:04.682] [INFO] certd - 【流程1-部署到阿里云CDN】----------------------------	[success]  	执行成功
[2021-01-08T16:15:04.682] [INFO] certd -    └【上传到阿里云】--------------------------------	[success]  	执行成功
[2021-01-08T16:15:04.682] [INFO] certd -    └【部署证书到CDN】-------------------------------	[success]  	执行成功
```
第一次运行会记住成功后的结果，成功过的任务不会重复执行

## CI/DI集成与自动续期重新部署
集成前，将以上代码提交到内网git仓库，或者私有git仓库（由于包含敏感信息，不要提交到公开git仓库）

### jenkins任务
1. 创建任务     
选择构建自由风格的任务     

2. 配置git    
配置cert-run的git地址     

3. 构建触发器    
配置 `H 0 3 * * ` ，每天凌晨3天执行一次

4. 构建环境    
勾选 `Provide Node & npm bin/ folder to PATH`，提供nodejs运行环境     
如果没有此选项，需要jenkins安装`nodejs`插件

5. 构建    
执行shell
```
npm install --production   #执行过一次之后，就可以注释掉，加快执行速度
npm run post
```
6. 构建后操作     
邮件通知   
配置你的邮箱地址，可以在执行失败时收到邮件通知。
