import {gotoLogin, fixImgSize, checkLogin, handleRespError} from "./utils.js"

let bookDetail = null
let evtSource


window.addEventListener('DOMContentLoaded', async () => {
    const token = checkLogin()

    await fetchAndRenderBookInfo(token)

    // 下载 html
    document.querySelector('.download_html_btn').addEventListener('click', async () => {
        const token = localStorage.getItem('token')
        const bookId = new URLSearchParams(location.search).get('bookId')

        if (bookDetail && bookDetail.format === 'pdf' && !bookDetail.otherType) {
            // 只有 pdf 版本可用，下载 pdf 文件
            await downloadPDF(token, bookId)
            return
        } else if (bookDetail && bookDetail.format === 'pdf') {
            const ok = confirm('注意：这本书的原始格式为 pdf，本次下载的为 html 格式，如果想下载原始格式，可通过下方的详细信息中的链接进行下载。是否继续下载 html 版本？')
            if (!ok) {
                return
            }
        }

        document.querySelector('.download_html_btn').disabled = true
        const resp = await getDownloadSecret(bookId, token).finally(() => {
            document.querySelector('.download_html_btn').disabled = false
        })
        handleRespError(resp)

        downloadHtml(resp.data, token, bookId)
    })
    // 下载 pdf
    document.querySelector('.download_pdf_btn').addEventListener('click', async (event) => {
        event.preventDefault()

        const token = localStorage.getItem('token')
        const bookId = new URLSearchParams(location.search).get('bookId')
        await downloadPDF(token, bookId)
    })
    // 添加阅读
    document.querySelector('.add_task').addEventListener('click', async () => {
        const token = localStorage.getItem('token')
        const bookId = new URLSearchParams(location.search).get('bookId')

        document.querySelector('.add_task').disabled = true
        const resp = await fetch('/api/task/read/start', {
            headers: {
                token: token,
                bookId: bookId,
            }
        }).then(resp => resp.json()).finally(() => {
            document.querySelector('.add_task').disabled = false
        })

        handleRespError(resp)
        if (resp.data.succ !== 1 || !resp.data.synckey) {
            alert('接口调用失败，请提交issue')
        } else {
            alert('添加成功')
        }
    })
    // 去微信读书阅读
    document.querySelector('.begin_read').addEventListener('click', async () => {
        const token = localStorage.getItem('token')
        const bookId = new URLSearchParams(location.search).get('bookId')

        document.querySelector('.begin_read').disabled = true
        const resp = await fetch('/api/book/hash', {
            headers: {
                token: token,
                bookId: bookId,
            }
        }).then(resp => resp.json()).finally(() => {
            document.querySelector('.begin_read').disabled = false
        })

        handleRespError(resp)
        window.open(`https://weread.qq.com/web/bookDetail/${resp.data}`)
    })
})


/**
 * 渲染书籍元数据
 * @param book
 */
function renderBookMetaInfo(book) {
    let {title, author, cover, intro, format, isbn, publishTime, publisher, otherType} = book
    // 替换成高清图片
    const re = /(.+)\/s_([^/]+)$/
    if (re.test(cover)) {
        cover = cover.replace(/(.+)\/s_([^/]+)$/, '$1/t6_$2')
    }
    document.querySelector('.wr_bookCover_img').src = cover
    document.querySelector('.bookInfo_right_header_title_text').textContent = title
    document.querySelector('.bookInfo_author').textContent = '作者：' + (author || '无')
    document.querySelector('.format').textContent = format || '无'
    if (format === 'pdf') {
        document.querySelector('.download_pdf_btn').style.display = 'inline'
    }
    if (Array.isArray(otherType)) {
        document.querySelector('.otherFormat').textContent = otherType.map(_ => _.type).join('/')
    } else {
        document.querySelector('.otherFormat').textContent = '无'
    }
    document.querySelector('.isbn').textContent = isbn || '无'
    document.querySelector('.publishTime').textContent = publishTime ? formatDate(publishTime) : '无'
    document.querySelector('.publisher').textContent = publisher || '无'
    document.querySelector('.bookInfo_intro').textContent = '简介：' + (intro || '暂无')
}

/**
 * 渲染目录
 * @param chapters
 */
function renderToc(chapters) {
    const fragment = document.createDocumentFragment()
    for (const chapter of chapters) {
        const {title, level, chapterUid} = chapter
        const li = document.createElement('li')
        li.textContent = title
        li.className = 'chapter'
        li.dataset.level = level
        li.dataset.chapterUid = chapterUid
        fragment.append(li)
    }

    document.querySelector('.toc').append(fragment)
}

/**
 * 渲染详情数据
 * @return {Promise<void>}
 */
async function fetchAndRenderBookInfo(token) {
    const bookId = new URLSearchParams(location.search).get('bookId')
    const bookDetailResp = await fetch('/api/book/detail', {
        headers: {
            token: token,
            bookId: bookId,
        }
    }).then(resp => resp.json())
    handleRespError(bookDetailResp)

    bookDetail = bookDetailResp.data
    renderBookMetaInfo(bookDetail)

    // 获取目录
    const bookTocResp = await fetch('/api/book/chapters', {
        headers: {
            token: token,
            bookId: bookId,
        }
    }).then(resp => resp.json())
    handleRespError(bookTocResp)

    const chapters = bookTocResp.data.data[0].updated
    renderToc(chapters)
}


