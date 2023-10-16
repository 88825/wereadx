import kv from "./db.ts"

/**
 * 用户凭证
 */
export interface Credential {
    token: string;
    vid: number;
    name: string;
    skey: string;
    rt: string;
    updatedAt: number;
}


/**
 * 根据 token 获取用户凭证
 * @param token 用户token
 */
export async function getByToken(token: string): Promise<Credential> {
    const credentialEntry = await kv.get<Credential>(["credentials", token]);
    if (!credentialEntry.value) {
        return {
            token: '',
            vid: -1,
            name: 'unknown',
            skey: '',
            rt: '',
            updatedAt: 0
        }
    }
    return credentialEntry.value as Credential;
}

/**
 * 根据 vid 获取用户 token
 * @description 权限比较大，需要小心限制使用
 * @param vid
 */
export async function getTokenByVid(vid: number): Promise<string | null> {
    const tokenEntry = await kv.get(["vid", vid])
    if (tokenEntry.value) {
        return tokenEntry.value as string
    } else {
        return null
    }
}

/**
 * 将 credential 转化为 cookie
 * @param credential
 */
export function getCookieByCredential(credential: Credential) {
    const {vid, skey, rt} = credential;
    return `wr_vid=${vid};wr_skey=${skey};wr_rt=${rt};`;
}

/**
 * 更新用户凭证
 * @param credential
 */
export async function update(credential: Credential) {
    await kv.atomic()
        .set(["credentials", credential.token], credential)
        .set(["vid", credential.vid], credential.token)
        .commit()
}
