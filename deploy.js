import http from 'axios'
import fs from 'fs'
//读取 packages/core/pipline/package.json的版本号
import {default as packageJson} from './packages/core/pipeline/package.json' assert { type: "json" };

const certdVersion = packageJson.version
console.log("certdVersion", certdVersion)

// 同步npmmirror的包
async function getPackages(directoryPath) {
    return new Promise((resolve, reject) => {
        // 读取目录下的文件和目录列表
        fs.readdir(directoryPath, {withFileTypes: true}, (err, files) => {
            if (err) {
                console.log('无法读取目录:', err);
                reject(err)
                return;
            }

            // 过滤仅保留目录
            const directories = files
                .filter(file => file.isDirectory())
                .map(directory => directory.name);

            console.log('目录列表:', directories);
            resolve(directories)
        });
    })

}

async function getAllPackages() {
    const base = await getPackages("./packages/core")
    const plugins = await getPackages("./packages/plugins")
    const libs = await getPackages("./packages/libs")

    return base.concat(plugins).concat(libs)
}

async function sync() {
    const packages = await getAllPackages()
    for (const pkg of packages) {
        await http({
            url: `http://registry-direct.npmmirror.com/@certd/${pkg}/sync?sync_upstream=true`,
            method: 'PUT',
            headers: {
                "Content-Type": "application/json"
            },
            data: {}
        })
        console.log(`sync success:${pkg}`)
        await sleep(30*1000)
    }
}

// curl -X PUT https://registry-direct.npmmirror.com/@certd/plugin-cert/sync?sync_upstream=true

const certdImageBuild = "http://flow-openapi.aliyun.com/pipeline/webhook/4zgFk3i4RZEMGuQzlOcI"
const certdImageRun = "http://flow-openapi.aliyun.com/pipeline/webhook/lzCzlGrLCOHQaTMMt0mG"
const webhooks = [certdImageBuild,certdImageRun]

async function sleep(time) {
    return new Promise(resolve => {
        setTimeout(resolve, time)
    })
}

async function triggerBuild() {
    await sleep(60000)
    for (const webhook of webhooks) {
        await http({
            url: webhook,
            method: 'POST',
            headers: {
                "Content-Type": "application/json"
            },
            data: {
                'CERTD_VERSION': certdVersion
            }
        })
        console.log(`webhook success:${webhook}`)
        await sleep(30*60*1000)
    }

}

async function start() {
    // await build()
    console.log("等待60秒")
    await sleep(100* 1000)
    await sync()
    await sleep(100 * 1000)
    await triggerBuild()
}

start()


/**
 * 打包前 修改 lerna
 * nodemodules里面搜索如下
 * return childProcess.exec("git", ["add", "--", ...files], execOpts);
 *
 * ('git', ['add', '--', ...files]
 * ('git', ['add', '.']
 */
