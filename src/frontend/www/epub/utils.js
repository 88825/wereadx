const token = localStorage.getItem('token')

/**
 * Because we fetch things client side, like the HTML of articles at a URL or
 * the images at a URL when generating an epub, we have to proxy all these
 * requests, or we'll likely get CORS issues.
 *
 * ROOT/.netlify/functions/proxy?url=
 */
export const CORS_PROXY = `/api/asset/download?token=${token}&url=`;

/**
 * Check if a URL is relative to the current path or not
 * https://stackoverflow.com/questions/10687099/how-to-test-if-a-url-string-is-absolute-or-relative
 * @param {string} url
 * @returns {boolean}
 */
export function isUrlAbsolute(url) {
    if (url.indexOf("//") === 0) {
        return true;
    } // URL is protocol-relative (= absolute)
    if (url.indexOf("://") === -1) {
        return false;
    } // URL has no protocol (= relative)
    if (url.indexOf(".") === -1) {
        return false;
    } // URL does not contain a dot, i.e. no TLD (= relative, possibly REST)
    if (url.indexOf("/") === -1) {
        return false;
    } // URL does not contain a single slash (= relative)
    if (url.indexOf(":") > url.indexOf("/")) {
        return false;
    } // The first colon comes after the first slash (= relative)
    if (url.indexOf("://") < url.indexOf(".")) {
        return true;
    } // Protocol is defined before first dot (= absolute)
    return false; // Anything else must be relative
}

/**
 * Take a relative path, resolve it within a base path, and return it
 * @param {string} relativeUrl
 * @param {string} baseUrl
 * @return {string}
 */
export function resolveUrl(relativeUrl, baseUrl) {
    const url = new URL(relativeUrl, baseUrl);
    return url.href ? url.href : relativeUrl;
}

/**
 * https://stackoverflow.com/questions/5717093/check-if-a-javascript-string-is-a-url
 * @param {string} string
 * @returns {boolean}
 */
export function isValidHttpUrl(string) {
    let url;

    try {
        url = new URL(string);
    } catch (_) {
        return false;
    }

    return url.protocol === "http:" || url.protocol === "https:";
}

/**
 * https://ourcodeworld.com/articles/read/189/how-to-create-a-file-and-generate-a-download-with-javascript-in-the-browser-without-a-server
 * @param {string} file
 * @param {string} contents
 */
export function downloadFile({ file, contents }) {
    var element = document.createElement("a");
    element.setAttribute(
        "href",
        "data:text/plain;charset=utf-8," + encodeURIComponent(contents)
    );
    element.setAttribute("download", file);

    element.style.display = "none";
    document.body.appendChild(element);

    element.click();

    document.body.removeChild(element);
}

/**
 * https://gist.github.com/codeguy/6684588
 * @param {string} str
 * @returns {string}
 */
export function slugify(str) {
    str = str.replace(/^\s+|\s+$/g, ""); // trim
    str = str.toLowerCase();

    // remove accents, swap ñ for n, etc
    const from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;";
    const to = "aaaaeeeeiiiioooouuuunc------";
    for (let i = 0, l = from.length; i < l; i++) {
        str = str.replace(new RegExp(from.charAt(i), "g"), to.charAt(i));
    }

    str = str
        // .replace(/[^a-z0-9 -]/g, "") // remove invalid chars
        .replace(/\s+/g, "-") // collapse whitespace and replace by '-'
        .replace(/-+/g, "-"); // collapse dashes

    return str;
}


function stripHtml(html) {
    if (typeof window !== "undefined") {
        var doc = new DOMParser().parseFromString(html, "text/html");
        return doc.body.textContent || "";
    } else {
        return html;
    }
}

function isValidUrl(string) {
    try {
        new URL(string);
    } catch (_) {
        return false;
    }

    return true;
}

/**
 * Check if a string is ISO8601 format, specifically: `YYYY-MM-DDTHH:MN:SS.MSSZ`
 * https://stackoverflow.com/questions/52869695/check-if-a-date-string-is-in-iso-and-utc-format
 * @param {string} str
 * @returns {boolean}
 */
