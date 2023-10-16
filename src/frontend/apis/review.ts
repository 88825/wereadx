import {apiCallWithRetry, ParamCheckEntity, ResponseCode} from "./common.ts";
import {web_review_list} from "../../apis/web/review.ts";
import type {Credential} from "../../kv/credential.ts";
import * as credentialUtil from "../../kv/credential.ts"

/**
 * 获取笔记列表
 * @param req
 */
export async function reviewList(req: Request) {
    const params: ParamCheckEntity[] = [
        {
            name: "token",
            from: "header",
            statusCode: ResponseCode.CredentialError,
            statusText: "token无效",
        },
        {
            name: 'bookId',
            from: 'header',
            statusCode: ResponseCode.ParamError,
            statusText: 'bookId不能为空',
        },
    ];

    return await apiCallWithRetry(req, params, (_, credential: Credential) => {
        return web_review_list(credentialUtil.getCookieByCredential(credential));
    })
}
