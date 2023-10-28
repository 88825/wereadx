/**
 * 8.js中的 UPDATE_READER_CONTENT_HTML 和 UPDATE_READER_CONTENT_STYLES 这两个 mutation
 */

/**
 * 处理样式
 * @param styles
 * @param bookId
 */
export function processStyles(styles: string, bookId: string) {
  return function (styles, bookId) {
    if (!styles || styles.length <= 0) {
      return "";
    }
    // 去掉 /* */ 注释
    styles = styles.trim().replace(/\/\*.*?\*\//gi, "");

    const matchArray = styles.match(/[^{}]*?{[\s\S]+?}/gi);
    if (!matchArray || 0 === matchArray.length) {
      return "";
    }

    return matchArray.map((_0x4fc4e3) => {
      return ".readerChapterContent " +
        (_0x4fc4e3 = _0x4fc4e3.trim()).split("\n").map(function (_0xde9e6d) {
          return -1 === (_0xde9e6d = _0xde9e6d.trim()).indexOf("{") &&
              -1 === _0xde9e6d.indexOf("}") && -1 === _0xde9e6d.indexOf(";")
            ? _0xde9e6d + ";"
            : _0xde9e6d;
        }).join("");
    }).join("").trim().replace(
      /\.\.\/images\/(.*?\.(png|jpg|jpeg|gif))/gi,
      "https://res.weread.qq.com/wrepub/web/" + bookId + "/$1",
    );
  }(styles || "", bookId);
}

/**
 * 处理html
 * @param sections
 * @param bookId
 */
export function processHtmls(sections: string[], bookId: string) {
  return sections.map((html) => {
    return function (html, bookId) {
      if (!html || html.length <= 0) {
        return "";
      }
      const re1 =
        /<img[^>]+?data-wr-co="([^"]+?)"[^>]+?alt="([^"]+?)"[^>]+?qqreader-footnote[^>]+?>/gi;
      html = html.replace(
        re1,
        '<span class="reader_footer_note js_readerFooterNote" data-wr-co="$1" data-wr-footernote="$2"></span>',
      );

      const re2 =
        /<img[^>]+?data-wr-co="([^"]+?)"[^>]+?qqreader-footnote[^>]+?alt="([^"]+?)"[^>]*?>/gi;
      html = html.replace(
        re2,
        '<span class="reader_footer_note js_readerFooterNote" data-wr-co="$1" data-wr-footernote="$2"></span>',
      );
      html = html.replace(
        /\.\.\/video\/(.*?\.(mp4|wmv|3gp|rm|rmvb|mov|m4v|avi))/gi,
        "https://res.weread.qq.com/wrepub/web/" + bookId + "/$1",
      );
      html = html.replace(
        /\.\.\/images\/(.*?\.(png|jpg|jpeg|gif))/gi,
        "https://res.weread.qq.com/wrepub/web/" + bookId + "/$1",
      );
      html = html.trim();

      return html;
    }(html || "", bookId);
  });
}
