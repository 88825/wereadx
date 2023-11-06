import type {Credential} from "./credential.ts";
import {getUlid, timestamp} from "../utils/index.ts";
import runtime from "../runtime.ts";

interface EmailPreSetting {
    vid: number
    email: string
}

type NotifyMethodType = 'email' | 'mp' | 'ding'

interface NotifyMethod {
    id: string
    type: NotifyMethodType
    value: string
    created: number
}

const kv = runtime.kv

/**
 * 检查该用户是否已经发送了验证邮件
 * @param credential
 */
export async function hasAlreadySend(credential: Credential) {
    for await (const it of kv.list({prefix: ["secret", credential.vid]})) {
        if ((it.value as EmailPreSetting).vid === credential.vid) {
            return true
        }
    }
    return false
}

/**
 * 检查该邮箱是否已被绑定
 * @param credential
 * @param email
 */
export async function hasAlreadyBind(credential: Credential, email: string) {
    const setting = await kv.get(["setting", credential.vid])
    if (setting.value) {
        return (setting.value as NotifyMethod[]).some(_ => _.type === 'email' && _.value === email)
    } else {
        return false
    }
}

/**
 * 设置邮件验证的secret
 * @param credential
 * @param email
 * @param secret
 */
export async function setupEmailVerifyToken(
    credential: Credential,
    email: string,
    secret: string,
) {
    const payload: EmailPreSetting = {
        vid: credential.vid,
        email: email,
    }
    await kv.set(["secret", credential.vid, secret], payload, {
        expireIn: 1000 * 60 * 60 * 2, // 2小时有效
    });
}

export async function deletePreSetting(credential: Credential, secret: string) {
    await kv.delete(["secret", credential.vid, secret])
}

/**
 * 确认邮箱绑定
 * @param vid
 * @param secret
 */
export async function confirmEmailBind(vid: number, secret: string) {
    const emailEntry = await kv.get(["secret", vid, secret])
    if (emailEntry.value) {
        // 邮箱验证成功
        const emailEntryPayload: EmailPreSetting = emailEntry.value as EmailPreSetting

        let notifies: NotifyMethod[] = []
        const oldSetting = await kv.get(["setting", vid])
        if (oldSetting.value) {
            notifies = oldSetting.value as NotifyMethod[]
        }

        notifies.push({
            id: getUlid(),
            created: timestamp(),
            type: 'email',
            value: emailEntryPayload.email,
        })

        await kv.set(["setting", vid], notifies)
        return true
    }
    return false
}

/**
 * 获取全部配置
 * @param credential
 */
export async function getNotifies(credential: Credential) {
    const entry = await kv.get(["setting", credential.vid])
    return (entry.value as NotifyMethod[]) || []
}

/**
 * 删除配置
 * @param credential
 * @param id
 */
export async function deleteNotify(credential: Credential, id: string) {
    const entry = await kv.get(["setting", credential.vid])
    if (entry.value) {
        const list = (entry.value as NotifyMethod[]).filter(_ => _.id !== id)
        await kv.set(entry.key, list)
        return [true, list]
    } else {
        return [false, []]
    }
}
