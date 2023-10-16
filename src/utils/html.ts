/// <reference lib="dom" />

import {xss, parse5} from "../deps.ts"
import m1039 from "./style.ts";

interface TagInfo {
    tag: string;
    srcHtml: string;
    src?: string;
    isClosing: boolean;
    pos: number;
    srcPos: number;
}

interface BodyContentLengthAndIndex {
    contentLength: number;
    indexInFullHtml: number;
}

interface ParsedBodyHtmlResult {
    allContentMerged: string;
    contentLengthAndIndex: BodyContentLengthAndIndex[];
}

let filterXSSInstance: xss.FilterXSS | undefined = undefined;
const tagInfos: TagInfo[] = [];
let _0x470115: BodyContentLengthAndIndex[] = [];
let charTotal = 0;

function newFilterXSSInstance() {
    const baseAttrs = ["class", "id"];
    const options = {
        "whiteList": {
            "body": baseAttrs.concat(["class", "style"]),
            "a": baseAttrs.concat(["target", "href", "title"]),
            "abbr": baseAttrs.concat(["title"]),
            "address": baseAttrs,
            "area": baseAttrs.concat(["shape", "coords", "href", "alt"]),
            "article": baseAttrs,
            "aside": baseAttrs,
            "audio": baseAttrs.concat([
                "autoplay",
                "controls",
                "loop",
                "preload",
                "src",
            ]),
            "b": baseAttrs,
            "bdi": baseAttrs.concat(["dir"]),
            "bdo": baseAttrs.concat(["dir"]),
            "big": baseAttrs,
            "blockquote": baseAttrs.concat(["cite"]),
            "br": baseAttrs,
            "caption": baseAttrs,
            "center": baseAttrs,
            "cite": baseAttrs,
            "code": baseAttrs,
            "col": baseAttrs.concat(["align", "valign", "span", "width"]),
            "colgroup": baseAttrs.concat(["align", "valign", "span", "width"]),
            "dd": baseAttrs,
            "del": baseAttrs.concat(["datetime"]),
            "details": baseAttrs.concat(["open"]),
            "div": baseAttrs,
            "dl": baseAttrs,
            "dt": baseAttrs,
            "em": baseAttrs,
            "font": baseAttrs.concat(["color", "size", "face"]),
            "footer": baseAttrs,
            "h1": baseAttrs,
            "h2": baseAttrs,
            "h3": baseAttrs,
            "h4": baseAttrs,
            "h5": baseAttrs,
            "h6": baseAttrs,
            "header": baseAttrs,
            "hr": baseAttrs,
            "i": baseAttrs,
            "img": baseAttrs.concat([
                "src",
                "alt",
                "title",
                "width",
                "height",
                "data-w",
                "data-ratio",
                "data-w-new",
            ]),
            "ins": baseAttrs.concat(["datetime"]),
            "li": baseAttrs,
            "mark": baseAttrs,
            "nav": baseAttrs,
            "ol": baseAttrs,
            "p": baseAttrs,
            "pre": baseAttrs,
            "s": baseAttrs,
            "section": baseAttrs,
            "small": baseAttrs,
            "span": baseAttrs,
            "sub": baseAttrs,
            "sup": baseAttrs,
            "strong": baseAttrs,
            "table": baseAttrs.concat(["width", "border", "align", "valign"]),
            "tbody": baseAttrs.concat(["align", "valign"]),
            "td": baseAttrs.concat([
                "width",
                "rowspan",
                "colspan",
                "align",
                "valign",
            ]),
            "tfoot": baseAttrs.concat(["align", "valign"]),
            "th": baseAttrs.concat([
                "width",
                "rowspan",
                "colspan",
                "align",
                "valign",
            ]),
            "thead": baseAttrs.concat(["align", "valign"]),
            "tr": baseAttrs.concat(["rowspan", "align", "valign"]),
            "tt": baseAttrs,
            "u": baseAttrs,
            "ul": baseAttrs,
            "video": baseAttrs.concat([
                "autoplay",
                "controls",
                "loop",
                "preload",
                "src",
                "height",
                "width",
            ]),
        },
        "onTag": function (
            tag: string,
            html: string,
            options: Record<string, any>,
        ) {
            if (options.isWhite) {
                tagInfos.push({
                    "tag": tag,
                    "srcHtml": html,
                    "isClosing": options.isClosing,
                    "pos": options.position,
                    "srcPos": options.sourcePosition,
                });
            }
        },
        "onIgnoreTag": function (
            _tag: string,
            _html: string,
            _options: Record<string, any>,
        ) {
            return "";
        },
        "onIgnoreTagAttr": function (_tag: string, name: string, value: string) {
            if ("style" === name) {
                return 'style="' + value + '"';
            }
        },
        "safeAttrValue": function (
            tag: string,
            name: string,
            value: string,
            _0x1ca484: any,
        ) {
            const safeAttrValue = xss.safeAttrValue(tag, name, value, _0x1ca484);

            if (
                "video" === tag && "src" === name && "" === safeAttrValue &&
                0 === value.indexOf("../")
            ) {
                return value;
            } else if ("img" === tag && "src" === name) {
                if (tagInfos.length && "img" === tagInfos[tagInfos.length - 1].tag) {
                    tagInfos[tagInfos.length - 1].src = value;
                }
                return value;
            } else {
                return safeAttrValue;
            }
        },
    };
    return new xss.FilterXSS(options);
}

