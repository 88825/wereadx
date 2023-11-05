import {get} from "../../utils/request.ts";
import {UserAgentForApp} from "../../config.ts";
import {checkErrCode} from "../err-code.ts";

/**
 * 查询阅读排名
 * @param vid 用户id
 * @param skey 用户凭证
 *
 * @example 异常返回
 * { errcode: -2010, errlog: "C3LkAop", errmsg: "用户不存在" }
 * { errcode: -2012, errlog: "C6rM756", errmsg: "登录超时" }
 */
export async function friend_ranking(vid: string | number, skey: string) {
    const resp = await get("https://i.weread.qq.com/friend/ranking", {}, {
        vid: vid.toString(),
        skey: skey,
        "User-Agent": UserAgentForApp,
    })
    await checkErrCode(resp, vid)
    return resp.json()
}
