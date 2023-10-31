export default function getChapter(chapter) {
    const {title, content} = chapter;

    return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
    <title>${title}</title>
    <link rel="stylesheet" href="styles/common.css" />
  </head>
  <body>
    ${content}
    
    <script src="scripts/common.js"></script>
  </body>
</html>
`;
}
