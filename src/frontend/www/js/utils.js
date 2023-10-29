// 处理图片的尺寸
export function fixImgSize(preRenderContainerRef, containerWidth) {
    let imgs = preRenderContainerRef.getElementsByTagName('img'),
        imgCount = imgs.length;
    if (imgCount > 0) {
        for (let i = 0; i < imgCount; i++) {
            let img = imgs[i],
                imgHtml = img.outerHTML,
                minWidth = Math.min(containerWidth, img.parentNode.offsetWidth)
            if (-1 !== imgHtml.indexOf('data-w') && -1 !== imgHtml.indexOf('data-ratio')) {
                let dataWRe = new RegExp('data-w="(.*?)px"', 'ig')
                imgHtml.match(dataWRe)
                let _0x4e5abc = RegExp.$1,
                    height = _0x4e5abc && _0x4e5abc.length > 0 ? parseInt(_0x4e5abc) : 0;
                if (new RegExp('data-w-new="(.*?)px"', 'ig').test(imgHtml)) {
                    dataWRe = new RegExp('data-w-new="(.*?)px"', 'ig')
                    imgHtml.match(dataWRe)
                    let _0x43652c = RegExp['$1']
                    height = _0x43652c && _0x43652c.length > 0 ? parseInt(_0x43652c) : 0;
                }
                dataWRe = new RegExp('data-ratio="(.*?)"', 'ig')
                imgHtml.match(dataWRe)
                let _0x4e141b = RegExp['$1'],
                    ratio = _0x4e141b && _0x4e141b.length > 0 ? parseFloat(_0x4e141b) : 0;
                if (0 !== height && 0 !== ratio) {
                    let rect = img.getBoundingClientRect(),
                        intrinsicWidth = height / ratio,
                        width = intrinsicWidth;
                    if ((dataWRe = new RegExp('width[0-9]{2,3}', 'ig')).test(imgHtml)) {
                        dataWRe = new RegExp('width([0-9]{2,3})', 'ig')
                        imgHtml.match(dataWRe)
                        let _0x393c31 = RegExp['$1'],
                            _0x46779f = _0x393c31 && _0x393c31.length > 0 ? parseInt(_0x393c31) : 0;
                        if (_0x46779f > 0 && _0x46779f <= 100) {
                            height *= (width = minWidth * _0x46779f / 100) / intrinsicWidth
                        }
                    } else {
                        -1 !== imgHtml.indexOf('qqreader-fullimg') || -1 !== imgHtml.indexOf('bleed-pic') || img.parentNode.classList.contains('bleed-pic')
                            ? height *= (width = minWidth) / intrinsicWidth
                            : rect.height > 1
                                ? width = (height = rect.height) / ratio
                                : rect.width > 1 && (height *= (width = rect.width) / intrinsicWidth)
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
