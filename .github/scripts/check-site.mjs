// 공개 사이트 파일 점검 (빌드는 비공개 저장소 codberg-dev/bon-docs 에서 한다 — 여기는 완성 파일만).
// 네트워크 없이: 페이지 4개·PDF 4개·OG 이미지 4개가 있는지, 페이지 안의 상대 주소(href/src)가 실제 파일을 가리키는지,
// OG·canonical 이 공개 주소(CNAME)를 쓰는지, sitemap·robots 가 맞는지. 실행: node .github/scripts/check-site.mjs
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const LANGS = { ko: "", en: "en/", "zh-CN": "zh-CN/", ja: "ja/" };
let fail = 0;
const ok = (cond, msg) => { console.log(`${cond ? "OK  " : "FAIL"}  ${msg}`); if (!cond) fail++; };
const read = (f) => readFileSync(resolve(ROOT, f), "utf8");
const has = (f) => existsSync(resolve(ROOT, f)) && statSync(resolve(ROOT, f)).size > 0;

const host = read("CNAME").trim();
ok(/^[a-z0-9.-]+$/.test(host), `CNAME = ${host}`);
const SITE = `https://${host}`;
ok(existsSync(resolve(ROOT, ".nojekyll")), ".nojekyll (Jekyll 처리 끔)");

for (const [lang, dir] of Object.entries(LANGS)) {
  const page = `${dir}index.html`;
  ok(has(page), `페이지 ${page}`);
  if (!has(page)) continue;
  const html = read(page);
  ok(/^<!doctype html>/i.test(html.trimStart()), `${page} doctype`);
  ok(new RegExp(`<html[^>]*lang="${lang}"`).test(html), `${page} lang="${lang}"`);
  ok(html.includes(`<link rel="canonical" href="${SITE}/${dir}">`), `${page} canonical = ${SITE}/${dir}`);
  const og = (p) => (html.match(new RegExp(`property="og:${p}" content="([^"]*)"`)) || [])[1];
  ok(og("title") && og("description") && og("url") === `${SITE}/${dir}`, `${page} OG 제목·설명·주소`);
  ok(og("image") === `${SITE}/assets/og-${lang}.png` && has(`assets/og-${lang}.png`), `${page} OG 이미지 assets/og-${lang}.png`);
  ok(has(`pdf/BON-Whitepaper-${lang}.pdf`), `PDF pdf/BON-Whitepaper-${lang}.pdf`);
  // 상대 주소가 가리키는 파일이 있는가 (바깥 주소·#·mailto 는 건너뛴다)
  const base = new URL(`${SITE}/${dir}`);
  const missing = [];
  for (const [, ref] of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    if (/^(https?:|mailto:|tel:|data:|#)/.test(ref)) continue;
    let p = decodeURIComponent(new URL(ref, base).pathname.slice(1));
    if (p === "" || p.endsWith("/")) p += "index.html";
    if (!has(p)) missing.push(ref);
  }
  ok(missing.length === 0, `${page} 상대 주소 모두 있음${missing.length ? ` — 없음: ${missing.join(", ")}` : ""}`);
}

const sitemap = read("sitemap.xml");
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
ok(locs.length === Object.keys(LANGS).length && Object.values(LANGS).every((d) => locs.includes(`${SITE}/${d}`)), `sitemap.xml 주소 ${locs.length}개 = 4개 언어`);
const robots = read("robots.txt");
ok(robots.includes(`Sitemap: ${SITE}/sitemap.xml`) && !/^Disallow:\s*\/\s*$/m.test(robots), "robots.txt (전체 허용 + sitemap)");

console.log(fail ? `\n${fail}개 실패` : "\n전부 통과");
process.exit(fail ? 1 : 0);
