// 공개 파일과 Git 이력에서 운영 식별자·인증 정보·개인 이메일을 검사합니다.
// 일치한 값은 출력하지 않고 위치와 종류만 보고합니다.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const root = path.join(__dirname, '..');
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const rules = [
  ['Google 배포 ID', /AKfy[A-Za-z0-9_.-]{10,}/g],
  ['개인 대화 링크', /https:\/\/(?:claude\.ai\/code\/session_|chatgpt\.com\/c\/)[A-Za-z0-9_-]+/g],
  ['GitHub 인증 토큰', /(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,})/g],
  ['Google OAuth 토큰', /ya29\.[A-Za-z0-9_-]{20,}/g],
  ['Google API 키', /AIza[A-Za-z0-9_-]{30,}/g],
  ['AWS 접근 키', /(?:AKIA|ASIA)[A-Z0-9]{16}/g],
  ['API 비밀 키', /\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{20,}/g],
  ['개인 키', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['운영 프로젝트 설정', /"(?:scriptId|parentId|deploymentId)"\s*:\s*"(?!YOUR_)[A-Za-z0-9_-]{20,}"/g],
];
for (const [file, keys] of [['.clasp.json', ['scriptId', 'parentId']], ['.deployment.local.json', ['deploymentId']]]) {
  const p = path.join(root, file);
  if (!fs.existsSync(p)) continue;
  const config = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const key of keys) {
    const value = config[key];
    if (typeof value === 'string' && value.length > 10 && !value.startsWith('YOUR_')) {
      rules.push(['로컬 운영 식별자', new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')]);
    }
  }
}
const problems = [];
function inspect(text, label) {
  for (const [kind, re] of rules) {
    re.lastIndex = 0;
    if (re.test(text)) problems.push(label + ': ' + kind);
  }
  const emails = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [];
  if (emails.some(email => !/@(?:users\.noreply\.github\.com|example\.(?:com|org|invalid))$/i.test(email))) {
    problems.push(label + ': 개인 이메일');
  }
}
function checkName(name, label) {
  if (/(^|\/)(?:\.clasp\.json|\.clasprc\.json|\.deployment\.local\.json|\.env(?:\..*)?)$/.test(name) && !name.endsWith('.env.example')) {
    problems.push(label + ': 로컬 전용 설정 파일');
  }
}
const objects = git(['rev-list', '--objects', '--all']).trim().split('\n').filter(Boolean);
let checked = 0;
for (const line of objects) {
  const [oid, ...parts] = line.split(' '), name = parts.join(' ');
  const type = git(['cat-file', '-t', oid]).trim();
  if (!['blob', 'commit', 'tag'].includes(type)) continue;
  const label = name || type + ' ' + oid.slice(0, 10);
  if (type === 'blob') checkName(name, label);
  inspect(git(['cat-file', '-p', oid]), label);
  checked++;
}
const files = git(['ls-files', '--cached', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean);
for (const file of new Set(files)) {
  checkName(file, file);
  if (fs.existsSync(path.join(root, file))) inspect(fs.readFileSync(path.join(root, file), 'utf8'), file);
}
if (problems.length) {
  console.error([...new Set(problems)].join('\n'));
  process.exitCode = 1;
} else console.log('공개 정보 검사 통과: Git 객체 ' + checked + '개와 현재 파일을 확인했습니다.');
