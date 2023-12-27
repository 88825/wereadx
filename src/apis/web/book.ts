import {get, postJSON} from "../../utils/request.ts";
import {calcHash, currentTime, getAppId, sign, timestamp} from "../../utils/index.ts";
import {UserAgentForWeb} from "../../config.ts";
import {chk, dH, dS, dT} from "../../utils/decrypt.ts";
import styleParser from "../../utils/style.ts";
import htmlParser from "../../utils/html.ts";
import {mergeSpanInHtml, processHtmls, processStyles} from "../../utils/process.ts";
import {sha256} from "../../utils/encode.ts";
import {chapterTitleText, M278, showChapterTitle} from "./utils.ts";
import type {BookInfo, ChapterInfo} from "./utils.ts";
import {checkErrCode} from "../err-code.ts";

/**
 * 获取图书详情
 * @param bookId
 * @param cookie
 */
export async function web_book_info(bookId: string, cookie = "") {
    const resp = await get("https://weread.qq.com/web/book/info", {
        bookId: bookId,
    }, {
        cookie: cookie,
    });
    await checkErrCode(resp, cookie)
    return resp.json();
}

/**
 * 获取图书详情
 * 不需要登录
 */
export async function web_book_publicinfos(bookIds: string[]) {
    const resp = await postJSON("https://weread.qq.com/web/book/publicinfos", {
        bookIds,
    })
    await checkErrCode(resp, "anonymous")
    try {
        return resp.json()
    } catch (e) {
        console.log(e)
        console.log(resp)
        throw e
    }
}

export async function web_book_search(cookie = "") {
    const resp = await get("https://weread.qq.com/web/book/search", {}, {cookie})
    await checkErrCode(resp, cookie)
    return resp.json()
}

/**
 * 获取图书的章节信息
 * @param bookIds
 * @param cookie
 */
export async function web_book_chapterInfos(bookIds: string[], cookie = "") {
    const resp = await postJSON("https://weread.qq.com/web/book/chapterInfos", {
        bookIds,
    }, {
        cookie: cookie,
    });
    await checkErrCode(resp, cookie)
    return resp.json();
}

/**
 * 获取进度信息
 * @param bookId
 * @param cookie
 */
export async function web_book_getProgress(bookId: string, cookie = "") {
    const resp = await get("https://weread.qq.com/web/book/getProgress", {
        bookId,
    }, {
        cookie: cookie,
    });
    await checkErrCode(resp, cookie)
    return resp.json();
}

/**
 * 开始阅读
 * @param bookId
 * @param chapterUid
 * @param percent
 * @param chapterOffset
 * @param pc
 * @param ps
 * @param format
 * @param cookie
 */
export async function web_book_read_init(
    bookId: string,
    chapterUid: number,
    percent = 0,
    chapterOffset = 0,
    pc: number,
    ps: number,
    format = "epub",
    cookie = "",
) {
    const payload: Record<string, string | number> = {
        "appId": getAppId(UserAgentForWeb),
        "b": calcHash(bookId),
        "c": calcHash(chapterUid || 0),
        "ci": chapterUid || 0,
        "co": chapterOffset,
        "ct": currentTime(),
        "dy": 0,
        "fm": format,
        "pc": calcHash(pc),
        "pr": percent,
        "ps": calcHash(ps),
        "sm": "",
    }
    payload.s = sign(payload)

    const resp = await postJSON("https://weread.qq.com/web/book/read", payload, {
        cookie: cookie,
    });
    await checkErrCode(resp, cookie)
    return resp.json()
}

/**
 * 上传进度
 * @param bookId
 * @param chapterUid
 * @param percent
 * @param chapterOffset
 * @param pc
 * @param ps
 * @param format
 * @param readerToken
 * @param cookie
 * @param rt
 */
export async function web_book_read(
    bookId: string,
    chapterUid: number,
    percent = 0,
    chapterOffset = 0,
    pc: number,
    ps: number,
    format = "epub",
    readerToken = "",
    cookie = "",
    rt = 60,
) {
    const ts = timestamp()
    const rnd = Math.floor(1000 * Math.random())

    const payload: Record<string, string | number> = {
        "appId": getAppId(UserAgentForWeb),
        "b": calcHash(bookId),
        "c": calcHash(chapterUid || 0),
        "ci": chapterUid || 0,
        "co": chapterOffset,
        "ct": currentTime(),
        "dy": 0,
        "fm": format,
        "pc": calcHash(pc),
        "pr": percent,
        "ps": calcHash(ps),
        "sm": "",
        rt: rt, // 最大只能为 60
        ts: ts,
        rn: rnd,
        sg: sha256("" + ts + rnd + readerToken),
    }
    payload.s = sign(payload)

    const resp = await postJSON("https://weread.qq.com/web/book/read", payload, {
        cookie: cookie,
    });
    await checkErrCode(resp, cookie)
    return resp.json()
}