/**
 * 通过一个 iframe 渲染图片并调整图片大小
 * @param html
 * @return {Promise<string>}
 */
function fixImgSizeInHTML(html) {
    return new Promise((resolve, reject) => {
        const iframe = document.createElement('iframe')
        iframe.srcdoc = html
        iframe.style.visibility = 'hidden'
        iframe.style.position = 'absolute'
        iframe.style.left = '0'
        iframe.style.top = '0'
        iframe.style.zIndex = '-1'
        iframe.style.width = '798px'
        iframe.style.frameborder = '0'
        iframe.onload = function () {
            fixImgSize(iframe.contentDocument.documentElement, 798)
            const resultHtml = iframe.contentDocument.documentElement.outerHTML
            resolve(`<!DOCTYPE html>\n${resultHtml}`)
            iframe.remove()
        }
        iframe.onerror = function (event) {
            console.error(event)
            reject(new Error('iframe加载失败'))
            iframe.remove()
        }
        document.body.appendChild(iframe)
    })
}

/**
 * 格式化日期
 * @param date
 * @return {string}
 */
function formatDate(date) {
    const year = date.slice(0, 4)
    const month = date.slice(5, 7).replace(/^0+/, '')
    return `${year}年${month}月`
}


/**
 * 打包 zip 文件
 * @param filename
 * @param content
 * @return {Promise<void>}
 */
async function zip(filename, content) {
    const zip = new JSZip()
    zip.file(`${filename}.html`, content)
    const blob = await zip.generateAsync({type: "blob"})
    saveAs(blob, `${filename}.zip`)
}

/**
 * 合并章节及添加自定义内容，包括样式与脚本
 * @param title
 * @param htmls
 * @param styles
 * @param scripts
 * @return {Promise<void>}
 */
async function zipBookContent(title, htmls, styles = [], scripts = []) {
    const style = styles.map(style => `<style>${style}</style>`).join('\n')
    const script = scripts.map(script => `<script>${script}\x3c/script>`).join('\n')
    let html = `<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport"
          content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>${title}</title>
    ${style}
</head>
<body>
${htmls.join("\n")}
${script}
</body>
</html>
`

    html = await fixImgSizeInHTML(html)
    await zip(title, html)
}

/**
 * 获取下载凭证
 * @param bookId
 * @param chapterUids
 * @param token
 * @return {Promise<any>}
 */
function getDownloadSecret(bookId, token) {
    return fetch('/api/book/download/secret', {
        headers: {
            token: token,
            bookId: bookId,
        }
    }).then(resp => resp.json())
}

/**
 * 下载 html 版本
 * @param secret
 * @param token
 * @param bookId
 */
function downloadHtml(secret, token, bookId) {
    if (evtSource) {
        // 关闭之前的下载通道
        evtSource.close()
    }

    const htmls = []
    const styles = []
    const scripts = []

    document.querySelector('.download_html_btn').disabled = true

    const query = new URLSearchParams({secret, token}).toString()
    evtSource = new EventSource(new URL('/api/book/download?' + query, location.origin).toString())
    evtSource.addEventListener('close', () => {
        evtSource.close()
    })
    evtSource.addEventListener('error', async (event) => {
        evtSource.close()
        console.error(event)
        if (event.data) {
            alert(event.data)
        }
        document.querySelector('.download_html_btn').disabled = false
        document.querySelector('.download_html_btn').textContent = '开始下载'

        // 出错时将已经下载好的章节合并导出
        await zipBookContent(bookDetail.title, htmls, styles, scripts)
    })
    evtSource.addEventListener('progress', (event) => {
        const {total, current, content} = JSON.parse(event.data)
        htmls.push(content)
        document.querySelector('.download_html_btn').textContent = `进度: ${current}/${total}`
    }, false)
    evtSource.addEventListener('complete', (event) => {
        document.querySelector('.download_html_btn').textContent = '正在打包'
        setTimeout(async () => {
            await zipBookContent(bookDetail.title, htmls, styles, scripts)

            document.querySelector('.download_html_btn').disabled = false
            document.querySelector('.download_html_btn').textContent = '开始下载'
        }, 0)
    }, false)
    evtSource.addEventListener('preface', (event) => {
        const {styles: s1, scripts: s2} = JSON.parse(event.data)
        styles.push(...s1)
        scripts.push(...s2)
    }, false)
}

/**
 * 下载 pdf 版本
 * @param token
 * @param bookId
 */
async function downloadPDF(token, bookId) {
    const resp = await fetch('/api/book/getUrl', {
        headers: {
            token: token,
            bookId: bookId,
        }
    }).then(resp => resp.json())
    handleRespError(resp)
    window.open(resp.data.url)
}
