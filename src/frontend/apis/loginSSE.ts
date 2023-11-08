import {
  web_confirm,
  web_login_getinfo,
  web_login_getuid,
  web_login_session_init,
  web_login_weblogin,
} from "../../apis/web/login.ts";
import * as credentialUtil from "../../kv/credential.ts";
import * as taskManager from "../../kv/task.ts"
import {getUlid} from "../../utils/index.ts";
import {sendEvent} from "./common.ts";
import {web_user} from "../../apis/web/user.ts";
import {Credential} from "../../kv/credential.ts";


/**
 * 登录
 * @param _
 */
export function loginSSE(_: Request): Response {
    let isClosed = false;
    const body = new ReadableStream({
        start: async (controller) => {
            try {
                const {uid} = await web_login_getuid();
                const url = web_confirm(uid);
                sendEvent(isClosed, controller, "qrcode", url);

                const info = await web_login_getinfo(uid);
                if (isClosed) {
                    return
                }
                if (info.scan === 0) {
                    // 超时未扫码，前端二维码过期
                    sendEvent(isClosed, controller, "expired");
                    return;
                }

                const auth = await web_login_weblogin(info);
                const resp = await web_login_session_init(auth);
                if (resp.success === 1) {
                    // 登录成功，生成一个随机数作为前端的 token
                    const token = getUlid();
                    // 获取用户名
                    const userResp = await web_user(auth.vid, `wr_vid=${auth.vid};wr_skey=${auth.accessToken};wr_rt=${auth.refreshToken};`)
                    const credential: Credential = {
                        token: token,
                        vid: Number(auth.vid),
                        skey: auth.accessToken,
                        rt: auth.refreshToken,
                        updatedAt: Date.now(),
                        name: userResp.name || 'unknown',
                    }
                    await credentialUtil.update(credential)
                    sendEvent(isClosed, controller, "token", token);

                    // 更新阅读任务中的token
                    await taskManager.updateTaskToken(credential)
                } else {
                    console.warn("会话初始化失败: ", resp);
                }
            } catch (e) {
                console.error(e);
                sendEvent(isClosed, controller, "error", e.message);
            } finally {
                sendEvent(isClosed, controller, "close");
            }
        },
        cancel(reason) {
            console.debug('loginSSE: ', reason);
            isClosed = true
        },
    });

    return new Response(body, {
        headers: {
            "Content-Type": "text/event-stream",
            "Access-Control-Allow-Origin": "*",
        },
    });
}
