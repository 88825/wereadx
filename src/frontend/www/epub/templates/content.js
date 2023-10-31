import { escapeXml } from "../utils.js";

export default function content(epub) {
  const author = "anonymous";
  const publisher = "anonymous";
  const { description, title, chapters, images } = epub;
  const modified = new Date().toISOString().split(".")[0] + "Z";

  return `<?xml version="1.0" encoding="utf-8"?>
<package version="3.0" unique-identifier="BookId" xmlns="http://www.idpf.org/2007/opf">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
    ${/* @TODO figure out the ID stuff */ ""}
    <dc:identifier id="BookId">${Date.now()}</dc:identifier>
    <dc:title>${escapeXml(title)}</dc:title>
    <dc:language>en</dc:language>
    ${
      description
        ? `    <dc:description>${escapeXml(description)}</dc:description>`
        : ""
    }
    <dc:creator id="creator">${author}</dc:creator>
    <dc:publisher>${publisher}</dc:publisher>
    <meta refines="#BookId" property="identifier-type" scheme="onix:codelist5">22</meta>
    <meta property="dcterms:identifier" id="meta-identifier">BookId</meta>
    <meta name="generator" content="weread.deno.dev" />    
    <meta property="dcterms:modified">${modified}</meta>
  </metadata>
  <manifest>
    <item id="toc" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav" />
    ${chapters.map(chapter => `    <item id="chapter-${chapter.id}" href="${chapter.id}.xhtml" media-type="application/xhtml+xml" />`).join('\n')}
    <item id="chapter-image-placeholder" href="images/img-placeholder.png" media-type="image/png" />
    ${chapters.flatMap(chapter => chapter.images).map(([id, mimeType]) => `    <item id="chapter-image-${id}" href="images/${id}" media-type="${mimeType}" />`).join('\n')}
  </manifest>
  <spine>
    <itemref idref="toc"/>
    ${chapters.map((chapter) => `    <itemref idref="chapter-${chapter.id}" />`).join("\n")}
  </spine>
  <guide>
    <reference title="Table of content" type="toc" href="toc.xhtml"/>
  </guide>
</package>
`;
}
