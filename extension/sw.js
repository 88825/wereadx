chrome.runtime.onMessage.addListener(async ({url}, sender, sendResponse) => {
    console.log('开始下载:', url)
    const resp = await fetch(url)
    sendResponse(resp)
    return true
});
