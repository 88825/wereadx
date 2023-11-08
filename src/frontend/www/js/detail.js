import {checkLogin, adjustImgSizeInChapter, handleRespError, convertChaptersToToc, uuid, sleep} from "./utils.js"
import {Book} from "../epub/epub.js";

let bookDetail = null
let bookToc = []
let evtSource


window.addEventListener('DOMContentLoaded', async () => {
    const token = checkLogin()
    const bookId = new URLSearchParams(location.search).get('bookId')

    await fetchAndRenderBookInfo(token)

    // 下载 html
    document.querySelector('.download_html_btn').addEventListener('click', async () => {
        await sleep(100)

        document.querySelector('.download_btn').classList.add('disabled')
        const resp = await getDownloadSecret(bookId, token).finally(() => {
            document.querySelector('.download_btn').classList.remove('disabled')
        })
        handleRespError(resp)

        downloadEBook(resp.data, token, 'html')
    })
    // 下载 epub
    document.querySelector('.download_epub_btn').addEventListener('click', async () => {
        await sleep(100)

        document.querySelector('.download_btn').classList.add('disabled')
        const resp = await getDownloadSecret(bookId, token).finally(() => {
            document.querySelector('.download_btn').classList.remove('disabled')
        })
        handleRespError(resp)

        downloadEBook(resp.data, token, 'epub')
    })
    // 下载 pdf
    document.querySelector('.download_pdf_btn').addEventListener('click', async (event) => {
        await sleep(100)

        document.querySelector('.download_btn').classList.add('disabled')
        await downloadPDF(token, bookId)
        document.querySelector('.download_btn').classList.remove('disabled')
    })
    // 添加阅读
    document.querySelector('.add_task').addEventListener('click', async () => {
        document.querySelector('.add_task').classList.add('disabled')
        const resp = await fetch('/api/task/read/start', {
            headers: {
                token: token,
                bookId: bookId,
            }
        }).then(resp => resp.json()).finally(() => {
            document.querySelector('.add_task').classList.remove('disabled')
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
        document.querySelector('.begin_read').classList.add('disabled')
        const resp = await fetch('/api/book/hash', {
            headers: {
                token: token,
                bookId: bookId,
            }
        }).then(resp => resp.json()).finally(() => {
            document.querySelector('.begin_read').classList.remove('disabled')
        })

        handleRespError(resp)
        window.open(`https://weread.qq.com/web/bookDetail/${resp.data}`)
    })
})


/**
 * 渲染书籍的元数据
 * @param book
 */
function renderBookMetaInfo(book) {
    let {title, author, cover, intro, format, isbn, publishTime, publisher, otherType} = book

    document.querySelector('.cover_img').src = cover
    document.querySelector('.bookInfo_right_header_title_text').textContent = title
    document.querySelector('.bookInfo_author').textContent = '作者：' + (author || '无')
    document.querySelector('.format').textContent = format || '无'
    if (format !== 'pdf') {
        // 显示 pdf 下载按钮
        document.querySelector('.download_pdf_btn').parentElement.hidden = true
    }
    if (Array.isArray(otherType)) {
        document.querySelector('.otherFormat').textContent = otherType.map(_ => _.type).join('/')
    } else {
        document.querySelector('.otherFormat').textContent = '无'
    }
    document.querySelector('.isbn').textContent = isbn || '无'
    document.querySelector('.publishTime').textContent = publishTime ? formatDateString(publishTime) : '无'
    document.querySelector('.publisher').textContent = publisher || '无'
    document.querySelector('.bookInfo_intro').textContent = '简介：' + (intro || '暂无')
}

/**
 * 渲染书籍的目录
 * @param toc
 */
function renderToc(toc) {
    let html = '<ol>'
    for (let i = 0; i < toc.length; i++) {
        const {title, children} = toc[i]
        html += `<li><a>${title}</a>`
        if (Array.isArray(children) && children.length > 0) {
            html += renderToc(children)
        }
        html += '</li>'
    }
    html += '</ol>'
    return html
}

/**
 * 渲染书籍详情页
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

    // 处理 anchors
    for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i]

        chapter.level = chapter.level || 1

        if (Array.isArray(chapter.anchors) && chapter.anchors.length > 0) {
            const anchors = chapter.anchors
            delete chapter['anchors']
            const anchorChapters = anchors.map((anchor) => ({
                ...chapter,
                title: anchor.title,
                level: anchor.level,
                anchor: anchor.anchor,
                isAnchor: true,
            }))

            // 把 anchor 插入到顶层位置
            chapters.splice(i+1, 0, ...anchorChapters)
        }
    }

    // 构造成树形结构
    bookToc = convertChaptersToToc(chapters)

    document.querySelector('#toc').innerHTML = renderToc(bookToc)
}


/**
 * 格式化日期
 * @param {string} date
 * @return {string}
 */
function formatDateString(date) {
    const year = date.slice(0, 4)
    const month = date.slice(5, 7).replace(/^0+/, '')
    return `${year}年${month}月`
}

/**
 * 打包书籍
 * @param {'html'|'epub'}format 打包格式
 * @param {{chapterIdx: number, chapterUid: number, title: string, html: string, style: string}[]} chapters
 * @param {number} receivedChapterCount
 * @param {string[]} commonStyles
 * @param {string[]} commonScripts
 */
function bundleBook(format, chapters, receivedChapterCount, commonStyles, commonScripts) {
    if (format === 'html') {
        document.querySelector('.download_btn').textContent = '正在打包'
    } else if (format === 'epub') {
        document.querySelector('.download_btn').textContent = '正在打包图片'
    }
    if (chapters.length === receivedChapterCount) {
        setTimeout(async () => {
            // 因为经过前面图片尺寸调整，顺序可能已经乱了，所以这里需要重新整理章节顺序
            const sortedChapters = chapters.sort((a, b) => a.chapterIdx - b.chapterIdx)

            let {title, author, cover, intro, isbn, publishTime, publisher} = bookDetail
            const book = new Book({
                cover: cover,
                isbn: isbn,
                author: author,
                description: intro,
                publisher: publisher,
                publishTime: publishTime,
                title: title,
                toc: bookToc,
                chapters: sortedChapters,
                styles: commonStyles,
                scripts: commonScripts,
            })

            console.debug(book)

            if (format === 'html') {
                await book.export2html()
            } else if (format === 'epub') {
                book.addEventListener('image', (evt) => {
                    const {chapterIdx, imageIdx} = evt.detail
                    // 更新进度提示
                    document.querySelector('.download_btn').textContent = `打包图片进度: (${chapterIdx}:${imageIdx})`
                })
                await book.export2epub()
            } else {
                alert('不支持的下载格式: ' + format)
            }

            document.querySelector('.download_btn').classList.remove('disabled')
            document.querySelector('.download_btn').textContent = '下载'
        }, 0)
    } else {
        // 等待所有的章节图片调整好尺寸
        setTimeout(bundleBook, 500)
    }
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
     * @type {{chapterIdx: number, chapterUid: number, title: string, html: string, style: string}[]}
     */
    const chapters = []
    /** @type {string[]} */
    const commonStyles = []
    /** @type {string[]} */
    const commonScripts = []

    let receivedChapterCount = 0
    let hasDownloaded = false

    document.querySelector('.download_btn').classList.add('disabled')

    const query = new URLSearchParams({secret, token}).toString()
    evtSource = new EventSource(new URL('/api/book/download?' + query, location.origin).toString())
    evtSource.addEventListener('close', () => {
        evtSource.close()
    })
    // 自定义样式与脚本
    evtSource.addEventListener('preface', (event) => {
        const {styles: styles, scripts: scripts} = JSON.parse(event.data)
        commonStyles.push(...styles)
        commonScripts.push(...scripts)
    }, false)

    // 单章下载完成
    evtSource.addEventListener('progress', (event) => {
        const {total, current, chapterUid, title, html, style} = JSON.parse(event.data)
        receivedChapterCount++
        adjustImgSizeInChapter(html).then(html => {
            chapters.push({
                chapterIdx: current,
                chapterUid: chapterUid,
                title: title,
                html: html,
                style: style,
            })
        }).catch(err => {
            alert(err.message)
        })
        document.querySelector('.download_btn').textContent = `章节进度: ${current}/${total}`
    }, false)

    // 整本书下载完成
    evtSource.addEventListener('complete', () => {
        bundleBook(format, chapters, receivedChapterCount, commonStyles, commonScripts)
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
            bundleBook(format, chapters, receivedChapterCount, commonStyles, commonScripts)
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
