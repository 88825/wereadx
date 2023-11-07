import { ErrLogRecord, insertErrLogRecords } from "../database/errlog.ts";
import { now, runInDenoDeploy } from "../utils/index.ts";

export enum ErrCode {
  /**
   * 用户不存在
   */
  UserNotExist = -2010,

  /**
   * 会话超时
   */
  SessionTimeout = -2012,

  /**
   * 鉴权失败
   */
  AuthenticationFailed = -2013,

  /**
   * 请求频率过高
   */
  HighFrequency = -2014,

  /**
   * 微信授权已过期，需重新登录
   */
  AuthenticationTimeout = -12013,

  /**
   * 无权限下载
   */
  NoPermissionDownload = -2038,
}

/**
 * 检查错误码
 * @param resp
 * @param user
 */
export async function checkErrCode(resp: Response, user: number | string) {
  const clonedResp = resp.clone();
  try {
    const contentType = clonedResp.headers.get("Content-Type") || "text/html";
    if (contentType.includes("json")) {
      const respData = await clonedResp.json();
      const errCode = respData.errCode || respData.errcode;
      const errMsg = respData.errMsg || respData.errmsg;

      // 针对特殊错误进行的特殊处理
      switch (errCode) {
        // 用户不存在
        case ErrCode.UserNotExist:
          break;
        // 会话超时
        case ErrCode.SessionTimeout:
          break;
        // 鉴权失败
        case ErrCode.AuthenticationFailed:
          break;
        // 请求频率过高
        case ErrCode.HighFrequency:
          break;
        // 授权超时，需重新登录
        case ErrCode.AuthenticationTimeout:
          break;
        // 无权限下载
        case ErrCode.NoPermissionDownload:
          break;
        default:
          break;
      }

      const errlog: ErrLogRecord = {
        user_info: user.toString(),
        err_code: errCode,
        err_msg: errMsg,
        timestamp: now(),
      };

      if (errCode) {
        // 如果是运行在 Deno Deploy 上面，则记录下载的书
        if (runInDenoDeploy()) {
          // 可能没有配置，所以包在 try catch 里面执行
          try {
            await insertErrLogRecords([errlog]);
          } catch (e) {
            console.warn(e.message);
          }
        } else {
          console.warn(errlog);
        }
      }
    }
  } catch (_) {
    // no op
  }
}
