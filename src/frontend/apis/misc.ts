import {apiCallWithRetry, ParamCheckEntity, ResponseCode} from "./common.ts";
import {Credential} from "../../kv/credential.ts";
import * as credentialUtil from "../../kv/credential.ts";
import {getPDFUrl} from "../../apis/web/misc.ts";

/**
 * 下载 pdf 书籍
 * @param req
 */
export async function getPdfUrl(req: Request) {
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

    return await apiCallWithRetry(req, params, ({bookId}, credential: Credential) => {
        const cookie = credentialUtil.getCookieByCredential(credential)
        return getPDFUrl(bookId, cookie)
    })
}
