import {get, postJSON} from "../../utils/request.ts";
import {UserAgentForApp} from "../../config.ts";

/**
 * @example 返回示例
 * { errcode: -2013, errlog: "C4oh4r3", errmsg: "鉴权失败" }
 */
export async function login(refreshToken: string) {
    const resp = await postJSON("https://i.weread.qq.com/login", {
        deviceId: "1",
        refCgi: "",
        refreshToken: refreshToken,
    }, {
        "User-Agent": UserAgentForApp,
    })
    return resp.json()
}

export async function profile(vid: number | string, skey: string) {
    const resp = await get("https://i.weread.qq.com/user/profile", {
        articleBookId: 1,
        articleCount: 1,
        articleReadCount: 1,
        articleSubscribeCount: 1,
        articleWordCount: 1,
        audioCommentedCount: 1,
        audioCount: 1,
        audioLikedCount: 1,
        audioListenCount: 1,
        authorTotalReadCount: 1,
        bookReviewCount: 1,
        booklistCollectCount: 1,
        booklistCount: 1,
        buyCount: 1,
        canExchange: 1,
        canExchangeDay: 1,
        continueReadDays: 1,
        curMonthReadTime: 1,
        followerCount: 1,
        followerListCount: 1,
        followingCount: 1,
        followingListCount: 1,
        gameInfo: 1,
        gender: 1,
        likeBookCount: 1,
        location: 1,
        medalInfo: 1,
        noteBookCount: 1,
        readCount: 1,
        readHistory: 1,
        readingTeam: 1,
        reviewCommentedCount: 1,
        reviewCount: 1,
        reviewLikedCount: 1,
        signature: 1,
        totalLikedCount: 1,
        totalNoteCount: 1,
        totalReadingTime: 1,
        unfinishOrderCount: 1,
        vDesc: 1,
    }, {
        vid: vid.toString(),
        skey: skey,
        "User-Agent": UserAgentForApp,
        v: '7.4.2.23'
    })
    return resp.json()
}

export async function device_sessionlist(deviceId: string, vid: number | string, skey: string) {
    const resp = await get("https://i.weread.qq.com/device/sessionlist", {
        deviceId: deviceId,
        onlyCnt: "1",
    }, {
        vid: vid.toString(),
        skey: skey,
        "User-Agent": UserAgentForApp,
        v: '7.4.2.23'
    })
    return resp.json()
}

export async function device_sessionremove(currentDeviceId: string, removeDeviceIds: string[], vid: number | string, skey: string) {
    const resp = await postJSON("https://i.weread.qq.com/device/sessionremove", {
        removeDeviceIds: removeDeviceIds,
        currentDeviceId: currentDeviceId
    }, {
        vid: vid.toString(),
        skey: skey,
        "User-Agent": UserAgentForApp,
        v: '7.4.2.23'
    })
    return resp.json()
}

export async function phoneCheck(phone: string) {
    const resp = await get("http://i.weread.qq.com/phoneCheck", {
        tel: phone,
    }, {

    })
    return resp.json()
}
