// 배포 ID는 공개 소스 대신 로컬 설정 또는 환경 변수에서 읽습니다.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function deploymentArgs(id, descriptions) {
  if (!/^AKfy[A-Za-z0-9_-]+$/.test(id || '')) {
    throw new Error('DEPLOYMENT_ID 또는 .deployment.local.json에 올바른 배포 ID를 설정하세요.');
  }
  return ['create-deployment', '-i', id, '-d', descriptions.join(' ') || '게임 업데이트'];
}

if (require.main === module) {
  try {
    let id = process.env.DEPLOYMENT_ID;
    const configPath = path.join(__dirname, '..', '.deployment.local.json');
    if (!id && fs.existsSync(configPath)) id = JSON.parse(fs.readFileSync(configPath, 'utf8')).deploymentId;
    const args = deploymentArgs(id, process.argv.slice(2));
    const result = spawnSync('clasp', args, { stdio: 'inherit', shell: false });
    if (result.error) throw result.error;
    process.exitCode = result.status === null ? 1 : result.status;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = { deploymentArgs };
