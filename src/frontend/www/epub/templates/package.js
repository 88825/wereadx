import {escapeXml} from "../utils.js";

/**
 * @param {import('../index.js').Epub} epub
 * @return {string}
 */
export default function getPackage(epub) {
    const {id, cover, coverMineType, title, description, lang, author, isbn, publisher, publishTime, chapters} = epub;
    // 微信读书的出版时间是一个字符串，没办法确定时区，比如 2000-01-01T00:00:00Z
    // 这里按照北京时间算
    let created
    if (publishTime) {
        created = new Date(publishTime).toISOString().split(".")[0] + "Z";
    }
    const modified = new Date().toISOString().split(".")[0] + "Z";

    return `<?xml version="1.0" encoding="utf-8"?>
<package version="3.0" dir="auto" unique-identifier="BookId" xmlns="http://www.idpf.org/2007/opf">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    <dc:identifier id="BookId">urn:uuid:${id}</dc:identifier>
    ${isbn ? '<dc:identifier id="isbn">' + isbn +'</dc:identifier>' : '<!-- isbn -->'}
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:language>${escapeXml(lang)}</dc:language>
    <dc:creator id="creator">${escapeXml(author)}</dc:creator>
    ${created ? '<dc:date>' + created + '</dc:date>' : '<!-- created -->'}
    <dc:description>${escapeXml(description)}</dc:description>
    <dc:publisher>${escapeXml(publisher)}</dc:publisher>
    <meta refines="#creator" property="role" scheme="marc:relators" id="role">aut</meta>
    <meta refines="#BookId" property="identifier-type" scheme="onix:codelist5">22</meta>
    ${isbn ? '<meta refines="#isbn" property="identifier-type" scheme="onix:codelist5">15</meta>' : '<!-- isbn -->'}
    <meta property="dcterms:modified">${modified}</meta>
    <meta property="dcterms:identifier" id="meta-identifier">BookId</meta>
    <meta name="generator" content="weread.deno.dev" />
  </metadata>
  <manifest>
    ${cover && coverMineType ? '<item id="cover-image" href="' + cover + '" media-type="' + coverMineType + '" properties="cover-image" />' : ''}
    <item id="toc" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav" />
${chapters.map(chapter => `    <item id="chapter-${chapter.id}" href="${chapter.id}.xhtml" media-type="application/xhtml+xml" properties="scripted" />`).join('\n')}
    <item id="chapter-image-placeholder" href="images/img-placeholder.png" media-type="image/png" />
${chapters.flatMap(chapter => chapter.images).map(([id, mimeType]) => `    <item id="chapter-image-${id}" href="images/${id}" media-type="${mimeType}" fallback="chapter-image-placeholder" />`).join('\n')}
    <item id="common-style" href="styles/common.css" media-type="text/css" />
    <item id="common-script" href="scripts/common.js" media-type="application/javascript" properties="scripted" />
  </manifest>
  <spine>
    ${cover && coverMineType ? '<itemref idref="cover-image"/>' : '<!-- cover-image -->'}
    <itemref idref="toc"/>
${chapters.map((chapter) => `    <itemref idref="chapter-${chapter.id}" />`).join("\n")}
  </spine>
</package>
`;
}
