import {escapeXml} from "../utils.js";

/**
 * @param {{chapterIdx: number, chapterUid: number, title: string, level: number, anchor: string, children: {}[]}[]} toc
 * @return {string}
 */
function renderToc(toc) {
    let html = '<ol>\n'
    for (let i = 0; i < toc.length; i++) {
        const {title, chapterIdx, anchor, children} = toc[i]
        const idx = String(chapterIdx).padStart(3, "0")
        if (anchor) {
            html += `<li id="chapter-${idx}-${anchor}"><a epub:type="bodymatter" href="${idx}.xhtml#${anchor}">${escapeXml(title)}</a>`
        } else {
            html += `<li id="chapter-${idx}"><a epub:type="bodymatter" href="${idx}.xhtml">${escapeXml(title)}</a>`
        }
        if (Array.isArray(children) && children.length > 0) {
            html += renderToc(children)
        }
        html += '</li>'
    }
    html += '</ol>'
    return html
}

export default function getToc(epub) {
    const {toc} = epub;
    const tocHtml = renderToc(toc)

    return `<?xml version='1.0' encoding='utf-8'?>
<!DOCTYPE html>
<html xmlns:epub="http://www.idpf.org/2007/ops" xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <title>目录</title>
    <meta charset="UTF-8" />
  </head>
  <body>
    <h1>目录</h1>
    <nav id="toc" epub:type="toc">
      ${tocHtml}
    </nav>
  </body>
</html>
`;
}
