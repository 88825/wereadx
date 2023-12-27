// deno-lint-ignore-file no-explicit-any
import {get} from "../src/utils/request.ts";
import {load} from "https://deno.land/std@0.202.0/dotenv/mod.ts";


const env = await load()
const projectID = env['PROJECT_ID']
const cookie = env['DENO_DEPLOY_COOKIE']


/**
 * 获取日志
 * @param nextCursor
 * @param since
 */
export async function getLogs(nextCursor: Record<string, number> | null = null, since = "2023-09-26T05:23:24.929Z") {
    const payload: Record<string, any> = {
        since: since,
        levels: [],
        regions: [],
    }
    if (nextCursor) {
        payload.cursor = nextCursor
    }
    const resp = await get(`https://dash.deno.com/_api/projects/${projectID}/deployments/latest/query_logs`, {
        params: JSON.stringify(payload),
    }, {cookie})

    const contentType = resp.headers.get("Content-Type") || "text/html"
    if (contentType.includes("text/html")) {
        return resp.text()
    } else if (contentType.includes("json")) {
        return resp.json()
    }
}
