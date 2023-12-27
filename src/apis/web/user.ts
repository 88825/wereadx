import { get } from "../../utils/request.ts";
import {checkErrCode} from "../err-code.ts";

/**
 * 查询用户信息
 * @param vid
 * @param cookie
 */
export async function web_user(vid: number | string, cookie = "") {
    const resp = await get("https://weread.qq.com/web/user", {
        userVid: vid,
    }, {
        cookie: cookie,
    });
    await checkErrCode(resp, cookie)
    return resp.json();
}
