/*
  Broad overview of how client-side epub file generation works.
  Note: this targets epub3 file support ONLY.

  Here’s essentially how it works:
    - Parse each HTML document from a readlist
    - Fetch all the images referenced in the document, download them, and give
      each of them a unique ID (uuid)
    - Turn the readlist HTML into an XHTML documents
    - Bundle everything into a ZIP file

  Example structure of an epub+zip file:
  ```
  mimetype
  META-INF/
    container.xml
  OEBPS/
    content.opf
    toc.xhtml
    000.xhtml
    001.xhtml
    002.xhtml
    ...
    images/
      0000-1111-2222-[...].png
      000a-1111-2222-[...].png
  ```

  Links:

  - The spec - http://idpf.org/epub/30/spec/epub30-overview.html
  - Anatomy of an epub file - https://www.edrlab.org/open-standards/anatomy-of-an-epub-3-file/
  - Node.js server-side epub generator - https://github.com/cyrilis/epub-gen
  - Notes on zip+epub file https://gist.github.com/cyrilis/8d48eef37fbc108869ac32eb3ef97bca

*/
import getContent from "./templates/content.js";
import getChapter from "./templates/chapter.js";
import getContainer from "./templates/container.js";
import getToc from "./templates/toc.js";
import { getImgExt, getUid, slugify, CORS_PROXY } from "./utils.js";

/**
 * @param book
 * @returns {Promise} - downloads a file in the browser
 */
export default async function exportToEpub(book) {
  /**
   * @typedef Epub
   * @property {string} title
   * @property {string} description
   * @property {Object} chapters
   * @property {string} chapters.id
   * @property {string} chapters.title
   * @property {string} chapters.content
   * @property {string} chapters.url
   * @property {Array} chapters.images [["1830-1923.png", "image/png", blob], [...]]
   */
  let epub = {
    title: book.title || "[Untitled]",
    description: book.description || "",
    chapters: await Promise.all(
      book.items.map(async (article, index) => {
        const $html = new DOMParser().parseFromString(
          `<div>${article.content_html}</div>`,
          "text/html"
        );

        // @TODO check for dups, either by the img url or by fingerprinting
        // the file itself. If there are doubles, don't create a nother image
        // for the epub file. Just use the one you already have.
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
              const ext = getImgExt({ mimeType: imgBlob.type, fileUrl: src });
              const id = `${uid}.${ext}`;

              $img.setAttribute("src", `images/${id}`);
              return [id, imgBlob.type, imgBlob];
            } catch (e) {
              console.error(e);
              // If you can't find the image, get a placeholder
              console.log("Failed to fetch (will use placeholder):", src);
              $img.setAttribute("src", "images/img-placeholder.jpg");
              return null;
            }
          })
        ).then((imgs) => imgs.filter((img) => img)); // don't keep anything returned as null

        // Remove things that throw errors and that you wouldn't expect to have
        // in an epub file.
        // @TODO SVGs should probably be included as images
        Array.from(
          $html.querySelectorAll("template, picture > source")
        ).forEach(($node) => {
          $node.remove();
        });

        return {
          // id for the file name, i.e. 001
          id: String(index).padStart(3, "0"),
          title: article.title || "[Untitled]",
          url: article.url,
          // Turn HTML into xhtml
          content: new XMLSerializer().serializeToString(
            // @TODO remove xmlns?
            // results in <div xmlns="http://www.w3.org/1999/xhtml">content</div>"
            $html.querySelector("body > div")
          ),
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
  epub.chapters.forEach((chapter) => {
    zip.file(`OEBPS/${chapter.id}.xhtml`, getChapter(chapter));

    chapter.images.forEach(([id, type, blob]) => {
      zip.file(`OEBPS/images/${id}`, blob);
    });
  });

  // Include the placeholder image for missing images
  // const placeholderImg = await fetch("/epub/img-placeholder.jpg").then(
  //   (res) => res.blob()
  // );
  // zip.file("OEBPS/images/img-placeholder.jpg", placeholderImg);

  return zip
    .generateAsync({ type: "blob", mimeType: "application/epub+zip" })
    .then((content) => {
      saveAs(content, `${slugify(epub.title)}.epub`);
    });
}