function isIsoDate(str) {
    if (!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/.test(str)) return false;
    var d = new Date(str);
    return d.toISOString() === str;
}

export function devLog(array) {
    if (typeof window !== "undefined" && window.IS_DEV) {
        // console.log("(__DEV__) " + array.join("\n    "));
        // console.group();
        array.forEach((item, i) => {
            if (i === 0) {
                console.log("__DEV__ ", item);
            } else {
                console.log("        ", item);
            }
        });
        // console.groupEnd();
    }
}

/**
 * Take a URL and it's HTML contents and parse it with mercury to 1)
 * sanitzie the HTML, and 2) absolutize image links.
 * @param {string} url
 * @param {string} html
 * @returns {MercuryArticle}
 */
export function createMercuryArticle(url, html) {
    return window.Mercury.parse(url, { html }).then((mercuryArticle) => {
        let dom = new DOMParser().parseFromString(
            mercuryArticle.content,
            "text/html"
        );
        let modified = false;
        // Change all relative paths for <img src> and <a href> to absolute ones
        Array.from(dom.querySelectorAll("img, a")).forEach(($node) => {
            // the DOM node's property, i.e. $img.src, resolves to an absolute URL
            // while .getAttribute() gives you what's in the source HTML (possibly
            // a relative path)
            const nodeType = $node.tagName.toLowerCase();
            const resolvedUrl = nodeType === "img" ? $node.src : $node.href;

            // If the resolved URL has the current window location's host in it, that
            // means it was a relative path, i.e. "../path/to/thing" and therefore
            // the browser resolved it to the current window. We don't want that.
            // We want it to resolve to the source from whence it came.
            if (resolvedUrl.includes(window.location.hostname)) {
                const relativePath =
                    nodeType === "img"
                        ? $node.getAttribute("src")
                        : $node.getAttribute("href");
                const newResolvedUrl = resolveUrl(relativePath, mercuryArticle.url);
                devLog([
                    `Changed relative path for <${nodeType}> tag`,
                    `From: ${relativePath}`,
                    `To: ${newResolvedUrl}`,
                ]);
                $node.setAttribute(nodeType === "img" ? "src" : "href", newResolvedUrl);
                modified = true;
            }
        });

        if (modified) {
            mercuryArticle = {
                ...mercuryArticle,
                content: dom.body.innerHTML,
            };
        }

        devLog(["Created a new Mercurcy article", mercuryArticle]);

        return mercuryArticle;
    });
}

/**
 * https://stackoverflow.com/a/27979933/1339693
 */
export function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case "<":
                return "&lt;";
            case ">":
                return "&gt;";
            case "&":
                return "&amp;";
            case "'":
                return "&apos;";
            case '"':
                return "&quot;";
        }
    });
}

/**
 * Given an image's mimetype, return the extension. If there's no extension
 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types
 * @param {{
 *   mimeType: string,
 *   fileUrl: string
 * }}
 * @returns {string}
 */
export function getImgExt({ mimeType, fileUrl }) {
    switch (mimeType) {
        case "image/apng":
            return "apng";
        case "image/bmp":
            return "bmp";
        case "image/gif":
            return "gif";
        case "image/x-icon":
            return "ico";
        case "image/jpeg":
            return "jpg";
        case "image/png":
            return "png";
        case "image/svg+xml":
            return "svg";
        case "image/tiff":
            return "tiff";
        case "image/webp":
            return "webp";
        default:
            // Pull it from the filename if we can't get it
            // https://stackoverflow.com/questions/6997262/how-to-pull-url-file-extension-out-of-url-string-using-javascript
            return fileUrl.split(/[#?]/)[0].split(".").pop().trim();
    }
}

/**
 * Import a UMD file using a promise
 * @param {string} url
 */
export function importUMD(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.onload = () => {
            resolve();
        };
        script.onerror = (err) => {
            reject(err);
        };
        script.src = url;

        document.head.appendChild(script);
    });
}

/**
 * https://gist.github.com/SimonHoiberg/ad2710c8626c5a74cddd8f6385795cc0
 * @returns {string}
 */
export function getUid() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
