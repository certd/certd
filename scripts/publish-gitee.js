import axios from 'axios'
import { getVersionContent } from './get-new-version.js'


const GiteeAccessToken = process.env.GITEE_TOKEN
if (!GiteeAccessToken) {
    console.log("GiteeAccessToken is empty")
    throw new Error("GiteeAccessToken is empty")
}
// 创建release
async function createRelease(versionTitle, content) {
    const response = await axios.request({
        method: 'POST',
        url: `https://gitee.com/api/v5/repos/certd/certd/releases`,
        headers: {
            "Content-Type": "application/json"
        },
        data: {
            access_token: GiteeAccessToken,
            tag_name: `v${versionTitle}`,
            name: `v${versionTitle}`,
            body: content,
            target_commitish: 'v2'
        },
    })
    console.log("createRelease success")
    return response.data
}

async function publishToGitee() {
    try{
        const { versionTitle, content } = getVersionContent()
        const release = await createRelease(versionTitle, content)
        console.log("publishToGitee success")
    } catch (error) {
        console.error("publishToGitee error:", error)
    }
}

publishToGitee()
