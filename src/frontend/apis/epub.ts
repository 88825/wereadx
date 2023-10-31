import {apiCallWithRetry, ParamCheckEntity, ResponseCode} from "./common.ts";
import {Credential} from "../../kv/credential.ts";

export async function downloadAsset(req: Request) {
    const params: ParamCheckEntity[] = [
        {
            name: "token",
            from: "query",
            statusCode: ResponseCode.CredentialError,
            statusText: "token无效",
        },
        {
            name: 'url',
            from: 'query',
            statusCode: ResponseCode.ParamError,
            statusText: 'url不能为空',
        },
    ];

    return await apiCallWithRetry(req, params, ({url}, _: Credential) => {
        // 下载资源
        // console.log(`用户${credential.name}(${credential.vid}) 下载了资源: ${url}`)
        return fetch(url, {
            method: 'GET',
            cache: 'no-store',
            redirect: 'follow',
        })
    })
}
