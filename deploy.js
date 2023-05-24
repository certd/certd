const http = require("axios")
const exec = require('child_process').exec;

//builder
function execute(cmd){
    return new Promise((resolve,reject)=>{
        console.log("cmd executing: " + cmd)
        exec(cmd, function(error, stdout, stderr) {
            if(error){
                console.error(error);
                console.info(stderr)
                reject(error)
            }
            else{
                console.info(stdout)
                console.log("success");
                resolve(true)
            }
        });
    })
}

async function build(){
    await execute("cd ./packages/fast-admin/fs-admin-antdv/ && npm run build")
    await execute("cd ./packages/fast-admin/fs-admin-element/ && npm run build")
    await execute("cd ./packages/fast-admin/fs-admin-naive-ui/ && npm run build")
    await execute("npm run docs:build")
}



// trigger

const naive = "http://flow-openapi.aliyun.com/pipeline/webhook/Zm3TJyDtyFZgV4dtJiD1"
const doc = "http://flow-openapi.aliyun.com/pipeline/webhook/soOYdQ5sF3kLjTPJGmIO"
const antdv = "http://flow-openapi.aliyun.com/pipeline/webhook/HiL0uVYxfUnBzIMJZVXB"
const element = "http://flow-openapi.aliyun.com/pipeline/webhook/uFTI0XJ9RgqnofX7jpRD"

const webhooks = [doc,naive,antdv,element]

async function sleep(time){
    return new Promise(resolve => {
        setTimeout(resolve,time)
    })
}

async function trigger(){
    for (const webhook of webhooks) {
        await http({
            url:webhook,
            method:'POST',
            headers:{
                "Content-Type": "application/json"
            },
            data:{}
        })
        console.log(`webhook success:${webhook}`)
        await sleep(1000)
    }

}

async function  start(){
    // await build()
    console.log("等待60秒")
    await sleep(60*1000)
    await trigger()
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
