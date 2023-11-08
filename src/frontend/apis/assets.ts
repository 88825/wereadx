import {apiCallWithRetry, ParamCheckEntity, ResponseCode} from "./common.ts";
import {Credential} from "../../kv/credential.ts";
import {get} from "../../utils/request.ts";

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
        return get(decodeURIComponent(url))
    })
}
