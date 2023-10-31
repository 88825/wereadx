/**
 * @typedef Book
 * @property {string} id
 * @property {string} cover 封面
 * @property {string} title 书名
 * @property {string} description 简介
 * @property {string} lang 语言
 * @property {string} author 作者
 * @property {string} isbn ISBN
 * @property {string} publisher 出版公司
 * @property {string} publishTime 出版时间
 * @property {{title: string, content_html: string}[]} chapters
 * @property {string[]} styles
 * @property {string[]} scripts
 */

/**
 * 需要打包的 epub 数据结构
 * @typedef Epub
 * @property {string} id
 * @property {string} cover 封面
 * @property {string} coverMineType
 * @property {string} title 书名
 * @property {string} description 简介
 * @property {string} lang 语言
 * @property {string} author 作者
 * @property {string} isbn ISBN
 * @property {string} publisher 出版公司
 * @property {string} publishTime 出版时间
 * @property {Object} chapters 章节数据
 * @property {string} chapters.id 章节id
 * @property {string} chapters.title 章节标题
 * @property {string} chapters.content 章节内容
 * @property {Array} chapters.images [["1830-1923.png", "image/png", blob], [...]]
 */

import getPackage from "./templates/package.js";
import getChapter from "./templates/chapter.js";
import getContainer from "./templates/container.js";
import getToc from "./templates/toc.js";
import {getImgExt, getUid, slugify, CORS_PROXY} from "./utils.js";

/**
 * @param {Book} book
 * @returns {Promise} - downloads a file in the browser
 */
export default async function exportToEpub(book) {
    /**
     * @type {Epub}
     */
    let epub = {
        id: book.id,
        cover: book.cover || "",
        coverMineType: "",
        title: book.title || "[Untitled]",
        description: book.description || "",
        lang: book.lang || "zh",
        author: book.author || "anonymous",
        isbn: book.isbn || "",
        publisher: book.publisher || "anonymous",
        publishTime: book.publishTime || "",
        chapters: await Promise.all(
            book.chapters.map(async (chapter, index) => {
                const $html = new DOMParser().parseFromString(
                    chapter.content_html,
                    "text/html"
                );

                const images = await Promise.all(
                    Array.from($html.querySelectorAll("img")).map(async ($img) => {
                        const src = $img.getAttribute("src");

                        if ($img.hasAttribute("srcset")) {
                            $img.removeAttribute("srcset");
                        }

                        // 下载图片并替换图片地址为本地地址
                        // todo: 检测重复图片的下载
                        try {
                            const imgBlob = await fetch(CORS_PROXY + src).then(resp => resp.blob())

                            const uid = getUid();
                            const ext = getImgExt({mimeType: imgBlob.type, fileUrl: src});
                            const id = `${uid}.${ext}`;

                            $img.setAttribute("src", `images/${id}`);
                            return [id, imgBlob.type, imgBlob];
                        } catch (e) {
                            console.error(e);
                            console.warn("Failed to fetch (will use placeholder):", src);
                            $img.setAttribute("src", "images/img-placeholder.png");
                            return null;
                        }
                    })
                ).then((imgs) => imgs.filter((img) => img));

                return {
                    id: String(index).padStart(3, "0"),
                    title: chapter.title || "[Untitled]",
                    content: new XMLSerializer().serializeToString($html.querySelector("body > section")),
                    images,
                };
            })
        ),
    };


    // Log some info about the images that got fetched from the network
    console.log(
        "Fetched %s images total.",
        epub.chapters
            .map((chapter) => chapter.images.length)
            .reduce((a, b) => a + b, 0)
    );

    // Generate the ZIP file
    let zip = new JSZip();
    zip.file("mimetype", "application/epub+zip");
    zip.file("META-INF/container.xml", getContainer());

    // 下载封面图
    if (book.cover) {
        console.log('下载封面图: ', book.cover)
        const coverImgBlob = await fetch(CORS_PROXY + book.cover).then(resp => resp.blob())
        const ext = getImgExt({mimeType: coverImgBlob.type, fileUrl: book.cover})
        epub.cover = `images/book-cover-image.${ext}`
        epub.coverMineType = coverImgBlob.type
        zip.file("OEBPS/" + epub.cover, coverImgBlob)
    }
    // 下载缺失图片占位符
    const placeholderImg = await fetch("/epub/img-placeholder.png").then(resp => resp.blob())
    zip.file("OEBPS/images/img-placeholder.png", placeholderImg);

    console.log(epub)

    zip.file("OEBPS/package.opf", getPackage(epub));
    zip.file("OEBPS/toc.xhtml", getToc(epub));
    zip.file("OEBPS/styles/common.css", book.styles.join('\n'))
    zip.file("OEBPS/scripts/common.js", book.scripts.join('\n'))
    epub.chapters.forEach((chapter) => {
        zip.file(`OEBPS/${chapter.id}.xhtml`, getChapter(chapter));

        chapter.images.forEach(([id, type, blob]) => {
            zip.file(`OEBPS/images/${id}`, blob);
        });
    });

    return zip
        .generateAsync({type: "blob", mimeType: "application/epub+zip"})
        .then((content) => {
            saveAs(content, `${slugify(epub.title)}.epub`);
        });
}
