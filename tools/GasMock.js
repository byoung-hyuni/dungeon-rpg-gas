/**
 * GasMock.js — Apps Script 서비스의 아주 작은 흉내 (로컬 미리보기·테스트용)
 * 실제 배포에는 들어가지 않습니다.
 * SpreadsheetApp / CacheService / PropertiesService / LockService / Utilities / Session / Logger
 */
(function (root) {
  function sha256Bytes(str) {
    const utf8 = unescape(encodeURIComponent(str));
    const bytes = []; for (let i = 0; i < utf8.length; i++) bytes.push(utf8.charCodeAt(i));
    const K = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
    let H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    const l = bytes.length * 8;
    bytes.push(0x80); while ((bytes.length % 64) !== 56) bytes.push(0);
    for (let i = 7; i >= 0; i--) bytes.push(i >= 4 ? 0 : (l >>> (i * 8)) & 0xff);
    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    for (let o = 0; o < bytes.length; o += 64) {
      const w = new Array(64);
      for (let i = 0; i < 16; i++) w[i] = (bytes[o + i * 4] << 24) | (bytes[o + i * 4 + 1] << 16) | (bytes[o + i * 4 + 2] << 8) | bytes[o + i * 4 + 3];
      for (let i = 16; i < 64; i++) {
        const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + K[i] + w[i]) | 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const mj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + mj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H = H.map((v, i) => (v + [a, b, c, d, e, f, g, h][i]) | 0);
    }
    const out = [];
    H.forEach(v => { for (let i = 3; i >= 0; i--) { const b = (v >>> (i * 8)) & 0xff; out.push(b > 127 ? b - 256 : b); } });
    return out; // Apps Script처럼 부호 있는 바이트 배열
  }

  const STORE_KEY = 'gasmock_workbook_v1';
  const wb = { sheets: [] };
  const storage = (function () { try { return root.localStorage || null; } catch (e) { return null; } })();
  function persist() { if (!storage) return; try { storage.setItem(STORE_KEY, JSON.stringify(wb.sheets.map(s => ({ name: s.name, data: s.data })))); } catch (e) {} }
  function load() {
    if (!storage) return;
    try { const j = JSON.parse(storage.getItem(STORE_KEY) || 'null'); if (j) j.forEach(s => wb.sheets.push(makeSheet(s.name, s.data))); } catch (e) {}
  }
  function makeRange(sheet, r, c, nr, nc) {
    const t = {
      getValues() { const out = []; for (let i = 0; i < nr; i++) { const row = []; for (let j = 0; j < nc; j++) { const v = (sheet.data[r - 1 + i] || [])[c - 1 + j]; row.push(v === undefined || v === null ? '' : v); } out.push(row); } return out; },
      getValue() { return this.getValues()[0][0]; },
      setValues(vals) { for (let i = 0; i < vals.length; i++) { const ri = r - 1 + i; sheet.data[ri] = sheet.data[ri] || []; for (let j = 0; j < vals[i].length; j++) sheet.data[ri][c - 1 + j] = vals[i][j]; } persist(); return p; },
      setValue(v) { return this.setValues([[v]]); },
      getSheet() { return sheet.api; },
    };
    const p = new Proxy(t, { get(o, k) { if (k in o) return o[k]; return function () { return p; }; } });
    return p;
  }
  function makeSheet(name, data) {
    const s = { name, data: data || [] };
    const lastRow = () => { for (let i = s.data.length - 1; i >= 0; i--) if ((s.data[i] || []).some(v => v !== '' && v !== null && v !== undefined)) return i + 1; return 0; };
    const lastCol = () => { let m = 0; s.data.forEach(r => { if (!r) return; for (let j = r.length - 1; j >= 0; j--) if (r[j] !== '' && r[j] !== undefined && r[j] !== null) { m = Math.max(m, j + 1); break; } }); return m; };
    const t = {
      getName: () => s.name,
      getLastRow: lastRow,
      getLastColumn: lastCol,
      getDataRange: () => makeRange(s, 1, 1, Math.max(1, lastRow()), Math.max(1, lastCol())),
      getRange: (r, c, nr, nc) => makeRange(s, r, c, nr || 1, nc || 1),
      clear: () => { s.data = []; persist(); return api; },
      appendRow: (row) => { s.data[lastRow()] = row.slice(); persist(); return api; },
    };
    const api = new Proxy(t, { get(o, k) { if (k in o) return o[k]; return function () { return api; }; } });
    s.api = api;
    return s;
  }
  const ss = {
    getId: () => 'LOCAL_MOCK',
    getSheetByName: (n) => { const s = wb.sheets.find(x => x.name === n); return s ? s.api : null; },
    insertSheet: (n, idx) => { const s = makeSheet(n); if (typeof idx === 'number') wb.sheets.splice(idx, 0, s); else wb.sheets.push(s); persist(); return s.api; },
    getSheets: () => wb.sheets.map(s => s.api),
    deleteSheet: (sh) => { wb.sheets = wb.sheets.filter(s => s.api !== sh); persist(); },
  };
  load();

  const cacheStore = {};
  const props = {};
  root.SpreadsheetApp = {
    getActiveSpreadsheet: () => ss,
    openById: () => ss,
    getUi: () => { throw new Error('No UI in mock'); },
  };
  root.CacheService = { getScriptCache: () => ({
    get: (k) => { const e = cacheStore[k]; if (!e || e.exp < Date.now()) return null; return e.v; },
    put: (k, v, ttl) => { cacheStore[k] = { v: String(v), exp: Date.now() + (ttl || 600) * 1000 }; },
    remove: (k) => { delete cacheStore[k]; },
  }) };
  root.PropertiesService = { getScriptProperties: () => ({
    getProperty: (k) => { if (k in props) return props[k]; try { return storage ? storage.getItem('gasmock_prop_' + k) : null; } catch (e) { return null; } },
    setProperty: (k, v) => { props[k] = v; try { storage && storage.setItem('gasmock_prop_' + k, v); } catch (e) {} },
  }) };
  root.LockService = { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) };
  root.Utilities = {
    DigestAlgorithm: { SHA_256: 'SHA_256' }, Charset: { UTF_8: 'UTF_8' },
    computeDigest: (alg, s) => sha256Bytes(s),
    getUuid: () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }),
    formatDate: (d, tz, f) => { const p = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); },
  };
  root.Session = { getScriptTimeZone: () => 'Asia/Seoul' };
  root.Logger = { log: (m) => { if (root.console) console.log('[GAS]', m); } };
  root.HtmlService = {};
  root.ScriptApp = { getService: () => ({ getUrl: () => '' }) };
  root.GasMock = { workbook: wb, reset: () => { wb.sheets.length = 0; persist(); }, sha256Bytes };
})(typeof window !== 'undefined' ? window : globalThis);