function _0x4e3ea2(tagInfo: TagInfo) {
    let _0x49a03d = tagInfo.srcPos,
        _0x530bce = 0;
    for (let i = 0; i < _0x470115.length; i++) {
        const _0x25038b = _0x470115[i];
        if (
            tagInfo.srcPos >= _0x530bce &&
            tagInfo.srcPos < _0x530bce + _0x25038b.contentLength
        ) {
            _0x49a03d += _0x25038b.indexInFullHtml - _0x530bce;
            break;
        }
        _0x530bce += _0x25038b.contentLength;
    }
    return _0x49a03d;
}

function _0x476ae0(safeHtml: string, tagInfos: TagInfo[], sectionStep: number) {
    if (!safeHtml || 0 === safeHtml.length) {
        return [];
    }

    const result = [""];
    const _0xee0a6b: TagInfo[] = [];

    let _0x56f74b = 0,
        _0x1f3df2 = 0,
        _0x400a12 = 0;

    const _0x16ef8e = function () {
        const tagInfo = tagInfos[_0x400a12];
        if (tagInfo.isClosing) {
            // 闭合标签
            _0xee0a6b.length && _0xee0a6b[_0xee0a6b.length - 1].tag === tagInfo.tag
                ? _0xee0a6b.pop()
                : console.log(
                    "Close tag no opened match:" + JSON.stringify(_0xee0a6b) +
                    JSON.stringify(tagInfo.tag),
                );
            _0x1f3df2 = safeHtml.indexOf(">", tagInfo.pos) + 1;
            result[result.length - 1] += safeHtml.slice(_0x56f74b, _0x1f3df2);
            _0x56f74b = _0x1f3df2;

            const _0x1e0e64 = _0x400a12 + 1 < tagInfos.length
                ? tagInfos[_0x400a12 + 1]
                : undefined;
            if (_0x1e0e64) {
                const _0x374624 = _0x1e0e64.pos,
                    _0x5980fd = _0x4e3ea2(tagInfo) + tagInfo.srcHtml.length;

                result[result.length - 1] += parseParagraph(
                    safeHtml,
                    _0x56f74b,
                    _0x374624,
                    _0x5980fd,
                );
                _0x56f74b = _0x374624;
                if (!result[Math.floor(charTotal / sectionStep)]) {
                    let _0x30c112 = "";
                    if (_0xee0a6b.length) {
                        _0xee0a6b.forEach((_0x10d1d8) => {
                            _0x30c112 += _0x10d1d8.srcHtml;
                        });
                        const _0x5b0ef3 = ([] as TagInfo[]).concat(_0xee0a6b);
                        _0x5b0ef3.reverse();
                        for (let i = 0; i < _0x5b0ef3.length; i++) {
                            const _0x7f55d8 = _0x5b0ef3[i];
                            result[result.length - 1] += "</" + _0x7f55d8.tag + ">";
                        }
                    }
                    result.push(_0x30c112);
                }
            }
            _0x400a12++;
        } else {
            if (
                "img" !== tagInfo.tag && "br" !== tagInfo.tag && "hr" !== tagInfo.tag &&
                "pre" !== tagInfo.tag && "video" !== tagInfo.tag
            ) {
                _0xee0a6b.push(tagInfo);
            }
            _0x1f3df2 = tagInfo.pos + 1 + tagInfo.tag.length;
            result[result.length - 1] += safeHtml.slice(_0x56f74b, _0x1f3df2);
            const _0x44d767 = _0x4e3ea2(tagInfo);
            result[result.length - 1] += ' data-wr-co="' + _0x44d767 + '"';
            _0x56f74b = _0x1f3df2;
            const _0x2fce5f = safeHtml.indexOf(">", tagInfo.pos) + 1;
            let _0x39bed3 = safeHtml.slice(_0x56f74b, _0x2fce5f);

            if (
                "img" === tagInfo.tag && tagInfo.src && -1 !== _0x39bed3.indexOf("src=")
            ) {
                const url =
                    'src="data:image/gif;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==" data-src="';
                _0x39bed3 = _0x39bed3.replace(
                    'src="' + tagInfo.src + '"',
                    url + tagInfo.src + '"',
                );
            }
            if ("img" === tagInfo.tag && -1 !== _0x39bed3.indexOf("data-w=")) {
                try {
                    const _0x4ae1fd = _0x39bed3.match(/style="([^"]*)"/),
                        _0x19dd28 = _0x4ae1fd && _0x4ae1fd[1] ? _0x4ae1fd[1] : "",
                        _0x3f4cbd = _0x39bed3.match(/data-w="([^"]*)"/),
                        _0x673fcb = _0x39bed3.match(/data-w-new="([^"]*)"/),
                        _0x39a2c5 = _0x3f4cbd && _0x3f4cbd[1] ? _0x3f4cbd[1] : "",
                        _0x388c79 = _0x673fcb && _0x673fcb[1] ? _0x673fcb[1] : "",
                        _0x2584a3 = (_0x39a2c5 ? "max-width:" + _0x39a2c5 + ";" : "") +
                            (_0x388c79 ? "max-height:" + _0x388c79 + ";" : "") + _0x19dd28;
                    _0x39bed3 = _0x4ae1fd
                        ? _0x39bed3.replace(_0x19dd28, _0x2584a3)
                        : _0x39bed3.replace(">", ' style="' + _0x2584a3 + '">');
                } catch (err) {
                    console.error(err);
                }
            }
            result[result.length - 1] += _0x39bed3;
            _0x56f74b = _0x2fce5f;
            if ("pre" === tagInfo.tag) {
                const _0x543159 = function (_0x29bbb9, _0x43d76d, _0x500708) {
                    if (_0x500708 >= _0x29bbb9.length) {
                        return -1;
                    }
                    for (let i = _0x500708; i < _0x29bbb9.length; i++) {
                        if (_0x43d76d(_0x29bbb9[i])) {
                            return i;
                        }
                    }
                    return -1;
                }(
                    tagInfos,
                    (_: TagInfo) => _.tag === tagInfo.tag && _.isClosing,
                    _0x400a12,
                );

                if (-1 !== _0x543159) {
                    const _0xe6313 = tagInfos[_0x543159];
                    result[result.length - 1] += safeHtml.slice(_0x56f74b, _0xe6313.pos);
                    _0x56f74b = _0xe6313.pos;
                    _0x400a12 = _0x543159 + 1;
                } else {
                    _0x400a12++;
                }
            } else {
                const _0x5634c1 = _0x400a12 + 1 < tagInfos.length
                    ? tagInfos[_0x400a12 + 1]
                    : undefined;
                if (_0x5634c1) {
                    const _0x39627f = _0x5634c1.pos,
                        _0x1ea28c = _0x44d767 + tagInfo.srcHtml.length;
                    result[result.length - 1] += parseParagraph(
                        safeHtml,
                        _0x56f74b,
                        _0x39627f,
                        _0x1ea28c,
                    );
                    _0x56f74b = _0x39627f;
                }
                _0x400a12++;
            }
        }
    };
    for (; _0x400a12 < tagInfos.length;) {
        _0x16ef8e();
    }

    if (_0x56f74b < safeHtml.length) {
        result[result.length - 1] += safeHtml.slice(_0x56f74b);
    }
    return result;
}

