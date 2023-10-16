import * as credentialUtil from "../../kv/credential.ts";
import {ParamCheckEntity, ResponseCode, apiCallWithRetry} from "./common.ts";
import {web_user} from "../../apis/web/user.ts"
import type {Credential} from "../../kv/credential.ts";

/**
 * 获取用户信息
 * @param req
 */
export async function userInfo(req: Request) {
    const params: ParamCheckEntity[] = [
        {
            name: "token",
            from: "header",
            statusCode: ResponseCode.CredentialError,
            statusText: "token无效",
        },
    ];

    return await apiCallWithRetry(req, params, async (_, credential: Credential) => {
        return await web_user(credential.vid, credentialUtil.getCookieByCredential(credential));
    })
}
