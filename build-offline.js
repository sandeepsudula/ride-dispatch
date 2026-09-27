// Builds a single self-contained HTML file (offline mode: upload/paste a chat export). Output: dist/ride-dispatch.html
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
const lib = fs.readFileSync(path.join(__dirname, 'lib', 'rides.js'), 'utf8');
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist', 'ride-dispatch.html'), html.replace('<script src="rides.js"></script>', () => '<script>\n' + lib + '\n</script>'));
console.log('Wrote dist/ride-dispatch.html');