function _0x5007bc(html: string, style: string) {
    let _0x3e3d05 = "";
    let _0x4e4ca0 = 0;

    const re1 = /<body[^>]*>/g;
    const re2 = /class="([^"]+)">/;
    let searchResult = re1.exec(html);
    for (; searchResult;) {
        if (1 === searchResult.length) {
            const _0x5aae48 = searchResult[0],
                _0x224f62 = searchResult.index,
                _0x3f028b = _0x224f62 + _0x5aae48.length;
            let _0x3cdab5 = -1 !== _0x5aae48.indexOf("background-image");
            if (!_0x3cdab5) {
                const _0x5806e7 = re2.exec(_0x5aae48);
                if (_0x5806e7 && 2 === _0x5806e7.length) {
                    const _0x1db8e7 = _0x5806e7[1].split(" ");
                    for (let i = 0, _0x2d4038 = _0x1db8e7.length; i < _0x2d4038; i++) {
                        const _0x497e33 = _0x1db8e7[i],
                            _0x132da1 = style.indexOf(_0x497e33);
                        if (-1 !== _0x132da1) {
                            const _0x482bf8 = style.indexOf("{", _0x132da1);
                            if (-1 !== _0x482bf8) {
                                const _0x365cce = style.indexOf("}", _0x482bf8);
                                if (-1 !== _0x365cce) {
                                    if (
                                        -1 !==
                                        style.slice(_0x482bf8, _0x365cce).indexOf(
                                            "background-image",
                                        )
                                    ) {
                                        _0x3cdab5 = true;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            _0x3e3d05 += html.slice(_0x4e4ca0, _0x224f62);
            _0x3e3d05 += _0x3cdab5
                ? _0x5aae48.replace("<body", '<div data-wr-bd="1" data-wr-inset="1"')
                : _0x5aae48.replace("<body", '<div data-wr-bd="1"');
            _0x4e4ca0 = _0x3f028b;
        }

        searchResult = re1.exec(html);
    }
    if (_0x4e4ca0 < html.length) {
        _0x3e3d05 += html.slice(_0x4e4ca0);
    }
    _0x3e3d05 = _0x3e3d05.replace(/<\/body>/g, "</div>");
    return _0x3e3d05;
}

function parseBodyHtml(html: string) {
    const result: ParsedBodyHtmlResult = {
        "allContentMerged": "",
        "contentLengthAndIndex": [],
    };
    if (!html || 0 === html.length) {
        return result;
    }

    const re = /<body[^>]*>\s*([\s\S]*?)\s*<\/body>/g;
    let searchResult = re.exec(html);
    for (; searchResult;) {
        if (2 === searchResult.length) {
            const bodyHtml = searchResult[0];
            const bodyIndex = searchResult.index;

            result.allContentMerged += bodyHtml;
            result.contentLengthAndIndex.push({
                "contentLength": bodyHtml.length,
                "indexInFullHtml": bodyIndex,
            });
        }
        searchResult = re.exec(html);
    }
    return result;
}

const _0x4cd349 = function _0x4de281(_0x5bc41a: any) {
    const _0x1842f8: any[] = [];
    _0x5bc41a.childNodes && _0x5bc41a.childNodes.forEach((_0x20e51c: any) => {
        if (_0x20e51c.attrs) {
            const _0xe0b1f5 = _0x20e51c.attrs.find((_: Attr) => "style" === _.name);
            _0xe0b1f5 && _0x1842f8.push(_0xe0b1f5);
        }
        _0x1842f8.push.apply(_0x1842f8, Array.from(_0x4de281(_0x20e51c)));
    });
    return _0x1842f8;
};

function _0x20c767(html: string) {
    const document = parse5.parse(html);
    _0x4cd349(document).forEach((_0x15e014) => {
        const _0x4c6b0f = "{" + _0x15e014.value + "}",
            _0x11d36a = m1039.removeAllFontSizes(_0x4c6b0f);
        _0x15e014.value = _0x11d36a.substring(1, _0x11d36a.length - 1);
    });
    return parse5.serialize(document);
}

function parseTxt(txt: string, sectionStep = 10000): string[] {
    if (!txt || "string" != typeof txt) {
        return [];
    }

    const lines = txt.split(/\n/);
    const lineContentInfos = [];
    let offset = -1;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineContent = line.trim();
        offset += 1;
        if (lineContent.length > 0) {
            lineContentInfos.push({
                "content": lineContent,
                "offset": offset + line.indexOf(lineContent),
            });
        }
        offset += line.length;
    }

    const result = [""];
    for (let i = 0; i < lineContentInfos.length; i++) {
        const lineContentInfo = lineContentInfos[i];

        const content = parseParagraph(
            lineContentInfo.content,
            0,
            lineContentInfo.content.length,
            lineContentInfo.offset,
        );
        result[result.length - 1] += '<p class="chapterContent_p" data-wr-co="' +
            lineContentInfo.offset + '">' + content + "</p>";

        if (!result[Math.floor(lineContentInfo.offset / sectionStep)]) {
            result.push("");
        }
    }
    return result;
}

function splitChars(text: string, start: number, end: number) {
    const content = text.slice(start, end);
    let offset = 0;
    const wordLengthArray = [];

    const re = /&#\d*;|&\w*;|[iftjl]*[iftjl]+[iftjl]*/g;
    let searchResult = re.exec(content);
    for (; searchResult;) {
        if (searchResult.length > 0) {
            // 搜索到了
            const matchIndex = searchResult.index,
                matchLength = searchResult[0].length;
            for (; matchIndex > offset;) {
                // 处理中间存在空隙
                const blankArea = splitChars(text, start + offset, start + matchIndex);
                wordLengthArray.push.apply(wordLengthArray, Array.from(blankArea));
                offset += blankArea.reduce((prev, cur) => prev + cur);
            }
            wordLengthArray.push(matchLength);
            offset = matchIndex + matchLength;
        }
        searchResult = re.exec(content);
    }

    if (wordLengthArray.length > 0) {
        return wordLengthArray;
    }

    // 没有匹配到正则
    const blankArea = new Array(end - start);
    for (let i = 0; i < blankArea.length; i++) {
        blankArea[i] = 1;
    }
    return blankArea;
}

function isEmpty(content: string) {
    if (content.trim().replace(/&nbsp;/g, "").length === 0) {
        return true;
    }
    return /^\s*$/.test(content);
}

function parseParagraph(
    text: string,
    start: number,
    end: number,
    offset: number,
) {
    const content = text.slice(start, end);
    if (isEmpty(content)) {
        return content;
    }

    let result = "";
    for (let i = start; i < end;) {
        splitChars(text, i, end).forEach((charLen) => {
            const s1 = '<span data-wr-id="layout" data-wr-co="%%OFFSET%%">'.replace(
                "%%OFFSET%%",
                (offset + i - start).toString(),
            );
            const char = text.slice(i, i + charLen);
            result += s1 + char + "</span>";

            charTotal++;
            i += charLen;
        });
    }
    return result;
}

function parseHtml(html: string, style = "", sectionStep = 10000): string[] {
    if (-1 === html.indexOf("<body")) {
        // 作为txt解析
        return parseTxt(html);
    }

    if (!filterXSSInstance) {
        filterXSSInstance = newFilterXSSInstance();
    }

    charTotal = 0;
    const bodyHtml = parseBodyHtml(html);
    html = bodyHtml.allContentMerged;
    _0x470115 = bodyHtml.contentLengthAndIndex;

    // 重置 tagInfos 数组
    tagInfos.length = 0;

    const safeHtml = filterXSSInstance.process(html);
    const _0x1c39e2 = _0x476ae0(safeHtml, tagInfos, sectionStep);
    let _0xdb20a7 = _0x1c39e2.map((_: string) => _0x5007bc(_, style));

    try {
        _0xdb20a7 = _0xdb20a7.map((_: string) => _0x20c767(_));
    } catch (err) {
        console.log(err);
    }
    return _0xdb20a7;
}

export default {
    "parse": parseHtml,
    "parseTxt": parseTxt,
};
