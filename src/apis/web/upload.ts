import { get } from "../../utils/request.ts";
import {checkErrCode} from "../err-code.ts";

/**
 * 查询书架是否已满
 */
export async function mp_shelf_shelfFull(cookie = "") {
  const resp = await get("https://weread.qq.com/mp/shelf/shelfFull", {}, {
    cookie: cookie,
  });
  await checkErrCode(resp, cookie)
  return resp.json();
}
