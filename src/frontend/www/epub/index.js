/**
 * @typedef Book
 * @property {string} title
 * @property {string} description
 * @property {{title: string, content_html: string}[]} chapters
 * @property {string[]} styles
 * @property {string[]} scripts
 */

/**
 * 需要打包的 epub 数据结构
 * @typedef Epub
 * @property {string} title
 * @property {string} description
 * @property {Object} chapters
 * @property {string} chapters.id
 * @property {string} chapters.title
 * @property {string} chapters.content
 * @property {Array} chapters.images [["1830-1923.png", "image/png", blob], [...]]
 */

import getContent from "./templates/content.js";
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
        title: book.title || "[Untitled]",
        description: book.description || "",
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

                        // Try to fetch the image. If it fails to fetch, don't let that stop
                        // us from generating the book. Just use the image not found
                        // that we have locally.
                        try {
                            let res = await fetch(CORS_PROXY + src);
                            const imgBlob = await res.blob();

                            console.log("Fetched", src);

                            const uid = getUid();
                            const ext = getImgExt({mimeType: imgBlob.type, fileUrl: src});
                            const id = `${uid}.${ext}`;

                            $img.setAttribute("src", `images/${id}`);
                            return [id, imgBlob.type, imgBlob];
                        } catch (e) {
                            console.error(e);
                            // If you can't find the image, get a placeholder
                            console.log("Failed to fetch (will use placeholder):", src);
                            $img.setAttribute("src", "images/img-placeholder.png");
                            return null;
                        }
                    })
                ).then((imgs) => imgs.filter((img) => img)); // don't keep anything returned as null

                return {
                    // id for the file name, i.e., 001
                    id: String(index).padStart(3, "0"),
                    title: chapter.title || "[Untitled]",
                    // Turn HTML into xhtml
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
    zip.file("OEBPS/content.opf", getContent(epub));
    zip.file("OEBPS/toc.xhtml", getToc(epub));
    zip.file("OEBPS/styles/common.css", book.styles.join('\n'))
    zip.file("OEBPS/scripts/common.js", book.scripts.join('\n'))
    epub.chapters.forEach((chapter) => {
        zip.file(`OEBPS/${chapter.id}.xhtml`, getChapter(chapter));

        chapter.images.forEach(([id, type, blob]) => {
            zip.file(`OEBPS/images/${id}`, blob);
        });
    });

    // 下载缺失图片占位符
    const placeholderImg = await fetch("/epub/img-placeholder.png").then(
        (res) => res.blob()
    );
    zip.file("OEBPS/images/img-placeholder.png", placeholderImg);


    return zip
        .generateAsync({type: "blob", mimeType: "application/epub+zip"})
        .then((content) => {
            saveAs(content, `${slugify(epub.title)}.epub`);
        });
}
