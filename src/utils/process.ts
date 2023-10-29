// @ts-nocheck: 使用 for of 遍历 node.attributes 会报错，实际上并没有问题

import { parseHTML  } from "https://esm.sh/linkedom";

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

/**
 * 判断是否为相同的 span 节点
 * @param node1
 * @param node2
 */
function hasSameAttributes(node1: Element, node2: Element) {
  if (node1.attributes.length !== node2.attributes.length) {
    return false
  }

  for (const attr of node2.attributes) {
    if (attr.name === 'data-wr-co') {
      continue
    }
    const node1Attr = node1.attributes.getNamedItem(attr.name)
    if (!node1Attr || node1Attr.value !== attr.value) {
      return false
    }
  }

  return true
}

/**
 * 合并相邻的 span 节点
 * @param html
 */
export function mergeSpanInHtml(html: string): string {
  const {document} = parseHTML(html)

  const spanElements = Array.from(document.querySelectorAll('span'))
  while (spanElements.length > 0) {
    const current = spanElements.shift()
    let next
    while ((next = current!.nextSibling)) {
      if (next.nodeType === 1) {
        // 确认是否与前一个span样式相同
        if (hasSameAttributes(current!, next as Element)) {
          // 合并span内容
          current!.innerHTML += (next as Element).innerHTML
          next.remove()
          spanElements.shift()
        } else {
          // attributes 不相同，不合并
          break
        }
      } else if (next.nodeType === 3) {
        if ((next as Text).wholeText.replace(/\s/g, '')) {
          // span后面有文本内容，不合并
          break
        } else {
          next.remove()
        }
      }
    }
  }

  return document.toString()
}
