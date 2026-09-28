// Builds a single self-contained HTML file (offline mode: upload/paste a chat export). Output: dist/ride-dispatch.html
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
const lib = fs.readFileSync(path.join(__dirname, 'lib', 'rides.js'), 'utf8');
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
const icon = 'data:image/png;base64,' + fs.readFileSync(path.join(__dirname, 'public', 'icons', 'icon-192.png')).toString('base64');
const out = html.replace('<script src="rides.js"></script>', () => '<script>\n' + lib + '\n</script>')
  .replace(/<link rel="manifest"[^>]*>\n/, '')
  .replace(/href="icons\/icon-\d+\.png"/g, () => `href="${icon}"`);
fs.writeFileSync(path.join(__dirname, 'dist', 'ride-dispatch.html'), out);
console.log('Wrote dist/ride-dispatch.html');
