import {base64, crypto} from "../deps.ts"

/**
 * md5 哈希
 * @param raw
 */
export function md5(raw: string): string {
    const buf = new TextEncoder().encode(raw).buffer;
    return crypto.toHashString(crypto.crypto.subtle.digestSync("MD5", buf));
}

/**
 * sha-256 哈希
 * @param raw
 */
export function sha256(raw: string): string {
    const buf = new TextEncoder().encode(raw).buffer;
    return crypto.toHashString(crypto.crypto.subtle.digestSync("SHA-256", buf));
}

/**
 * base64 解码
 * @param input
 */
export function base64Decode(input: string) {
    return new TextDecoder().decode(base64.decode(input));
}

/**
 * base64 编码
 * @param input
 */
export function base64Encode(input: string) {
    return base64.encode(input);
}

// todo: 用户登录后的token采用 aes(vid + '一个固定的随机数')
// 这样可以避免因用户删除本地缓存后重新登录，token变化的问题
export async function aes() {
    const key = await crypto.crypto.subtle.generateKey(
        { name: "AES-CBC", length: 128 },
        true,
        ["encrypt", "decrypt"],
    )
    console.log(key)
    const jwk = await crypto.crypto.subtle.exportKey("jwk", key)

    const k = await crypto.crypto.subtle.importKey("jwk", jwk, "AES-CBC", true, ["encrypt", "decrypt"])
    return k
}
