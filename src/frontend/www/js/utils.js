import {v4 as uuidv4} from "https://esm.sh/uuid@latest";

// 处理图片的尺寸
function fixImgSize(rootElement, containerWidth) {
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

/**
 * 通过一个 iframe 渲染图片并调整图片大小
 * @param chapterHtml
 * @return {Promise<string>}
 */
export function adjustImgSizeInChapter(chapterHtml) {
    return new Promise((resolve, reject) => {
        const iframe = document.createElement('iframe')
        iframe.srcdoc = chapterHtml
        iframe.style.visibility = 'hidden'
        iframe.style.position = 'absolute'
        iframe.style.left = '0'
        iframe.style.top = '0'
        iframe.style.zIndex = '-1'
        iframe.style.width = '800px'
        iframe.style.frameborder = '0'
        iframe.onload = function () {
            fixImgSize(iframe.contentDocument.documentElement, 800)
            const resultHtml = iframe.contentDocument.body.innerHTML
            resolve(resultHtml)
            iframe.remove()
        }
        iframe.onerror = function (event) {
            console.error(event)
            reject(new Error('图片加载失败'))
            iframe.remove()
        }
        document.body.appendChild(iframe)
    })
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

export function formatDate(date) {
    return new Intl.DateTimeFormat("zh-CN", {
        dateStyle: "short",
        timeStyle: "medium",
        timeZone: "Asia/Shanghai",
    }).format(date);
}

/**
 * 把 flat 结构的章节数据转换成 tree 结构的目录
 * @param chapters
 * @return {*[]}
 */
export function convertChaptersToToc(chapters) {
    const toc = [];
    const stack = [];

    for (const chapter of chapters) {
        const { level } = chapter;

        while (stack.length >= level) {
            stack.pop();
        }

        if (stack.length > 0) {
            const parent = stack[stack.length - 1];
            if (!parent.children) {
                parent.children = [];
            }
            parent.children.push(chapter);
        } else {
            toc.push(chapter);
        }

        stack.push(chapter);
    }

    return toc;
}

export function sleep(duration) {
    return new Promise((resolve) => {
        setTimeout(resolve, duration)
    })
}


/**
 * 打包 zip 文件
 * @param {string} filename
 * @param {string} content
 * @return {Promise<void>}
 */
export async function zipFile(filename, content) {
    const zip = new JSZip()
    zip.file(filename, content)
    const blob = await zip.generateAsync({type: "blob"})
    saveAs(blob, `${filename}.zip`)
}
