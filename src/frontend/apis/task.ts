import {jsonResponse, randomInteger} from "../../utils/index.ts";
import {web_book_publicinfos, web_book_read_init} from "../../apis/web/book.ts";
import {apiCallWithRetry, ParamCheckEntity, ResponseCode} from "./common.ts";
import {friend_ranking} from "../../apis/app/friend.ts";
import type {Credential} from "../../kv/credential.ts";
import type {BookInfo} from "../../kv/task.ts";
import * as taskManager from "../../kv/task.ts";
import * as credentialUtil from "../../kv/credential.ts";
import {getConfig} from "../../apis/web/misc.ts";


/**
 * 朋友排行榜
 * @param req
 */
export async function friendRank(req: Request) {
    const params: ParamCheckEntity[] = [
        {
            name: "token",
            from: "header",
            statusCode: ResponseCode.CredentialError,
            statusText: "token无效",
        },
    ];

    return await apiCallWithRetry(req, params, (_, credential: Credential) => {
        return friend_ranking(credential.vid, credential.skey)
    })
}

/**
 * 添加自动阅读任务
 */
export async function startRead(req: Request) {
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

    // 计算服务器及客户端加载的时间戳
    const pc = Math.floor(new Date().getTime() / 1000)
    const ps = pc - randomInteger(2, 10)

    return await apiCallWithRetry(req, params, async ({bookId}: Record<string, string>, credential: Credential) => {
        const cookie = credentialUtil.getCookieByCredential(credential)

        // 获取书籍信息
        const bookInfos = await web_book_publicinfos([bookId])
        const book = bookInfos.data[0]
        if (book.bookId !== bookId) {
            return jsonResponse({code: ResponseCode.Error, msg: '获取书籍数据错误'})
        }
        const bookInfo: BookInfo = {
            bookId: bookId,
            title: book.title,
            author: book.author,
        }

        // 获取阅读器token
        const {token: readerToken} = await getConfig(cookie)
        if (!readerToken) {
            return jsonResponse({code: ResponseCode.Error, msg: '获取阅读器token失败'})
        }

        // 开始阅读
        const result = await web_book_read_init(
            bookId,
            2,
            0,
            0,
            pc,
            ps,
            "epub",
            cookie,
        )
        if (result.succ === 1 && result.synckey) {
            // 添加到 kv 中
            await taskManager.setReaderToken(readerToken)
            await taskManager.addReadingTask(credential, bookInfo, pc, ps)
            console.debug(`开始阅读成功: (vid: ${credential.vid}, name:${credential.name}, book: ${book.title})`)
        } else {
            console.warn(`开始阅读失败: (vid: ${credential.vid}, name:${credential.name}, book: ${book.title})`)
            console.warn(result)
        }
        return result
    })
}

/**
 * 取消自动阅读任务
 * @param req
 */
export async function stopRead(req: Request) {
    const params: ParamCheckEntity[] = [
        {
            name: "token",
            from: "header",
            statusCode: ResponseCode.CredentialError,
            statusText: "token无效",
        },
    ];

    return await apiCallWithRetry(req, params, async (_, credential: Credential) => {
        await taskManager.removeReadingTask(credential)
        return jsonResponse({code: ResponseCode.Success, msg: '取消成功'})
    })
}

/**
 * 查询用户的任务
 * @param req
 */
export async function queryTask(req: Request) {
    const params: ParamCheckEntity[] = [
        {
            name: "token",
            from: "header",
            statusCode: ResponseCode.CredentialError,
            statusText: "token无效",
        },
    ];

    return await apiCallWithRetry(req, params, async (_, credential: Credential) => {
        const task = await taskManager.getReadingTask(credential)
        // 删除掉敏感数据
        let payload = null
        if (task) {
            payload = {
                ...task,
                credential: null
            }
        }

        return jsonResponse({code: ResponseCode.Success, data: payload, msg: 'success'})
    })
}
