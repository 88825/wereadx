import * as credentialUtil from "../../kv/credential.ts";
import {
    web_book_chapter_e,
    web_book_chapter_e0,
    web_book_chapter_e1,
    web_book_chapter_e2,
    web_book_chapter_e3,
    web_book_chapter_t0,
    web_book_chapter_t1,
    web_book_info
} from "../../apis/web/book.ts";
import {sleep} from "../../utils/index.ts";
import {incrementDownloadCount} from "../../kv/download.ts";
import {sendEvent} from "./common.ts";
import {Credential} from "../../kv/credential.ts";
import {processHtmls, processStyles} from "../../utils/process.ts";
import styleParser from "../../utils/style.ts";
import htmlParser from "../../utils/html.ts";
import {dH, dS, dT} from "../../utils/decrypt.ts";


/**
 * 下载
 */
export function downloadSSE(
    bookId: string,
    chapterUids: number[],
    credential: Credential,
): Response {
    let isClosed = false;
    const body = new ReadableStream({
        start: async (controller) => {
            try {
                const cookie = credentialUtil.getCookieByCredential(credential)

                for (const chapterUid of chapterUids) {
                    if (isClosed) {
                        return;
                    }

                    // 单章下载
                    const html = await web_book_chapter_e(bookId, chapterUid, cookie);
                    const data = {total: chapterUids.length, current: chapterUid, content: html}
                    sendEvent(isClosed, controller, "progress", data);

                    await sleep(300);
                }

                const fileRe = /^file:\/\//
                const resetStyle = Deno.readTextFileSync(import.meta.resolve("../assets/styles/reset.css").replace(fileRe, ''))
                const footerNoteStyle = Deno.readTextFileSync(
                    import.meta.resolve("../assets/styles/footer_note.css").replace(fileRe, ""),
                );
                const footerNoteScript = Deno.readTextFileSync(
                    import.meta.resolve("../assets/js/footer_note.js").replace(fileRe, "")
                )
                const extra = {styles: [resetStyle, footerNoteStyle], scripts: [footerNoteScript]}
                sendEvent(isClosed, controller, "complete", extra);

                await incrementDownloadCount(credential, bookId);
            } catch (e) {
                console.error(e);
                sendEvent(isClosed, controller, "error", e.message);
            } finally {
                isClosed = true;
                sendEvent(isClosed, controller, "close");
            }
        },
        cancel(reason) {
            console.debug('downloadSSE: ', reason);
            isClosed = true;
        },
    });

    return new Response(body, {
        headers: {
            "Content-Type": "text/event-stream",
            "Access-Control-Allow-Origin": "*",
        },
    });
}


/**
 * 下载章节内容
 * @param bookId
 * @param chapterUid
 * @param cookie
 */
export async function download_chapter(
    bookId: string,
    chapterUid: number,
    cookie = "",
): Promise<string> {
    let promise: Promise<[string[], string | null]>;
    const resp = await web_book_info(bookId, cookie);
    console.log(resp)
    const {format} = resp
    if (format === "epub" || format === "pdf") {
        promise = Promise.all([
            web_book_chapter_e0(bookId, chapterUid, cookie),
            web_book_chapter_e1(bookId, chapterUid, cookie),
            web_book_chapter_e2(bookId, chapterUid, cookie),
            web_book_chapter_e3(bookId, chapterUid, cookie),
        ]).then((results) => {
            if (
                "string" == typeof results[0] && results[0].length > 0 &&
                "string" == typeof results[1] && results[1].length > 0 &&
                "string" == typeof results[3] && results[3].length > 0
            ) {
                let styles = dS(results[2]);
                styles = styleParser.parse(styles, {
                    removeFontSizes: true,
                    enableTranslate: false,
                });

                const html = dH(results[0] + results[1] + results[3]);
                const htmls = htmlParser.parse(html, styles, 10000);
                return [htmls, styles];
            } else {
                console.log(results);
                throw Error(`下载失败(${bookId})`);
            }
        });
    } else if (format === "txt") {
        promise = Promise.all([
            web_book_chapter_t0(bookId, chapterUid, cookie),
            web_book_chapter_t1(bookId, chapterUid, cookie),
        ]).then((results) => {
            if (
                "string" === typeof results[0] && results[0].length > 0 &&
                "string" == typeof results[1] && results[1].length > 0
            ) {
                const html = dT(results[0] + results[1]);
                const htmls = htmlParser.parseTxt(html, 10000);
                return [htmls, null];
            } else {
                console.log(results);
                throw Error("下载失败");
            }
        });
    } else {
        throw Error(`暂不支持${format}格式(${bookId})`);
    }

    let [htmls, styles] = await promise;

    // 处理style
    if (styles) {
        styles = processStyles(styles, bookId);
    }

    // 处理html
    htmls = processHtmls(htmls, bookId);

    // 对 html 进行一些处理
    const sections = htmls.map((html) => {
        // 图片的处理
        // 去掉 base64 图片地址(该图片是占位符)
        html = html.replaceAll(/(<img[^>]+?)(src="data:[^"]+")/gs, "$1");
        // 将 data-src 替换成 src
        html = html.replaceAll(/(<img[^>]+?)data-src="/gs, '$1src="');

        // 剥离body外壳
        const bodyRe = /^<html><head><\/head><body>(?<body>.*)<\/body><\/html>$/s;
        const match = html.match(bodyRe);
        if (match) {
            return match.groups!.body;
        }
        return html;
    }).join("");

    return `
<section data-book-id="${bookId}" data-chapter-uid="${chapterUid}" class="readerChapterContent">
<style>${styles}</style>
${sections}
</section>
`;
}
