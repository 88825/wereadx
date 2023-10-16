import {postJSON, get} from "../../utils/request.ts";
import {UserAgentForApp} from "../../config.ts";

enum ReadingStatus {
    /**
     * 在读
     */
    Reading = 2,

    /**
     * 读过
     */
    Readed = 3,

    /**
     * 读完
     */
    Finished = 4,
}
/**
 * 标记阅读状态
 * @param bookId
 * @param status
 * @param isCancel
 * @param vid
 * @param skey
 */
export async function book_markstatus(bookId: string, status: ReadingStatus, isCancel = false, vid: number | string, skey: string) {
    const resp = await postJSON("https://i.weread.qq.com/book/markstatus", {
        status: status,
        bookId: bookId,
        isCancel: isCancel ? 1 : 0,
        finishInfo: 0,
    }, {
        vid: vid.toString(),
        skey: skey,
        "User-Agent": UserAgentForApp,
        v: '7.4.2.23'
    })
    return resp.json()
}

export async function book_chapter_download(vid: number | string, skey: string) {
    const resp = await get("https://i.weread.qq.com/book/chapterdownload", {
        bookId: "3300071749",
        bookType: "epub",
        bookVersion: "462704133",
        chapters: "311-320",
        modernVersion: "7.4.2.23",
        offline: 1,
        pf: "weread_wx-2001-iap-2001-iphone",
        pfkey: "pfkey",
        release: 1,
        screenSize: "16x9",
        synckey: "462704133",
        zoneId: 1,
    }, {
        vid: vid.toString(),
        skey: skey,
        "User-Agent": UserAgentForApp,
        v: '7.4.2.23'
    })
    console.log(resp.headers)
    return resp.text()
}
