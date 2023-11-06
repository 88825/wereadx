import {apiCallWithRetry, ParamCheckEntity, ResponseCode} from "./common.ts";
import {getEmailVerifyHtml, sendEmail} from "../../utils/email.ts";
import {jsonResponse} from "../../utils/index.ts";
import {
    confirmEmailBind,
    deleteNotify,
    deletePreSetting,
    getNotifies,
    hasAlreadyBind,
    hasAlreadySend,
    setupEmailVerifyToken,
} from "../../kv/setting.ts";
import {Credential} from "../../kv/credential.ts";
import runtime from "../../runtime.ts";


/**
 * 发送验证邮件
 * @param req
 */
export async function sendVerifyEmail(req: Request) {
    const params: ParamCheckEntity[] = [
        {
            name: "token",
            from: "header",
            statusCode: ResponseCode.CredentialError,
            statusText: "token无效",
        },
        {
            name: 'email',
            from: 'header',
            statusCode: ResponseCode.ParamError,
            statusText: 'email不能为空',
        },
    ];

    return await apiCallWithRetry(req, params, async ({email}, credential: Credential) => {
        if (await hasAlreadyBind(credential, email)) {
            return jsonResponse({code: ResponseCode.Error, msg: '该邮箱已绑定，请更换邮箱'})
        }
        if (await hasAlreadySend(credential)) {
            return jsonResponse({code: ResponseCode.Success, msg: '邮件已发送，请查收邮箱'})
        }

        // 生成一个secret
        const secret = crypto.randomUUID();
        const notifyUrl = `${runtime.deployDomain}/api/bind/email?token=${credential.token}&secret=${secret}`

        const result = await sendEmail(email, "绑定邮箱通知", getEmailVerifyHtml(notifyUrl))
        console.log(`${credential.name}发送邮箱绑定邮件${email}`)
        if (!result) {
            return jsonResponse({code: ResponseCode.Error, msg: '邮件发送失败，请稍后重试'})
        } else {
            await setupEmailVerifyToken(credential, email, secret)
            return jsonResponse({code: ResponseCode.Success, data: result, msg: '发送成功'})
        }
    })
}

/**
 * 绑定邮箱
 * @param req
 */
export async function bindEmail(req: Request) {
    const params: ParamCheckEntity[] = [
        {
            name: "token",
            from: "query",
            statusCode: ResponseCode.CredentialError,
            statusText: "token无效",
        },
        {
            name: 'secret',
            from: 'query',
            statusCode: ResponseCode.ParamError,
            statusText: 'secret不能为空',
        },
    ];

    return await apiCallWithRetry(req, params, async ({secret}, credential: Credential) => {
        const ok = await confirmEmailBind(credential.vid, secret)
        if (ok) {
            // 删除
            await deletePreSetting(credential, secret)
            return jsonResponse({code: ResponseCode.Success, msg: '绑定成功'})
        } else {
            return jsonResponse({code: ResponseCode.Error, msg: '绑定失败'})
        }
    })
}

/**
 * 获取已绑定的通知配置
 * @param req
 */
export async function getSettings(req: Request) {
    const params: ParamCheckEntity[] = [
        {
            name: "token",
            from: "header",
            statusCode: ResponseCode.CredentialError,
            statusText: "token无效",
        },
    ];

    return await apiCallWithRetry(req, params, async (_, credential: Credential) => {
        return await getNotifies(credential)
    })
}

export async function deleteNotifyMethod(req: Request) {
    const params: ParamCheckEntity[] = [
        {
            name: "token",
            from: "header",
            statusCode: ResponseCode.CredentialError,
            statusText: "token无效",
        },
        {
            name: "id",
            from: "header",
            statusCode: ResponseCode.CredentialError,
            statusText: "id不能为空",
        },
    ];

    return await apiCallWithRetry(req, params, async ({id}, credential: Credential) => {
        const [ok, rest] = await deleteNotify(credential, id)
        if (ok) {
            return jsonResponse({code: ResponseCode.Success, data: rest, msg: '成功'})
        } else {
            return jsonResponse({code: ResponseCode.Error, msg: '删除失败'})
        }
    })
}
