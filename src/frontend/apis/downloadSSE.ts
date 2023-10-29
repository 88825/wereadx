import * as credentialUtil from "../../kv/credential.ts";
import {web_book_chapter_e} from "../../apis/web/book.ts";
import {randomInteger, runInDenoDeploy, sleep} from "../../utils/index.ts";
import {incrementDownloadCount} from "../../kv/download.ts";
import {sendEvent} from "./common.ts";
import {Credential} from "../../kv/credential.ts";

const inDenoDeploy = runInDenoDeploy()

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

                let idx = 1
                for (const chapterUid of chapterUids) {
                    if (isClosed) {
                        return;
                    }

                    // 单章下载
                    const html = await web_book_chapter_e(bookId, chapterUid, cookie);
                    const data = {total: chapterUids.length, current: idx++, chapterUid, content: html};
                    sendEvent(isClosed, controller, "progress", data);

                    if (inDenoDeploy) {
                        await sleep(randomInteger(500, 1000));
                    } else {
                        // 个人使用，可以降低间隔，加快下载进度
                        await sleep(500);
                    }
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
