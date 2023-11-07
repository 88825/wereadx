import * as credentialUtil from "../kv/credential.ts";
import { exchangeAllAward } from "../apis/app/weekly.ts";
import { jsonResponse } from "../utils/index.ts";
import { ResponseCode } from "../frontend/apis/common.ts";
import { executeApiCallWithRetry } from "./common.ts";
import type { Credential } from "../kv/credential.ts";
import runtime from "../runtime.ts";

/**
 * 执行兑换体验卡任务
 * 由外部 cron 触发(Cloudflare Worker)
 * todo: 等 deno 原生支持 cron 后，可以切换为 deno cron
 */
export async function runExchangeTask(_: Request) {
  const key = new URL(_.url).searchParams.get("key");
  if (key !== runtime.cronKey) {
    console.warn(`外部触发 cron::runExchangeTask 任务，已忽略(${_.url} <- ${_.headers.get('referer')})`)
    return jsonResponse({code: ResponseCode.Error, msg: '非正常触发，已忽略'})
  }


  console.debug("触发 cron::runExchangeTask 任务");

  // 从配置中读取有哪些用户需要兑换
  const users: number[] = [];

  for (const vid of users) {
    const token = await credentialUtil.getTokenByVid(vid);
    if (!token) {
      continue;
    }

    const resp = await executeApiCallWithRetry(
      async (credential: Credential) => {
        return await exchangeAllAward(credential.vid, credential.skey);
      },
      token,
    );
    if (resp.code !== ResponseCode.Success) {
      // 重试失败
    }
  }

  return jsonResponse({ code: ResponseCode.Success, msg: "兑换任务执行完成" });
}
