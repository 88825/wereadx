import {runInDenoDeploy} from "../utils/index.ts";
import {dotenv, postgres} from "../deps.ts"


const env = await dotenv.load()

let databaseUrl: string

if (runInDenoDeploy()) {
    databaseUrl = Deno.env.get("DATABASE_URL")!;
} else {
    databaseUrl = env["DATABASE_URL"];
}

const sql = postgres.default(databaseUrl, {
    onnotice: () => {},
})

export default sql
