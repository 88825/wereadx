/**
 * 实现 utils.js 中的 1039 模块: style-parser
 */

// 由于 deno compile 存在 bug，所以 csstree 这个包暂时不放在 deps.ts 中
// import {csstree} from "../deps.ts"
import * as csstree from "npm:css-tree@2.3.1";

interface ParseOptions {
    removeFontSizes: boolean;
    enableTranslate: boolean;
}

function removeAllFontSizes(style: string) {
    const ast = csstree.parse(style);
    csstree.walk(ast, {
        "visit": "Declaration",
        "enter": function (node: any, item: any, list: any) {
            if ("font-size" === node.property) {
                list.remove(item);
            }
        },
    });
    return csstree.generate(ast);
}

function removeTopClassSpanStyle(style: string) {
    const ast = csstree.parse(style);
    csstree.walk(ast, {
        "visit": "Rule",
        "enter": function (node: any, item: any, list: any) {
            const selectorList = node.prelude;

            if (
                csstree.find(
                    selectorList,
                    (node: any) => node.type === "TypeSelector" && node.name === "span",
                ) &&
                !csstree.find(
                    selectorList,
                    (node: any) =>
                        node.type === "ClassSelector" || node.type === "IdSelector",
                )
            ) {
                list.remove(item);
            }
        },
    });
    return csstree.generate(ast);
}

function parse(style: string, options: Partial<ParseOptions> = {}) {
    // 添加字体
    style = style.replace(
        /font-family:([^;]*?);/g,
        'font-family:$1,"PingFang SC", -apple-system, "SF UI Text", "Lucida Grande", STheiti, "Microsoft YaHei", sans-serif;',
    );

    if (options.removeFontSizes) {
        style = removeAllFontSizes(style);
    }

    style = removeTopClassSpanStyle(style);

    // remove relative position
    const ast1 = csstree.parse(style);
    csstree.walk(ast1, {
        "visit": "Declaration",
        "enter": function (node: any, item: any, list: any) {
            // todo: 感觉这里有问题
            // if (node.property === 'position' && node.value.children.size === 1 && node.value.children.first.name === 'relative') {
            //     list.remove(item)
            // }
            if (
                "position" === node.property && "Identifier" === node.value.type &&
                "relative" === node.value.name
            ) {
                list.remove(item);
            }
        },
    });
    style = csstree.generate(ast1);

    // remove code style
    const ast2 = csstree.parse(style);
    csstree.walk(ast2, {
        "visit": "Rule",
        "enter": function (node: any, item: any, list: any) {
            // todo: 这里也有问题，应该用find才能搜索到
            // if (csstree.find(node.prelude, (node: any) => node.type === 'TypeSelector' && node.name === 'code')) {
            //     list.remove(item)
            // }
            if (
                "TypeSelector" === node.prelude.type && "code" === node.prelude.name
            ) {
                list.remove(item);
            }
        },
    });
    style = csstree.generate(ast2);

    if (options.enableTranslate) {
        style = style.replace(/\.wr-translation\s*?\{(?:\n|.|\r)*?}/g, "");
    }
    return style;
}

export default {
    "parse": parse,
    "removeAllFontSizes": removeAllFontSizes,
};
