import * as credentialUtil from "../../kv/credential.ts";
import {web_book_chapter_e, web_book_chapterInfos, web_book_info} from "../../apis/web/book.ts";
import {randomInteger, runInDenoDeploy, sleep} from "../../utils/index.ts";
import {incrementDownloadCount} from "../../kv/download.ts";
import {sendEvent} from "./common.ts";
import {Credential} from "../../kv/credential.ts";
import {os} from "../../deps.ts"

const inDenoDeploy = runInDenoDeploy()

/**
 * 下载
 */
export function downloadSSE(bookId: string, credential: Credential): Response {
    let isClosed = false;
    const body = new ReadableStream({
        start: async (controller) => {
            try {
                const cookie = credentialUtil.getCookieByCredential(credential)

                const bookInfo = await web_book_info(bookId, cookie)
                const chapterInfos = await web_book_chapterInfos([bookId], cookie)
                const chapters = chapterInfos.data[0].updated

                // Windows 环境下通过 `import.meta.resolve()` 函数获取到的路径为 'file:///C:/Users/...'，而 `Deno.readTextFileSync()` 函数
                // 在读取 '/C:/Users/...' 文件会出错，需要去掉开头的 '/' 字符，变为 'C:/Users/...' 才可以正确读取。
                // 详情查看 https://github.com/champkeh/wereadx/issues/17
                let fileRe = /^file:\/\//
                const platform = os.platform()
                if (platform === "win32") {
                    fileRe = /^file:\/\/\//
                }

                // 开始下载前，先发送自定义样式及脚本
                const resetStyle = Deno.readTextFileSync(import.meta.resolve("../assets/styles/reset.css").replace(fileRe, ''))
                const footerNoteStyle = Deno.readTextFileSync(
                    import.meta.resolve("../assets/styles/footer_note.css").replace(fileRe, ""),
                );
                const footerNoteScript = Deno.readTextFileSync(
                    import.meta.resolve("../assets/js/footer_note.js").replace(fileRe, "")
                )
                const preface = {styles: [resetStyle, footerNoteStyle], scripts: [footerNoteScript]}
                sendEvent(isClosed, controller, "preface", preface);

                let idx = 1
                for (const chapter of chapters) {
                    if (isClosed) {
                        return;
                    }

                    // 单章下载
                    const html = await web_book_chapter_e(bookInfo, chapter, cookie);
                    const data = {total: chapters.length, current: idx++, chapterUid: chapter.chapterUid, content: html};
                    sendEvent(isClosed, controller, "progress", data);

                    if (inDenoDeploy) {
                        await sleep(randomInteger(500, 1000));
                    } else {
                        // 个人使用，可以降低间隔，加快下载进度
                        await sleep(500);
                    }

                    // 本地测试
                    // if (idx === 3) {
                    //     break
                    // }
                }

                sendEvent(isClosed, controller, "complete", null);

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