export async function web_book_bookmarklist(bookId: string, cookie = "") {
    const resp = await get("https://weread.qq.com/web/book/bookmarklist", {
        bookId: bookId,
    }, {
        cookie: cookie,
    });
    await checkErrCode(resp, cookie)
    return resp.json();
}

export async function web_book_chapter_e0(
    bookId: string,
    chapterUid: number,
    cookie = "",
) {
    const payload: Record<string, any> = {
        "b": calcHash(bookId),
        "c": calcHash(chapterUid),
        "r": Math.pow(Math.floor(10_000 * Math.random()), 2),
        "st": 0,
        "ct": currentTime(),
        "ps": "a2b325707a19e580g0186a2",
        "pc": "430321207a19e581g013ab0",
    };
    payload.s = sign(payload);

    const resp = await postJSON(
        "https://weread.qq.com/web/book/chapter/e_0",
        payload,
        {
            cookie: cookie,
        },
    );
    await checkErrCode(resp, cookie)
    const data = await resp.text();
    return data && "string" === typeof data ? chk(data) : "";
}

export async function web_book_chapter_e1(
    bookId: string,
    chapterUid: number,
    cookie = "",
) {
    const payload: Record<string, any> = {
        "b": calcHash(bookId),
        "c": calcHash(chapterUid),
        "r": Math.pow(Math.floor(10_000 * Math.random()), 2),
        "st": 0,
        "ct": currentTime(),
        "ps": "a2b325707a19e580g0186a2",
        "pc": "430321207a19e581g013ab0",
    };
    payload.s = sign(payload);

    const resp = await postJSON(
        "https://weread.qq.com/web/book/chapter/e_1",
        payload,
        {
            cookie: cookie,
        },
    );
    await checkErrCode(resp, cookie)
    const data = await resp.text();
    return data && "string" === typeof data ? chk(data) : "";
}

export async function web_book_chapter_e2(
    bookId: string,
    chapterUid: number,
    cookie = "",
) {
    const payload: Record<string, any> = {
        "b": calcHash(bookId),
        "c": calcHash(chapterUid),
        "r": Math.pow(Math.floor(10_000 * Math.random()), 2),
        "st": 1,
        "ct": currentTime(),
        "ps": "a2b325707a19e580g0186a2",
        "pc": "430321207a19e581g013ab0",
    };
    payload.s = sign(payload);

    const resp = await postJSON(
        "https://weread.qq.com/web/book/chapter/e_2",
        payload,
        {
            cookie: cookie,
        },
    );
    await checkErrCode(resp, cookie)
    const data = await resp.text();
    return data && "string" === typeof data ? chk(data) : "";
}

export async function web_book_chapter_e3(
    bookId: string,
    chapterUid: number,
    cookie = "",
) {
    const payload: Record<string, any> = {
        "b": calcHash(bookId),
        "c": calcHash(chapterUid),
        "r": Math.pow(Math.floor(10_000 * Math.random()), 2),
        "st": 0,
        "ct": currentTime(),
        "ps": "a2b325707a19e580g0186a2",
        "pc": "430321207a19e581g013ab0",
    };
    payload.s = sign(payload);

    const resp = await postJSON(
        "https://weread.qq.com/web/book/chapter/e_3",
        payload,
        {
            cookie: cookie,
        },
    );
    await checkErrCode(resp, cookie)
    const data = await resp.text();
    return data && "string" === typeof data ? chk(data) : "";
}

export async function web_book_chapter_t0(
    bookId: string,
    chapterUid: number,
    cookie = "",
) {
    const payload: Record<string, any> = {
        "b": calcHash(bookId),
        "c": calcHash(chapterUid),
        "r": Math.pow(Math.floor(10_000 * Math.random()), 2),
        "st": 0,
        "ct": currentTime(),
        "ps": "a2b325707a19e580g0186a2",
        "pc": "430321207a19e581g013ab0",
    };
    payload.s = sign(payload);

    const resp = await postJSON(
        "https://weread.qq.com/web/book/chapter/t_0",
        payload,
        {
            cookie: cookie,
        },
    );
    await checkErrCode(resp, cookie)
    const data = await resp.text();
    return data && "string" === typeof data ? chk(data) : "";
}

