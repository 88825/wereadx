import {uuid, zipFile} from "../js/utils.js";
import getPackage from "./templates/package.js";
import getChapter from "./templates/chapter.js";
import getContainer from "./templates/container.js";
import getToc from "./templates/toc.js";
import {getImgExt, getUid, slugify, CORS_PROXY} from "./utils.js";

/**
 * @typedef Book
 * @property {string} id
 * @property {string} cover 封面
 * @property {string} coverMineType
 * @property {string} title 书名
 * @property {string} author 作者
 * @property {string} description 简介
 * @property {string} lang 语言
 * @property {string} isbn ISBN
 * @property {string} publisher 出版公司
 * @property {string} publishTime 出版时间
 * @property {{chapterIdx: number, chapterUid: number, title: string, level: number, anchor: string, children: {}[]}[]} toc 目录
 * @property {{chapterIdx: number, chapterUid: number, title: string, html: string, style: string}[]} chapters 章节数据
 * @property {string[]} styles
 * @property {string[]} scripts
 */

export class Book extends EventTarget {
    constructor(options) {
        super()

        this.id = uuid()
        this.cover = options.cover || ''
        this.coverMineType = ''
        this.isbn = options.isbn || ''
        this.author = options.author?.replace(/\s+著$/i, '') || 'anonymous'
        this.description = options.description || ''
        this.publisher = options.publisher || 'anonymous'
        this.publishTime = options.publishTime || ''
        this.title = options.title || '[Untitled]'
        this.lang = options.lang || "zh"
        this.toc = options.toc || []
        this.chapters = options.chapters || []
        this.styles = options.styles || []
        this.scripts = options.scripts || []
    }

    /**
     * 解析并下载章节中的图片
     * @return {Promise<void>}
     */
    async resolveHtmlImages() {
        const chapters = []
        // 解析图片
        let imageCount = 0
        let errorCount = 0
        for (const chapter of this.chapters) {
            const $htmlDom = new DOMParser().parseFromString(
                chapter.html,
                "text/html"
            );

            const chapterImages = []
            const imgEls = Array.from($htmlDom.querySelectorAll("img"))
            for (const imgEl of imgEls) {
                const src = imgEl.getAttribute("src");

                if (imgEl.hasAttribute("srcset")) {
                    imgEl.removeAttribute("srcset");
                }

                // 下载图片并替换图片地址为本地地址
                // todo: 检测重复图片的下载
                try {
                    const imgBlob = await fetch(CORS_PROXY + encodeURIComponent(src)).then(resp => resp.blob())
                    imageCount++

                    const uid = getUid();
                    const ext = getImgExt({mimeType: imgBlob.type, fileUrl: src});
                    const id = `${uid}.${ext}`;

                    imgEl.setAttribute("src", `images/${id}`);
                    chapterImages.push({
                        id: id,
                        type: imgBlob.type,
                        blob: imgBlob,
                    })
                } catch (e) {
                    // todo: 失败时重试 3 次
                    errorCount++
                    console.error(e);
                    console.warn("Failed to fetch (will use placeholder):", src);
                    imgEl.setAttribute("src", "images/img-placeholder.png");
                }

                this.dispatchEvent(
                    new CustomEvent('image', {
                        detail: {
                            success: imageCount,
                            error: errorCount,
                        }
                    })
                )
            }

            chapters.push({
                chapterIdx: String(chapter.chapterIdx).padStart(3, "0"),
                chapterUid: String(chapter.chapterUid).padStart(3, "0"),
                title: chapter.title || "[Untitled]",
                html: new XMLSerializer().serializeToString($htmlDom.querySelector("body > section")),
                style: chapter.style,
                images: chapterImages,
            })
        }

        this.chapters = chapters
    }

    /**
     * 导出 html
     * @return {Promise<void>}
     */
    async export2html() {
        const style = this.styles.map(style => `<style>${style}</style>`).join('\n')
        const script = this.scripts.map(script => `<script>${script}\x3c/script>`).join('\n')
        const contentHtml = this.chapters.map(chapter => `<!-- ${chapter.title} -->\n<style>${chapter.style}</style>\n${chapter.html}`).join('\n')

        let html = `<!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, user-scalable=no, initial-scale=1">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>${this.title}</title>
    ${style}
</head>
<body>
<!-- todo: toc -->
${contentHtml}
${script}
</body>
</html>
`
        await zipFile(this.title + '.html', html)
    }

    /**
     * 导出 epub
     * @return {Promise<*>}
     */
    async export2epub() {
        await this.resolveHtmlImages()

        console.debug('图片解析之后:')
        console.debug(this)

        console.log(
            "Fetched %s images total.",
            this.chapters
                .map((chapter) => chapter.images.length)
                .reduce((a, b) => a + b, 0)
        );

        let zip = new JSZip();
        zip.file("mimetype", "application/epub+zip");
        zip.file("META-INF/container.xml", getContainer());

        // 下载封面图
        if (this.cover) {
            console.debug('下载封面图: ', this.cover)
            const coverImgBlob = await fetch(CORS_PROXY + encodeURIComponent(this.cover)).then(resp => resp.blob())
            const ext = getImgExt({mimeType: coverImgBlob.type, fileUrl: this.cover})
            this.cover = `images/book-cover-image.${ext}`
            this.coverMineType = coverImgBlob.type
            zip.file("OEBPS/" + this.cover, coverImgBlob)
        }
        // 下载缺失图片占位符
        const placeholderImgBlob = await fetch("/epub/img-placeholder.png", {cache: "no-cache"}).then(resp => resp.blob())
        zip.file("OEBPS/images/img-placeholder.png", placeholderImgBlob);

        zip.file("OEBPS/package.opf", getPackage(this));
        zip.file("OEBPS/toc.xhtml", getToc(this));
        zip.file("OEBPS/styles/common.css", this.styles.join('\n'))
        zip.file("OEBPS/scripts/common.js", this.scripts.join('\n'))
        this.chapters.forEach((chapter) => {
            zip.file(`OEBPS/${chapter.chapterIdx}.xhtml`, getChapter(chapter));

            chapter.images.forEach(({id, blob}) => {
                zip.file(`OEBPS/images/${id}`, blob);
            });
        });

        return zip
            .generateAsync({type: "blob", mimeType: "application/epub+zip"})
            .then((content) => {
                saveAs(content, `${slugify(this.title)}.epub`);
            });
    }
}
