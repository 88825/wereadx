// deno-lint-ignore-file no-explicit-any
import {getLogs} from "./logs.ts";
import {insertLogRecords} from "../src/database/log.ts";
import {md5} from "../src/utils/encode.ts";

// 这里可以在 pre-push 钩子中拉取日志，并上传到 supabase 上面

let count = 0

async function tick(cursor: Record<string, number> | null = null) {
    const resp = await getLogs(cursor)
    if (typeof resp === 'string') {
        console.log(resp)
        console.warn('需要重新登录')
        Deno.exit(-1)
    }

    const logs = resp.logs
        .map((_: any) => ({
            subhoster_id: _.subhosterId,
            deployment_id: _.deploymentId,
            isolate_id: _.isolateId,
            region: _.region,
            level: _.level,
            timestamp: _.timestamp,
            message: _.message,
            hash: md5(_.timestamp + _.message), // 计算一个 Hash 用于作为唯一键
        }))
        // 只备份 warning/error 级别的日志
        .filter((log: any) => ['info', 'warning', 'error'].includes(log.level))
    // console.log(logs)
    await insertLogRecords(logs)
    count += logs.length
    console.log(`upload ${count} log records`)

    if (resp.nextCursor) {
        // 下一轮
        await tick(resp.nextCursor)
    }
}

console.log(`开始备份日志..`)

await tick()

console.log('日志备份完成\n')
Deno.exit(0)
