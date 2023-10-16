import {web_shelf_sync} from "../../apis/web/shelf.ts";
import {web_book_chapterInfos, web_book_info} from "../../apis/web/book.ts";
import {downloadSSE} from "./downloadSSE.ts";
import {
    checkDownloadCount,
    newDownloadSecret,
    useSecret,
} from "../../kv/download.ts";
import {MAX_DOWNLOAD_COUNT_PER_MONTH} from "../../config.ts";
import {ResponseCode, ParamCheckEntity, apiCallWithRetry} from "./common.ts";
import {jsonResponse} from "../../utils/index.ts";
import {search} from "../../database/bookid.ts";
import * as credentialUtil from "../../kv/credential.ts";
import type {Credential} from "../../kv/credential.ts";


/**
 * 获取图书列表
 * @param req
 */
export async function bookList(req: Request) {
    const params: ParamCheckEntity[] = [
        {
            name: "token",
            from: "header",
            statusCode: ResponseCode.CredentialError,
            statusText: "token无效",
        },
    ];
    return await apiCallWithRetry(req, params, (_, credential: Credential) => {
        return web_shelf_sync({}, credentialUtil.getCookieByCredential(credential))
    })
}


/**
 * 获取图书详情
 * @param req
 */
export async function bookDetail(req: Request) {
    const params: ParamCheckEntity[] = [
        {
            name: "token",
            from: "header",
            statusCode: ResponseCode.CredentialError,
            statusText: "token无效",
        },
        {
            name: "bookId",
            from: "header",
            statusCode: ResponseCode.ParamError,
            statusText: "bookId不能为空",
        },
    ];

    return await apiCallWithRetry(req, params, ({bookId}: Record<string, string>, credential: Credential) => {
        return web_book_info(bookId, credentialUtil.getCookieByCredential(credential))
    })
}

/**
 * 获取图书章节信息
 * @param req
 */
export async function bookChapters(req: Request) {
    const params: ParamCheckEntity[] = [
        {
            name: "token",
            from: "header",
            statusCode: ResponseCode.CredentialError,
            statusText: "token无效",
        },
        {
            name: "bookId",
            from: "header",
            statusCode: ResponseCode.ParamError,
            statusText: "bookId不能为空",
        },
    ];

    return await apiCallWithRetry(req, params, ({bookId}: Record<string, string>, credential: Credential) => {
        return web_book_chapterInfos([bookId], credentialUtil.getCookieByCredential(credential))
    })
}

/**
 * 下载
 * @param req
 */
export async function bookDownload(req: Request) {
    const params: ParamCheckEntity[] = [
        {
            name: "token",
            from: "query",
            statusCode: ResponseCode.CredentialError,
            statusText: "token无效",
        },
        {
            name: "secret",
            from: "query",
            statusCode: ResponseCode.ParamError,
            statusText: "secret不能为空",
        },
    ];

    return await apiCallWithRetry(req, params, async ({secret}: Record<string, string>, credential: Credential) => {
        const [ok, bookId, chapterUids] = await useSecret(credential, secret);
        if (ok) {
            return downloadSSE(bookId, chapterUids, credential);
        } else {
            return jsonResponse({code: ResponseCode.ParamError, msg: 'secret无效'})
        }
    })
}

/**
 * 获取下载凭证
 * @param req
 */
export async function getDownloadSecret(req: Request) {
    const params: ParamCheckEntity[] = [
        {
            name: "token",
            from: "header",
            statusCode: ResponseCode.CredentialError,
            statusText: "token无效",
        },
        {
            name: "bookId",
            from: "header",
            statusCode: ResponseCode.ParamError,
            statusText: "bookId不能为空",
        },
        {
            name: "chapterUids",
            from: "header",
            statusCode: ResponseCode.ParamError,
            statusText: "chapterUids不能为空",
        },
    ];

    return await apiCallWithRetry(req, params, async ({bookId, chapterUids}: Record<string, string>, credential: Credential) => {
        // 验证该用户的月下载量
        if (!(await checkDownloadCount(credential))) {
            // 无法下载
            return jsonResponse({code: ResponseCode.CountLimit, msg: `每月仅能下载${MAX_DOWNLOAD_COUNT_PER_MONTH}次，请下个月再试`})
        } else {
            // 生成临时下载凭证
            const secret = await newDownloadSecret(
                credential,
                bookId,
                chapterUids.split("|").map((uid: string) => Number(uid)),
            );
            return jsonResponse({code: ResponseCode.Success, data: secret, msg: 'success'})
        }
    })
}

/**
 * 书籍查询
 * @param req
 */
export async function bookSearch(req: Request) {
    const params: ParamCheckEntity[] = [
        {
            name: "token",
            from: "header",
            statusCode: ResponseCode.CredentialError,
            statusText: "token无效",
        },
        {
            name: "hash",
            from: "header",
            statusCode: ResponseCode.ParamError,
            statusText: "hash无效",
        },
    ];

    return await apiCallWithRetry(req, params, async ({hash}: Record<string, string>) => {
        console.log(hash)
        const bookId = await search(hash)
        console.log('search bookId: ', bookId)
        if (bookId) {
            return jsonResponse({code: ResponseCode.Success, data: bookId, msg: 'success'})
        } else {
            return jsonResponse({code: ResponseCode.Error, msg: '未找到，欢迎提供反馈'})
        }
    })
}
