import {escapeXml} from "../utils.js";

export default function getToc(epub) {
    const {chapters} = epub;

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
      <ol>
        <li><a href="toc.xhtml">目录</a></li>
${chapters.map(chapter => `        <li id="chapter-${chapter.id}"><a epub:type="bodymatter" href="${chapter.id}.xhtml">${escapeXml(chapter.title)}</a></li>`).join('\n')}
      </ol>
    </nav>
  </body>
</html>
`;
}
