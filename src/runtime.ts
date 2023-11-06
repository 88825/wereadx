import {dotenv} from "./deps.ts"
import {runInDenoDeploy} from "./utils/index.ts";

const env = await dotenv.load()

let domain: string

if (runInDenoDeploy()) {
    domain = Deno.env.get("DEPLOY_DOMAIN")! || '';
} else {
    domain = env["DEPLOY_DOMAIN"];
}
domain = domain.replace(/\/$/g, '')


let kv: Deno.Kv

if (runInDenoDeploy() || Deno.args.includes("local")) {
    kv = await Deno.openKv()
} else {
    Deno.env.set('DENO_KV_ACCESS_TOKEN', env["DENO_KV_ACCESS_TOKEN"])
    kv = await Deno.openKv(
        `https://api.deno.com/databases/${env["DENO_KV_UUID"]}/connect`,
    );
}


let databaseUrl: string

if (runInDenoDeploy()) {
    databaseUrl = Deno.env.get("DATABASE_URL")!;
} else {
    databaseUrl = env["DATABASE_URL"];
}

export default {
    domain,
    kv,
    databaseUrl,
}
