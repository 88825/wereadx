import {md5} from "../../src/utils/encode.ts";
import {cryptoJS} from "../../src/deps.ts"
import {sleep} from "../../src/utils/index.ts";

const crypto = cryptoJS.default

const referer = 'https://m-tob.jd.com/readertob/reader?ebookId=30846299&team_id=371_371&return_url=https%3A%2F%2Fm-tob.jd.com%2Fuser_login'
const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36'

const token = 'jdd03BVOWWZRSBIDBXC2RP66GXRQPKWIAPS3OFJUVD76A7QRUBNNDYMK6FVHHIVRAZMSHIRWR7KGYJAGVJV74AIJLZI2U2AAAAAMLOBZC35QAAAAADC2SHN66SLFNIEX'
const h5st = '20231027172551748;1679513456279505;7e98a;tk03wb6be1c3e18nvGhEEkHlYcrv20e6eUkWpQBk9g5BkoLukdj2-tgK_oA5EapHdEDCm8IUZeCnvlPV4XYCKoqIFr4O;84a242549c846d8483b17c728ff1ff914b1f09b5b63343d935f52208997ccda6;3.1;1698398751748;76dcb804add1320a126905907ff5ddbfe6354a3d8eb09a6164035064d003aab8d0dd2ba3365155923e199a44208113eec7f7a35fb6a2a0bce4a65fb65e5bc08161cb418a3c22b4d73e5fd15e76d3a125288ef01c5635c277272c32eb8d4ac304'

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
            uuid: this.getUuid(),
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

    /**
     * 获取章节目录
     * @param bookId
     */
    async fetchToc(bookId: string | number) {
        const t = new Date().getTime()
        const body = {
            app: 'tob-web',
            tm: t,
            os: 'web',
            client: 'pc',
            team_id: '371_371',
            uuid: this.getUuid(),
            ebookId: bookId.toString(),
            $ebookId: bookId.toString(),
        }
        const payload = {
            appid: 'jdread-m',
            t: t.toString(),
            client: 'web',
            clientVersion: '1.0.0',
            body: JSON.stringify(body),
            'x-api-eid-token': token,
            h5st: h5st,
        }
        const data = new URLSearchParams(payload).toString()

        return await fetch('https://api.m.jd.com/api?functionId=jdread_api_ebook_catalog_v2_ebookId', {
            method: 'post',
            body: data,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }).then(resp => resp.json())
    }

    /**
     * 下载章节内容
     * @param bookId
     * @param chapterIdx
     */
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


async function downloadBook(bookId: string | number) {
    const encUtil = new EncUtil()
    const resp = await encUtil.fetchToc(bookId)
    if (resp['result_code'] === 0) {
        try {
            // 确保目录存在
            const path = `./examples/jdread/${bookId}`
            Deno.mkdirSync(path, {recursive: true})
        } catch (_) {
            // no op
            console.log(_)
        }

        for (const chapter of resp.data.chapter_info) {
            const {chapter_name, chapter_index, is_try, is_buy} = chapter
            if (!is_try && !is_buy) {
                console.warn(`章节: 《${chapter_name}》 无法阅读，跳过下载`)
                continue
            }
            console.log(`开始下载: 《${chapter_name}》`)
            const data = await encUtil.fetchChapterContent(bookId, chapter_index)
            Deno.writeTextFileSync(`./examples/jdread/${bookId}/${chapter_index}.html`, data)

            await sleep(1000)
        }
    } else {
        console.warn(`获取目录(${bookId})失败: `, resp)
    }
}

await downloadBook('30846310')
