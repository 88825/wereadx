import {get} from "../../utils/request.ts";
import {checkErrCode} from "../err-code.ts";

/**
 * 获取pdf书籍的下载地址
 * @param bookId
 * @param cookie
 */
export async function getPDFUrl(bookId: string, cookie = "") {
    const resp = await get("https://res.weread.qq.com/cos/download", {
        getUrl: '1',
        bookId,
    }, {
        cookie,
    })
    await checkErrCode(resp, cookie)
    return resp.json()
}

/**
 * 获取reader token，上传进度时需要
 * @param cookie
 */
export async function getConfig(cookie = "") {
    const resp = await get("https://weread.qq.com/web/getConfig", {}, {cookie})
    await checkErrCode(resp, cookie)
    return resp.json()
}

/**
 * 通知后台pdf转epub
 * @param bookId
 * @param cookie
 */
export async function pdf2epub(bookId: string, cookie = "") {
    const resp = await get("https://weread.qq.com/web/pdf2epub/notify", {
        cbid: bookId,
    }, {cookie})
    await checkErrCode(resp, cookie)
    return resp.json()
}
