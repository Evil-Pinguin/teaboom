import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = path.resolve(root, process.argv[2] || 'teaboom.html');
const mimeTypes = { '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };

const toDataUri = async (filePath) => {
  const contents = await readFile(filePath);
  return `data:${mimeTypes[path.extname(filePath)]};base64,${contents.toString('base64')}`;
};

let html = await readFile(path.join(root, 'index.html'), 'utf8');
let css = await readFile(path.join(root, 'css/styles.css'), 'utf8');
const javascript = await readFile(path.join(root, 'js/product.js'), 'utf8');

for (const name of ['cyrillic', 'latin-ext', 'latin']) {
  const relativePath = `../assets/fonts/open-sans-${name}.woff2`;
  const dataUri = await toDataUri(path.resolve(root, 'css', relativePath));
  css = css.replaceAll(relativePath, dataUri);
}

for (const name of ['logo.png', 'pineapple-oolong-480.webp', 'pineapple-oolong-970.webp', 'tea-pattern.webp']) {
  const relativePath = `img/${name}`;
  const dataUri = await toDataUri(path.resolve(root, relativePath));
  html = html.replaceAll(relativePath, dataUri);
  css = css.replaceAll(`../${relativePath}`, dataUri);
}

html = html
  .replace('<link rel="stylesheet" href="css/styles.css">', `<style>\n${css}\n    </style>`)
  .replace('    <script src="js/product.js" defer></script>\n', '')
  // An inline script runs after the DOM, unlike an external script with defer.
  .replace('  </body>', `    <script>\n${javascript}\n    </script>\n  </body>`);

await writeFile(output, html);
console.log(`Standalone offline page: ${output}`);
