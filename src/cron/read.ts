import * as taskManager from "../kv/task.ts";
import * as credentialUtil from "../kv/credential.ts";
import type {Credential} from "../kv/credential.ts";
import {jsonResponse, randomInteger, sleep, formatSeconds} from "../utils/index.ts";
import {ResponseCode} from "../frontend/apis/common.ts";
import {web_book_read} from "../apis/web/book.ts";
import {friend_ranking} from "../apis/app/friend.ts";
import {ErrCode} from "../apis/err-code.ts";
import {web_login_renewal} from "../apis/web/login.ts";


/**
 * 执行自动阅读任务
 * 由外部的 cron 触发，每 **30分钟** 触发一次
 */
export async function runReadTask(_: Request) {
    console.debug('%c触发 cron::runReadTask 任务', 'color: green')
    const start = Date.now()

    const tasks = await taskManager.getAllReadingTask()
    const readerToken = await taskManager.getReaderToken() || ''

    for (const task of tasks) {
        const taskStartTime = Date.now()

        // 准备这个任务的相关参数
        const bookId = task.book.bookId
        const token = task.credential.token
        let credential = await credentialUtil.getByToken(token)

        // 先检查 cookie 是不是可能过期
        if (Date.now() - credential.updatedAt >= 1000 * (5400 - 30) /* 留30秒空隙 */) {
            // cookie 可能已经过期，尝试刷新
            const refreshCookieSuccess = await refreshCookie(task.credential)
            if (!refreshCookieSuccess) {
                // 刷新失败，就没必要执行下去了
                console.log(`cookie刷新失败，跳过任务(${task.credential.name}:${task.credential.vid}:${task.book.title})`)
                continue
            }
            // 刷新之后获取最新的 cookie
            credential = await credentialUtil.getByToken(token)
        }


        // 计算服务器及客户端加载的时间戳
        const pc = Math.floor(new Date('2023-10-09T15:10+08:00').getTime() / 1000)
        const ps = pc - randomInteger(2, 10)

        // 查询最新的阅读进度
        let latestSeconds = await getReadingTime(credential)
        if (latestSeconds === -1) {
            // 获取失败，跳过这个任务
            console.log(`获取进度失败，跳过任务(${task.credential.name}:${task.credential.vid}:${task.book.title})`)
            continue
        }

        let stop = false
        let totalSeconds = 0
        const readTime = 60 // 每次更新的阅读时长，单位为秒

        while (!stop) {
            const resp = await updateRead(bookId, pc, ps, readerToken, credential, readTime)
            if (resp.succ === 1) {
                // 更新进度成功，查询本次增加的阅读时长
                const seconds = await getReadingTime(credential)
                if (seconds === -1) {
                    // 获取进度数据失败，结束本次任务
                    stop = true
                } else {
                    // 更新成功
                    const delta = seconds - latestSeconds
                    totalSeconds += delta
                    latestSeconds = seconds

                    if (delta !== readTime) {
                        // 实际更新数值不等于发起的请求，循环结束
                        stop = true
                    } else {
                        await sleep(2000)
                    }
                }
            } else {
                // 更新进度失败
                stop = true
            }
        }

        console.log(`任务(${task.credential.name}:${task.credential.vid}:${task.book.title})成功更新: %c${formatSeconds(totalSeconds)}%c，耗时: ${((Date.now() - taskStartTime) / 1000).toFixed(1)}s`, 'color: green;font-weight: bold;', '')

        // 写入
        await taskManager.updateReadingTask(credential, totalSeconds)
    }

    console.log(`全部任务(${tasks.length})执行完毕，耗时: %c${((Date.now() - start) / 1000).toFixed(1)}s`, 'color: red; font-weight: bold;')
    return jsonResponse({code: ResponseCode.Success, msg: '阅读任务执行完成'})
}

/**
 * 更新阅读进度
 */
async function updateRead(bookId: string, pc: number, ps: number, readerToken: string, credential: Credential, readTime: number) {
    const resp = await web_book_read(
        bookId,
        2,
        0,
        0,
        pc,
        ps,
        "epub",
        readerToken,
        credentialUtil.getCookieByCredential(credential),
        readTime,
    )
    if (resp.succ !== 1) {
        console.warn('更新阅读进度接口失败: ', resp, credential)

        // 如果出现cookie过期，则刷新cookie
        if (resp.errCode === ErrCode.SessionTimeout) {
            await refreshCookie(credential)
        } else {
            // 其他类型的错误暂不处理
        }
    }

    return resp
}

/**
 * 获取阅读时长(秒)
 */
async function getReadingTime(credential: Credential): Promise<number> {
    const resp = await friend_ranking(credential.vid, credential.skey)
    if (resp && resp.ranking && Array.isArray(resp.ranking)) {
        // deno-lint-ignore no-explicit-any
        const targetRank = resp.ranking.find((_: any) => _.user.userVid === credential.vid)
        if (targetRank) {
            return targetRank.readingTime
        } else {
            console.warn(`没有找到目标用户排名数据(vid:${credential.vid}, name:${credential.name}, skey:${credential.skey})`)
            return -1
        }
    } else {
        console.warn('获取阅读时长接口失败: ', resp, credential)

        if (resp.errcode === ErrCode.SessionTimeout) {
            await refreshCookie(credential)
        }

        return -1
    }
}

/**
 * 刷新cookie
 * @param credential
 */
export async function refreshCookie(credential: Credential) {
    try {
        const oldCookie = credentialUtil.getCookieByCredential(credential)
        const credentialInfo = await web_login_renewal("/web/shelf/sync", oldCookie);
        const {accessToken, refreshToken} = credentialInfo;
        credential.skey = accessToken
        credential.rt = refreshToken
        credential.updatedAt = Date.now()
        await credentialUtil.update(credential)
        return true
    } catch (e) {
        if (e.message !== '微信登录授权已过期，继续购买需跳转到微信重新登录') {
            console.error(e);
        }
        return false
    }
}
