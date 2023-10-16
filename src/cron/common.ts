// deno-lint-ignore-file no-explicit-any

import * as credentialUtil from "../kv/credential.ts";
import {Credential} from "../kv/credential.ts";
import {ApiCallResponse, ResponseCode} from "../frontend/apis/common.ts";
import {web_login_renewal} from "../apis/web/login.ts";


/**
 * 带有重试功能的 api 调用
 * @description 当使用 token 调用相关接口时，如果返回结果是 cookie 过期，则会自动调用 web_login_renewal 接口刷新 cookie 进行重试
 * @param apiCall api调用函数,如果不需要刷新token，但是想要重试时，可以返回 {needRepeat:true} 这个对象
 * @param token 内部会判断token是否已过期，并自动刷新
 * @param retry 重试次数，默认3次
 * @return api调用结果
 */
export async function executeApiCallWithRetry(apiCall: (credential: Credential) => Promise<any>, token: string, retry = 3): Promise<ApiCallResponse> {
    async function executor(retry: number) {
        const credential = await credentialUtil.getByToken(token)
        if (!credential) {
            return {code: ResponseCode.ParamError, msg: `token(${token})未查询到用户信息`}
        }
        const cookie = credentialUtil.getCookieByCredential(credential)

        const resp = await apiCall(credential)
        if (resp &&
            (
                // -2010: 用户不存在
                // -2012: 登录超时
                // -2013: 鉴权失败
                [-2010, -2012, -2013].includes(resp.errCode) ||
                [-2010, -2012, -2013].includes(resp.errcode)
            ) &&
            retry > 0) {
            // skey过期，重新刷新
            // console.debug()
            try {
                const credentialInfo = await web_login_renewal("/web/shelf/sync", cookie);
                const {accessToken, refreshToken} = credentialInfo;
                credential.skey = accessToken
                credential.rt = refreshToken
                credential.updatedAt = Date.now()
                await credentialUtil.update(credential)

                // 重新调用原始接口
                return executor(--retry);
            } catch (e) {
                console.error(e);
                // 可能是鉴权失败，需要重新登录
                return {code: ResponseCode.CredentialError, msg: e.message}
            }
        } else if (resp && resp.needRepeat) {
            // 重新调用原始接口
            return executor(--retry);
        }

        return {code: ResponseCode.Success, data: resp, msg: 'success'}
    }

    return await executor(retry)
}
