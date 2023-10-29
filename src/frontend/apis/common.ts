// deno-lint-ignore-file no-explicit-any
import * as credentialUtil from "../../kv/credential.ts";
import {jsonResponse} from "../../utils/index.ts";
import {web_login_renewal} from "../../apis/web/login.ts";
import type {Credential} from "../../kv/credential.ts";

export enum ResponseCode {
    /**
     * 成功
     */
    Success = 0,

    /**
     * 错误
     */
    Error,

    /**
     * token无效
     */
    CredentialError,

    /**
     * 参数错误
     */
    ParamError,

    /**
     * 下载超限额
     */
    CountLimit,
}

export interface ApiCallResponse {
    code: ResponseCode,
    msg: string
    data?: any
}


export interface ParamCheckEntity {
    name: string;
    from: "header" | "query";
    statusCode: number;
    statusText: string;
}

export async function checkParams(
    req: Request,
    params: ParamCheckEntity[],
): Promise<Record<string, string> | Response> {
    const result: Record<string, string> = {};
    for (const p of params) {
        let value;
        if (p.from === "header") {
            value = req.headers.get(p.name);
        } else if (p.from === "query") {
            const query = new URL(req.url).searchParams;
            value = query.get(p.name);
        } else {
            console.warn(`暂不支持from参数: ${p.from}`);
        }

        if (!value || value === "null") {
            return jsonResponse({code: p.statusCode, msg: p.statusText})
        }

        if (p.name === "token") {
            // 检查 token 是否合法
            const credential = await credentialUtil.getByToken(value)
            if (!credential.token) {
                return jsonResponse({code: p.statusCode, msg: p.statusText})
            }
        }

        result[p.name] = value;
    }
    return result;
}


export async function apiCallWithRetry(
    req: Request,
    params: ParamCheckEntity[],
    apiCall: (params: Record<string, string>, credential: Credential) => Promise<any>,
    retry = 3
): Promise<Response> {
    // 检查参数
    const result = await checkParams(req, params);
    if (result instanceof Response) {
        return result;
    }

    const {token} = result;
    if (!token) {
        console.warn(`调用接口 ${req.url} 时 token 为空`)
    }

    async function executor(retry: number) {
        const credential = await credentialUtil.getByToken(token)
        const cookie = credentialUtil.getCookieByCredential(credential)

        const resp = await apiCall(result as Record<string, string>, credential)
        if (resp instanceof Response) {
            return resp
        }

        if (resp &&
            (
                [-2010, -2012, -2013].includes(resp.errCode) ||
                [-2010, -2012, -2013].includes(resp.errcode)
            ) &&
            retry > 0) {
            // skey过期，重新刷新
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
                return jsonResponse({code: ResponseCode.CredentialError, msg: e.message})
            }
        }
        return jsonResponse({code: ResponseCode.Success, data: resp, msg: 'success'})
    }

    return await executor(retry)
}


const encoder = new TextEncoder();

export type EventType = "close" | "error" | "progress" | "preface" | "complete" | "qrcode" | "token" | "expired";


/**
 * 发送 SSE 事件
 * @param isClosed 连接是否已关闭
 * @param controller
 * @param type 事件类型
 * @param data 事件数据
 */
export function sendEvent(
    isClosed: boolean,
    controller: ReadableStreamDefaultController,
    type: EventType,
    data?: any,
) {
    let payload
    if (type === "qrcode") {
        payload = `event: ${type}\ndata: ${encodeURIComponent(data)}\n\n`;
    } else {
        payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
    }

    if (!isClosed) {
        controller.enqueue(encoder.encode(payload));
    }
}
