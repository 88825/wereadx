import {get} from "../../utils/request.ts";
import {UserAgentForApp} from "../../config.ts";

type ReadDataMode = "weekly" | "monthly" | "anually" | "overall"

export async function readdata_detail(vid: number | string, skey: string, mode = "overall") {
    const resp = await get("https://i.weread.qq.com/readdata/detail", {
        baseTime: "0",
        defaultPreferBook: "0",
        mode: mode,
    }, {
        vid: vid.toString(),
        skey: skey,
        "User-Agent": UserAgentForApp,
        v: '7.4.2.23'
    })
    return resp.json()
}

export async function challenge_detail(vid: number | string, skey: string) {
    const resp = await get("https://i.weread.qq.com/challenge/detail", {
        scene: "1"
    }, {
        vid: vid.toString(),
        skey: skey,
        "User-Agent": UserAgentForApp,
        v: '7.4.2.23'
    })
    return resp.json()
}
