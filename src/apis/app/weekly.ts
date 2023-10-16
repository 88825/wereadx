// deno-lint-ignore-file no-explicit-any

import {postJSON} from "../../utils/request.ts";
import {UserAgentForApp} from "../../config.ts";

const platform = "weread_wx-2001-iap-2001-iphone"

/**
 * 查询所有可兑换列表
 * @param vid
 * @param skey
 */
export async function queryAllAwards(vid: string | number, skey: string) {
    const resp = await postJSON("https://i.weread.qq.com/weekly/exchange", {
        awardLevelId: 0,
        awardChoiceType: 0,
        isExchangeAward: 0,
        pf: platform,
    }, {
        vid: vid.toString(),
        skey: skey,
        "User-Agent": UserAgentForApp,
    })
    return resp.json()
}

function awardFilter(data: any) {
    const awards = []
    awards.push(
        ...data.readtimeAwards.map((item: any) => ({
            id: item.awardLevelId,
            status: item.awardStatus,
            statusDesc: item.awardStatusDesc,
            name: `${item.awardLevelDesc}${item.awardChoicesDesc}`.replace(/\s/g, ''),
        }))
    )
    awards.push(
        ...data.readdayAwards.map((item: any) => ({
            id: item.awardLevelId,
            status: item.awardStatus,
            statusDesc: item.awardStatusDesc,
            name: `${item.awardLevelDesc}${item.awardChoicesDesc}`.replace(/\s/g, ''),
        }))
    )
    return awards
}

/**
 * 兑换体验卡
 * @param id
 * @param vid
 * @param skey
 */
async function exchangeAward(id: number | string, vid: string | number, skey: string) {
    const resp = await postJSON("https://i.weread.qq.com/weekly/exchange", {
        awardLevelId: id,
        awardChoiceType: 1, // 免费账户只能兑换体验卡
        isExchangeAward: 1,
        pf: platform,
    }, {
        vid: vid.toString(),
        skey: skey,
        "User-Agent": UserAgentForApp,
    })
    return resp.json()
}

/**
 * 兑换所有可兑换的体验卡
 */
export async function exchangeAllAward(vid: string | number, skey: string) {
    const resp = await queryAllAwards(vid, skey)
    if (resp.errcode) {
        // 接口出错，可能是skey过期
        return resp
    }

    const arards = awardFilter(resp)

    for (const award of arards.filter((_: any) => _.status === 1)) {
        const resp = await exchangeAward(award.id, vid, skey)
        if (resp.errcode) {
            // 接口出错，可能是skey过期
            return resp
        }
    }
}
