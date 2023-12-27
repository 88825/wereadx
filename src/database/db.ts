import { postgres } from "../deps.ts";
import runtime from "../runtime.ts";

var sql = ""
if(runtime.databaseUrl.length) {
  sql = postgres.default(runtime.databaseUrl, {
    onnotice: () => {},
  });
}

export default sql;
