import {loginSSE} from "./frontend/apis/loginSSE.ts";
import {
    bookChapters,
    bookDetail,
    bookDownload,
    bookList,
    getDownloadSecret,
} from "./frontend/apis/shelf.ts";
import {reviewList} from "./frontend/apis/review.ts";
import {userInfo} from "./frontend/apis/user.ts";
import {
    friendRank,
    queryTask,
    startRead,
    stopRead,
} from "./frontend/apis/task.ts";
import {runExchangeTask} from "./cron/exchange.ts";
import {runReadTask} from "./cron/read.ts";
import {getPdfUrl} from "./frontend/apis/misc.ts";

type APIHandler = (req: Request) => Response | Promise<Response>

const config: Record<string, APIHandler> = {
    '/api/user/login': loginSSE,
    '/api/user/info': userInfo,

    '/api/shelf/book/list': bookList,
    '/api/book/detail': bookDetail,
    '/api/book/chapters': bookChapters,
    '/api/book/download/secret': getDownloadSecret,
    '/api/book/download': bookDownload,
    '/api/book/getUrl': getPdfUrl,

    '/api/review/list': reviewList,

    '/api/friend/rank': friendRank,     // 查询读书排行榜
    '/api/task/read/start': startRead,  // 加入自动阅读
    '/api/task/read/stop': stopRead,    // 取消自动阅读
    '/api/task/read/query': queryTask,  // 查询阅读任务

    '/cron/exchange-awards': runExchangeTask,   // 兑换体验卡
    '/cron/read/v2': runReadTask,               // 自动阅读任务
}

/**
 * 处理前端api请求
 * @param api
 * @param req
 */
export function routeApi(api: string, req: Request) {
    if (api in config) {
        return config[api](req)
    } else {
        return new Response(null, {
            status: 502,
        })
    }
}
