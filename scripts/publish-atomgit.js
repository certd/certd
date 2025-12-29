import fs from 'fs'
import axios from 'axios'


const AtomgitAccessToken = process.env.ATOMGIT_TOKEN
// CHANGELOG.md
const changelog = fs.readFileSync('./CHANGELOG.md', 'utf8')
// 解析CHANGELOG.md
let lines = changelog.split('\n')
const versionLineIndex = lines.findIndex(line => line.startsWith('## '))
const versionLine = lines[versionLineIndex]
//  ## [1.37.16](https://github.com/certd/certd/compare/v1.37.15...v1.37.16) (2025-12-15)
const versionTitle = versionLine.match(/\[(.*?)\]/)[1]

const contentStart = versionLineIndex + 1
lines = lines.slice(contentStart)
const contentEnd = lines.findIndex(line => {
    return line.startsWith('## ')
})
const content = lines.slice(0, contentEnd).join('\n')
console.log("-------title------/n")
console.log(versionTitle)
console.log("-------content------/n")
console.log(content)

/**
 * 创建仓库Release
POST
https://api.atomgit.com/api/v5/repos/:owner/:repo/releases
Request
Path Parameters
owner
string
required
仓库所属空间地址（企业、组织或个人的地址path）

repo
string
required
仓库路径

Query Parameters
access_token
string
required
用户授权码

application/json
Body
tag_name
string
required
tag名称

name
string
required
release名称

body
string
required
release描述

target_commitish
string
分支名称或者commit SHA，如果tag不存在，需要新建tag则传入该参数，如果不传入该参数，则为默认分支的最新提交
 */

// 创建release
async function createRelease() {
    const response = await axios.request({
        method: 'POST',
        url: `https://api.atomgit.com/api/v5/repos/certd/certd/releases`,
        headers: {
            "Content-Type": "application/json"
        },
        params: {
            access_token: AtomgitAccessToken
        },
        data: {
            tag_name: `v${versionTitle}`,
            name: `v${versionTitle}`,
            body: content,
            target_commitish: 'v2'
        },
      }
    )
    console.log("createRelease success")
    return response.data
}

/**
 * 获取Release附件上传地址
GET
https://api.atomgit.com/api/v5/repos/:owner/:repo/releases/:tag/upload_url
Request
Path Parameters
owner
string
required
仓库所属空间地址（企业、组织或个人的地址path）

repo
string
required
仓库路径

tag
string
required
tag名称

Query Parameters
access_token
string
required
用户授权码

file_name
string
required
要上传的文件名称

Responses
200
Response Headers
application/json
Schema
Example (auto)
Schema
url
string
required
上传的地址，使用put请求

headers
object

 */
async function getUploadUrl() {
    const response = await axios.request({
        method: 'GET',
        url: `https://api.atomgit.com/api/v5/repos/certd/certd/releases/v${versionTitle}/upload_url`,
        headers: {
            "Content-Type": "application/json"
        },
        params: {
            access_token: AtomgitAccessToken,
            file_name: `ui-${versionTitle}.zip`
        },
      }
    )
    console.log("getUploadUrl success:",response.data?.url)
    return response.data  //  {url: string, headers: any}
}

async function uploadFile(url, headers, data) {
    const response = await axios.request({
        method: 'PUT',
        url,
        headers,
        data,
      }
    )
    return response.data
}

async function publishToAtomgit() {
    const release = await createRelease()
    const uploadUrl = await getUploadUrl()
    const fileName = `ui.zip`
    const fileData = fs.createReadStream(fileName)
    const contentLength = fs.statSync(fileName).size
    uploadUrl.headers['Content-Length'] = contentLength
    const response = await uploadFile(uploadUrl.url, uploadUrl.headers, fileData)
    console.log("uploadFile success:")
    console.log("publishToAtomgit success")
}

publishToAtomgit()