export async function web_book_chapter_t1(
    bookId: string,
    chapterUid: number,
    cookie = "",
) {
    const payload: Record<string, any> = {
        "b": calcHash(bookId),
        "c": calcHash(chapterUid),
        "r": Math.pow(Math.floor(10_000 * Math.random()), 2),
        "st": 1,
        "ct": currentTime(),
        "ps": "a2b325707a19e580g0186a2",
        "pc": "430321207a19e581g013ab0",
    };
    payload.s = sign(payload);

    const resp = await postJSON(
        "https://weread.qq.com/web/book/chapter/t_1",
        payload,
        {
            cookie: cookie,
        },
    );
    await checkErrCode(resp, cookie)
    const data = await resp.text();
    return data && "string" === typeof data ? chk(data) : "";
}

/**
 * 获取章节内容
 * @param bookInfo
 * @param chapter
 * @param cookie
 */
export async function web_book_chapter_e(
    bookInfo: BookInfo,
    chapter: ChapterInfo,
    cookie = "",
): Promise<[string, string, string]> {
    let promise: Promise<[string[], string]>;

    const bookId = bookInfo.bookId

    if (M278.isEPub(bookInfo)) {
        // epub 格式
        promise = Promise.all([
            web_book_chapter_e0(bookId, chapter.chapterUid, cookie),
            web_book_chapter_e1(bookId, chapter.chapterUid, cookie),
            web_book_chapter_e2(bookId, chapter.chapterUid, cookie),
            web_book_chapter_e3(bookId, chapter.chapterUid, cookie),
        ]).then((results) => {
            if (
                "string" == typeof results[0] && results[0].length > 0 &&
                "string" == typeof results[1] && results[1].length > 0 &&
                "string" == typeof results[3] && results[3].length > 0
            ) {
                let style = dS(results[2]);
                style = styleParser.parse(style, {
                    removeFontSizes: true,
                    enableTranslate: false,
                });

                const html = dH(results[0] + results[1] + results[3]);
                const htmls = htmlParser.parse(html, style, 10000);
                return [htmls, style];
            } else {
                console.log(results);
                throw Error(`下载失败(${bookId})`);
            }
        });
    } else {
        // txt 格式
        promise = Promise.all([
            web_book_chapter_t0(bookId, chapter.chapterUid, cookie),
            web_book_chapter_t1(bookId, chapter.chapterUid, cookie),
        ]).then((results) => {
            if (
                "string" === typeof results[0] && results[0].length > 0 &&
                "string" == typeof results[1] && results[1].length > 0
            ) {
                const html = dT(results[0] + results[1]);
                const htmls = htmlParser.parseTxt(html, 10000);
                return [htmls, ''];
            } else {
                console.log(results);
                throw Error(`下载失败(${bookId})`);
            }
        });
    }

    let [htmls, style] = await promise;

    // 处理style
    if (style) {
        style = processStyles(style, bookId);
    }

    // 处理html
    htmls = processHtmls(htmls, bookId);

    // 封面图替换成高清图片
    const re = /(.+)\/s_([^/]+)$/
    if (re.test(bookInfo.cover)) {
        bookInfo.cover = bookInfo.cover.replace(/(.+)\/s_([^/]+)$/, '$1/t9_$2')
    }

    // 对 html 进行一些处理
    const sections = htmls.map((html) => {
        // 图片的处理
        // 去掉 base64 图片地址(该图片是占位符)
        html = html.replaceAll(/(<img[^>]+?)(src="data:[^"]+")/gs, "$1");
        // 将 data-src 替换成 src
        html = html.replaceAll(/(<img[^>]+?)data-src="/gs, '$1src="');

        // 替换不存在的封面图
        // https://res.weread.qq.com/wrepub/web/908872/device_phone_frontcover.jpg
        // https://wfqqreader-1252317822.image.myqcloud.com/cover/872/908872/t9_908872.jpg (bookInfo.cover)
        html = html.replaceAll(/(<img[^>]+?src=")([^"]+?device_phone_frontcover.jpg)("[^>]*?>)/gs, `$1${bookInfo.cover}$3`)

        // 剥离body外壳
        const bodyRe = /^<html><head><\/head><body>(?<body>.*)<\/body><\/html>$/s;
        const match = html.match(bodyRe);
        if (match) {
            return match.groups!.body;
        }
        return html;
    }).join("");

    let html = `<section data-book-id="${bookId}" data-chapter-uid="${chapter.chapterUid}" class="readerChapterContent">`
    // 判断是否添加章节标题
    if (showChapterTitle(bookInfo)) {
        html += `<div class="chapterTitle">${chapterTitleText(bookInfo, chapter)}</div>`
    }
    html += `${sections}</section>`
    html = mergeSpanInHtml(html)
    const title = chapterTitleText(bookInfo, chapter) || chapter.title

    return [title, html, style]
}
