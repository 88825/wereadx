import {v4 as uuidv4} from "https://esm.sh/uuid@latest";

// 处理图片的尺寸
export function fixImgSize(rootElement, containerWidth) {
    const imgs = rootElement.getElementsByTagName('img')
    for (const img of imgs) {
        const imgHtml = img.outerHTML
        const minWidth = Math.min(containerWidth, img.parentNode.offsetWidth)
        if (imgHtml.includes('data-w') && imgHtml.includes('data-ratio')) {
            let datawRe = /data-w="(.*?)px"/gi
            imgHtml.match(datawRe)
            let dataw = RegExp.$1
            let height = dataw && dataw.length > 0 ? parseInt(dataw) : 0;
            if (/data-w-new="(.*?)px"/gi.test(imgHtml)) {
                datawRe = /data-w-new="(.*?)px"/gi
                imgHtml.match(datawRe)
                let datawNew = RegExp.$1
                height = datawNew && datawNew.length > 0 ? parseInt(datawNew) : 0;
            }
            datawRe = /data-ratio="(.*?)"/gi
            imgHtml.match(datawRe)
            let dataRatio = RegExp.$1
            let ratio = dataRatio && dataRatio.length > 0 ? parseFloat(dataRatio) : 0;
            if (0 !== height && 0 !== ratio) {
                let imgRect = img.getBoundingClientRect()
                let intrinsicWidth = height / ratio
                let width = intrinsicWidth
                if ((datawRe = /width[0-9]{2,3}/gi).test(imgHtml)) {
                    datawRe = /width([0-9]{2,3})/gi
                    imgHtml.match(datawRe)
                    let widthNum = RegExp.$1
                    let widthN = widthNum && widthNum.length > 0 ? parseInt(widthNum) : 0;
                    if (widthN > 0 && widthN <= 100) {
                        height *= (width = minWidth * widthN / 100) / intrinsicWidth
                    }
                } else {
                    imgHtml.includes('qqreader-fullimg') || imgHtml.includes('bleed-pic') || img.parentNode.classList.contains('bleed-pic')
                        ? height *= (width = minWidth) / intrinsicWidth
                        : imgRect.height > 1
                            ? width = (height = imgRect.height) / ratio
                            : imgRect.width > 1 && (height *= (width = imgRect.width) / intrinsicWidth)
                }
                if (width > minWidth && minWidth > 1) {
                    height *= minWidth / width
                    width = minWidth
                }
                img.style.width = width + 'px'
                img.style.height = height + 'px'
            }
        }
    }
}

export function gotoLogin() {
    localStorage.removeItem('token')
    window.location.href = '/login.html'
}

/**
 * 检查本地token是否存在，不存在跳转登录页，存在则返回
 * @return {string}
 */
export function checkLogin() {
    const token = localStorage.getItem('token')
    if (!token) {
        gotoLogin()
        throw new Error('请先登录')
    }
    return token
}

/**
 * 处理响应异常
 * @param resp
 */
export function handleRespError(resp) {
    const {code, msg} = resp
    if (code === 2) {
        gotoLogin()
        throw new Error('token过期，跳转登录页')
    } else if (code !== 0) {
        alert(msg)
        throw new Error('接口失败: ' + msg)
    }
}

export function uuid() {
    return uuidv4()
}
