import {postgres} from "../deps.ts"
import runtime from "../runtime.ts";


const sql = postgres.default(runtime.databaseUrl, {
    onnotice: () => {},
})

export default sql
