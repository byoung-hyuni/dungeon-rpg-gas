// 빌드: dist/preview.html (배포 없이 브라우저에서 바로 실행하는 로컬 미리보기)
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..'), src = path.join(root, 'src'), dist = path.join(root, 'dist');
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

const read = f => fs.readFileSync(path.join(src, f), 'utf8');
let html = read('Index.html').replace(/<\?!= include\('(\w+)'\); \?>/g, (_, n) => read(n + '.html'));
const mock = '<script>\n' + fs.readFileSync(path.join(__dirname, 'GasMock.js'), 'utf8') + '\n</script>\n' +
  ['Data.gs', 'Code.gs', 'Setup.gs'].map(f => '<script>\n/* ==== ' + f + ' (모의 서버) ==== */\n' + read(f) + '\n</script>').join('\n') +
  "\n<script>if (!SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Config')) setup();</script>\n";
const marker = '<script>\n/**\n * Api';
if (!html.includes(marker)) throw new Error('Api marker not found');
html = html.replace(marker, mock + marker)
  .replace('<base target="_top">', '<base target="_top">\n  <title>던전 마스터 RPG (로컬 미리보기)</title>\n  <meta name="viewport" content="width=device-width, initial-scale=1">');
fs.writeFileSync(path.join(dist, 'preview.html'), html);
console.log('built', fs.statSync(path.join(dist, 'preview.html')).size, 'bytes');
