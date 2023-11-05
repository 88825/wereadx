import {dotenv} from "../src/deps.ts"


const env = await dotenv.load()
Deno.env.set('DENO_KV_ACCESS_TOKEN', env["DENO_KV_ACCESS_TOKEN"])

const kv = await Deno.openKv(
    "https://api.deno.com/databases/df3a6e8b-c7c3-4705-a66a-d69aa58e117e/connect",
);


/**
 * 清理无效用户 Credentials 数据
 */
async function removeUnusedCredentials() {
    const validTokens = []
    for await (const res of kv.list({prefix: ["vid"]})) {
        validTokens.push(res.value)
    }

    for await (const res of kv.list({prefix: ["credentials"]})) {
        if (!validTokens.includes(res.key[1])) {
            console.log('delete', res.key)
            await kv.delete(res.key);
        }
    }
}

/**
 * 清理下载凭证 (有时候有些数据没有自动被清理掉)
 */
async function removeDownload() {
    for await (const entry of kv.list({prefix: ["download"]})) {
        if (typeof entry.key[1] !== 'number') {
            await kv.delete(entry.key)
        }
    }
}


await removeUnusedCredentials()
// await removeDownload()
