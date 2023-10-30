document.addEventListener('DOMContentLoaded', () => {
    const btnEl = document.querySelector('button')

    if (btnEl) {
        btnEl.addEventListener('click', async () => {
            await downloadImage('https://res.weread.qq.com/wrepub/CB_43168703_cover.jpg')
        })
    }
})

async function downloadImage(url) {
    const resp = await chrome.runtime.sendMessage({ url: url })
    console.log('下载结果:', resp)
}
