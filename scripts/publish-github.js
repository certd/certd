import axios from 'axios'
import { getVersionContent } from './get-new-version.js'


const GithubAccessToken = process.env.GITHUB_TOKEN
if (!GithubAccessToken) {
    console.log("GithubAccessToken is empty")
    throw new Error("GithubAccessToken is empty")
}
// 创建release
async function createRelease(versionTitle, content) {
    const response = await axios.request({
        method: 'POST',
        url: `https://api.github.com/repos/certd/certd/releases`,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${GithubAccessToken}`,
        },
        data: {
            tag_name: `v${versionTitle}`,
            name: `v${versionTitle}`,
            body: content,
            target_commitish: 'v2-dev'
        },
    })
    console.log("createRelease success")
    return response.data
}

async function publishToGithub() {
    try{
        const { versionTitle, content } = getVersionContent()
        const release = await createRelease(versionTitle, content)
        console.log("publishToGithub success")
    } catch (error) {
        if (error?.response?.data){
            console.log("publishToGithub error:",error.response.data)
        }else{
            console.log("publishToGithub error:",error)
        }
    }
}

publishToGithub()
