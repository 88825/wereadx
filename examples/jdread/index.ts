import {md5} from "../../src/utils/encode.ts";
import {cryptoJS} from "../../src/deps.ts"

const crypto = cryptoJS.default

const referer = 'https://m-tob.jd.com/readertob/reader?ebookId=30846299&team_id=371_371&return_url=https%3A%2F%2Fm-tob.jd.com%2Fuser_login'
const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36'

function t() {
    return (65536 * (1 + Math.random()) | 0).toString(16).substring(1)
}

class EncUtil {
    app: string
    time: number
    origin = 'https://m-tob.jd.com'

    constructor() {
        this.app = 'tob-web'
        this.time = new Date().getTime()
        // this.time = 1698383159892
    }

    getUuid() {
        return 'h5' + t() + t() + t() + t() + t() + t() + t() + t()
    }

    sortString(data: Record<string, string | number>) {
        const sortedKeys = Object.keys(data).sort()
        let result = sortedKeys[0] + "=" + data[sortedKeys[0]]
        for (let i = 1; i < sortedKeys.length; i++) {
            result = result + "&" + sortedKeys[i] + "=" + data[sortedKeys[i]]
        }
        return result
    }

    addSign(url: string, payload: Record<string, string | number>, sign: string) {
        const keys = Object.keys(payload)
        let result = url.split("?")[0] + "?" + keys[0] + "=" + payload[keys[0]]
        for (let i = 1; i < keys.length; i++) {
            result = result + "&" + keys[i] + "=" + payload[keys[i]]
        }
        return result + "&sign=" + sign
    }

    getKey(timestamp: number) {
        return timestamp.toString() + this.app
    }

    enData(url: string) {
        const key = this.getKey(this.time)
        let n = this.encrypt(url.split("?")[1], key, this.time)
        n = n.replace(/\+/g, "-").replace(/\//g, "_")
        url = url.split("?")[0] + "?enc=1&app=" + this.app + "&tm=" + this.time + "&params=" + encodeURIComponent(n)
        return url
    }

    encrypt(data: string, key: string, time: number) {
        return time % 2 == 0 ? this.AESEncrypt(data, key) : this.DESEncrypt(data, key)
    }

    AESEncrypt(data: string, key: string) {
        const _data = crypto.enc.Utf8.parse(data)
        const _key = crypto.MD5(crypto.enc.Utf8.parse(key))

        return crypto.AES.encrypt(_data, _key, {
            mode: crypto.mode.ECB,
            padding: crypto.pad.Pkcs7
        }).toString()
    }

    DESEncrypt(data: string, key: string) {
        const _data = crypto.enc.Utf8.parse(data)
        const _key = crypto.MD5(crypto.enc.Utf8.parse(key))

        return crypto.DES.encrypt(_data, _key, {
            mode: crypto.mode.ECB,
            padding: crypto.pad.Pkcs7
        }).toString()
    }

    decrypt(data: string, key: string, time: number) {
        return time % 2 == 0 ? this.AESDecrypt(data, key) : this.DESDecrypt(data, key)
    }

    AESDecrypt(data: string, key: string) {
        const _data = crypto.MD5(crypto.enc.Utf8.parse(key))
        const _key = crypto.AES.decrypt(data, _data, {
            mode: crypto.mode.ECB,
            padding: crypto.pad.Pkcs7
        })

        return crypto.enc.Utf8.stringify(_key).toString()
    }

    DESDecrypt(data: string, key: string) {
        const n = crypto.MD5(crypto.enc.Utf8.parse(key))
        const r = crypto.DES.decrypt(data, n, {
            mode: crypto.mode.ECB,
            padding: crypto.pad.Pkcs7
        })

        return crypto.enc.Utf8.stringify(r).toString()
    }

    getUrl(bookId: string | number) {
        const requestUrl = '/jdread/api/download/chapter/' + bookId
        const payload = {
            app: this.app,
            tm: this.time,
            team_id: '371_371',
            uuid: 'h5d9170918388655fea688f177c2158503', //this.getUuid(),
            client: 'pc',
            os: 'web',
        }
        const sign = md5(md5(payload.app + payload.tm + payload.uuid) + requestUrl + this.sortString(payload))

        return this.enData(this.addSign(requestUrl, payload, sign))
    }

    async request(url: string) {
        if (!url.startsWith('http')) {
            url = this.origin + url
        }

        return await fetch(url, {
            headers: {
                Referer: referer,
                'User-Agent': ua,
            }
        }).then(resp => resp.text())
    }

    async fetchChapterContent(bookId: string | number, chapterIdx: string | number) {
        let url = this.getUrl(bookId)
        // 加上章节编号
        url += '&enc_pin=&indexes=' + chapterIdx
        const resp = await this.request(url)

        const data = this.decrypt(resp, this.getKey(this.time), this.time)
        try {
            const respJson = JSON.parse(data)
            if (respJson['result_code'] === 0) {
                // 下载成功
                return respJson['data']['chapter'][0]['content']
            }
        } catch (e) {
            throw e
        }
    }
}

const bookId = '30846299'
const chapterIdx = 3

const encUtil = new EncUtil()
const data = await encUtil.fetchChapterContent(bookId, chapterIdx)

Deno.writeTextFileSync(`./examples/jdread/${bookId}-${chapterIdx}.html`, data)
