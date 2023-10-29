import {dotenv} from "../deps.ts"
import {runInDenoDeploy} from "../utils/index.ts";

let kv: Deno.Kv

if (runInDenoDeploy() || Deno.args.includes("local")) {
    kv = await Deno.openKv()
} else {
    const env = await dotenv.load()
    Deno.env.set('DENO_KV_ACCESS_TOKEN', env["DENO_KV_ACCESS_TOKEN"])
    kv = await Deno.openKv(
        `https://api.deno.com/databases/${env["DENO_KV_UUID"]}/connect`,
    );
}

export default kv
