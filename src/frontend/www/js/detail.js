import {fixImgSize, checkLogin, handleRespError, uuid} from "./utils.js"
import exportToEpub from "../epub/index.js"

let bookDetail = null
let bookChapters = []
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

        downloadEBook(resp.data, token, 'html')
    })
    // 下载 pdf
    document.querySelector('.download_pdf_btn').addEventListener('click', async (event) => {
        event.preventDefault()

        const token = localStorage.getItem('token')
        const bookId = new URLSearchParams(location.search).get('bookId')
        await downloadPDF(token, bookId)
    })
    // 下载 epub
    document.querySelector('.download_epub_btn').addEventListener('click', async () => {
        const token = localStorage.getItem('token')
        const bookId = new URLSearchParams(location.search).get('bookId')

        if (bookDetail && bookDetail.format === 'pdf') {
            // 只有 pdf 版本可用，下载 pdf 文件
            alert('本书为 pdf 格式，请通过下面的链接进行下载')
            return
        }

        document.querySelector('.download_epub_btn').disabled = true
        const resp = await getDownloadSecret(bookId, token).finally(() => {
            document.querySelector('.download_epub_btn').disabled = false
        })
        handleRespError(resp)

        downloadEBook(resp.data, token, 'epub')
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
    // 封面图替换成高清图片
    const re = /(.+)\/s_([^/]+)$/
    if (re.test(bookDetail.cover)) {
        bookDetail.cover = bookDetail.cover.replace(/(.+)\/s_([^/]+)$/, '$1/t6_$2')
    }
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
    bookChapters = chapters
    renderToc(chapters)
}


/**
 * 通过一个 iframe 渲染图片并调整图片大小
 * @param chapterHtml
 * @return {Promise<string>}
 */
function fixImgSizeInChapter(chapterHtml) {
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
 * @param {string} filename
 * @param {string} content
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
 * @param bookDetail
 * @param {string[]} htmls
 * @param {string[]} styles
 * @param {string[]} scripts
 * @return {Promise<void>}
 */
async function zipBookContent2HTML(bookDetail, htmls, styles = [], scripts = []) {
    const {title} = bookDetail
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
    await zip(title, html)
}

/**
 * 打包epub
 * @param bookDetail
 * @param {{title: string, content_html: string}[]} chapters
 * @param {string[]} styles
 * @param {string[]} scripts
 * @return {Promise<void>}
 */
async function zipBookContent2Epub(bookDetail, chapters, styles = [], scripts = []) {
    let {title, author, cover, intro, isbn, publishTime, publisher} = bookDetail

    /**
     * @type {import('../epub/index.js').Book}
     */
    const book = {
        id: uuid(),
        cover: cover,
        isbn: isbn,
        author: author.replace(/\s+著$/i, ''),
        description: intro,
        publisher: publisher,
        publishTime: publishTime,
        title: title,
        chapters: chapters,
        styles: styles,
        scripts: scripts,
    }
    await exportToEpub(book)
}

/**
 * 获取下载凭证
 * @param bookId
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
 * 下载 html/epub 版本
 * @param secret
 * @param token
 * @param format
 */
function downloadEBook(secret, token, format = 'html') {
    if (evtSource) {
        // 关闭之前的下载通道
        evtSource.close()
    }

    /**
     *
     * @type {{idx: number, chapterUid: number, html: string}[]}
     */
    const htmls = []
    /** @type {string[]} */
    const styles = []
    /** @type {string[]} */
    const scripts = []

    let receivedChapterCount = 0
    let hasDownloaded = false

    document.querySelector(`.download_${format}_btn`).disabled = true

    const query = new URLSearchParams({secret, token}).toString()
    evtSource = new EventSource(new URL('/api/book/download?' + query, location.origin).toString())
    evtSource.addEventListener('close', () => {
        evtSource.close()
    })
    // 自定义样式与脚本
    evtSource.addEventListener('preface', (event) => {
        const {styles: s1, scripts: s2} = JSON.parse(event.data)
        styles.push(...s1)
        scripts.push(...s2)
    }, false)

    // 单章下载完成
    evtSource.addEventListener('progress', (event) => {
        const {total, current, chapterUid, content} = JSON.parse(event.data)
        receivedChapterCount++
        fixImgSizeInChapter(content).then(html => {
            htmls.push({
                idx: current,
                chapterUid: chapterUid,
                html: html,
            })
        }).catch(err => {
            alert(err.message)
        })
        document.querySelector(`.download_${format}_btn`).textContent = `进度: ${current}/${total}`
    }, false)

    function bundleBook() {
        if (format === 'html') {
            document.querySelector(`.download_${format}_btn`).textContent = '正在打包'
        } else if (format === 'epub') {
            document.querySelector(`.download_${format}_btn`).textContent = '正在打包图片'
        }
        if (htmls.length === receivedChapterCount) {
            setTimeout(async () => {
                // 重新整理顺序
                const sortedHtml = htmls.sort((a, b) => a.idx - b.idx)
                if (format === 'html') {
                    const htmls = sortedHtml.map(_ => _.html)
                    await zipBookContent2HTML(bookDetail, htmls, styles, scripts)
                } else if (format === 'epub') {
                    /**
                     * @type {{title: string, content_html: string}[]}
                     */
                    const chapters = sortedHtml.map(_ => {
                        const chapter = bookChapters.find(c => c.chapterUid === _.chapterUid)
                        return {
                            title: chapter ? chapter.title : '[Untitled]',
                            content_html: _.html,
                        }
                    })
                    await zipBookContent2Epub(bookDetail, chapters, styles, scripts)
                } else {
                    alert('不支持的下载格式: ' + format)
                }

                document.querySelector(`.download_${format}_btn`).disabled = false
                if (format === 'html') {
                    document.querySelector(`.download_${format}_btn`).textContent = '开始下载'
                } else if (format === 'epub') {
                    document.querySelector(`.download_${format}_btn`).textContent = '下载 epub (测试)'
                }
            }, 0)
        } else {
            setTimeout(bundleBook, 500)
        }
    }

    // 整本书下载完成
    evtSource.addEventListener('complete', () => {
        bundleBook()
        hasDownloaded = true
    }, false)

    // 出错
    evtSource.addEventListener('error', (event) => {
        evtSource.close()
        console.error(event)
        if (event.data) {
            alert(event.data)
        }

        // 出错时将已经下载好的章节合并导出
        if (!hasDownloaded) {
            bundleBook()
        }
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
