/* 방문 통계 — 기본값은 "꺼짐". 아래 설정을 채우기 전에는 아무 요청도 보내지 않는다.
 *
 * 쿠키·브라우저 저장소·방문자 식별값을 쓰지 않는다. 페이지를 열 때 "어느 페이지를 봤는지"만 한 번 보낸다.
 * 브라우저가 추적 거부(Do Not Track / Global Privacy Control)를 켜 둔 방문자는 세지 않는다.
 *
 * 켜는 방법 — 아래 「설정」 한 곳에서 A·B 중 하나만 채운다 (둘 다 비우면 꺼짐).
 *
 *  A. 쿠키 없는 통계 서비스(Plausible · Umami · GoatCounter · Cloudflare Web Analytics 등)를 쓸 때
 *     서비스가 안내하는 <script ...> 태그의 주소를 script 에, data-* 속성을 attrs 에 그대로 옮긴다.
 *       예) Plausible   script: "https://plausible.io/js/script.js"
 *                       attrs:  { "data-domain": "<사이트 주소>" }
 *       예) Umami       script: "<Umami 주소>/script.js"
 *                       attrs:  { "data-website-id": "<Umami 가 준 ID>" }
 *       예) Cloudflare  script: "https://static.cloudflareinsights.com/beacon.min.js"
 *                       attrs:  { "data-cf-beacon": "{\"token\": \"<Cloudflare 가 준 토큰>\"}" }
 *     (Google Analytics 는 쿠키를 쓰므로 이 자리에 맞지 않는다.)
 *
 *  B. 직접 만든 수집 주소가 있을 때
 *     endpoint 에 https 주소를 넣는다. 페이지를 열 때마다 아래 JSON 을 POST 로 한 번 보낸다.
 *       { "path": "/en/", "lang": "en", "referrer": "example.com", "width": 1280 }
 *     referrer 는 들어온 곳의 도메인만(주소 전체 아님), width 는 화면 너비(px).
 *
 * 켠 뒤에는 실제 페이지를 열어 통계 서비스 화면에 방문이 잡히는지 확인한다.
 * 이 파일은 4개 언어 페이지가 함께 읽으므로 여기만 고치면 전부 적용된다.
 */
(function () {
  "use strict";

  /* ===================== 설정 (여기만 고친다) ===================== */
  var CONFIG = {
    script: "",   // A. 통계 서비스 스크립트 주소 (https://...)
    attrs: {},    // A. 그 스크립트 태그에 붙일 data-* 속성
    endpoint: ""  // B. 직접 만든 수집 주소 (https://...)
  };
  /* ================================================================ */

  var script = String(CONFIG.script || "").trim();
  var endpoint = String(CONFIG.endpoint || "").trim();
  if (!script && !endpoint) return; // 꺼짐

  // 추적 거부를 켠 방문자, 미리보기(로컬 파일·localhost)는 세지 않는다.
  var nav = window.navigator || {};
  if (nav.doNotTrack === "1" || window.doNotTrack === "1" || nav.globalPrivacyControl === true) return;
  var host = window.location.hostname;
  if (window.location.protocol === "file:" || host === "localhost" || host === "127.0.0.1" || host === "") return;

  if (script) {
    if (!/^https:\/\//.test(script)) return;
    var el = document.createElement("script");
    el.defer = true;
    el.src = script;
    var attrs = CONFIG.attrs || {};
    for (var name in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, name) && /^data-[a-z0-9-]+$/.test(name)) {
        el.setAttribute(name, String(attrs[name]));
      }
    }
    document.head.appendChild(el);
    return;
  }

  if (!/^https:\/\//.test(endpoint)) return;
  var referrer = "";
  try {
    var from = document.referrer ? new URL(document.referrer).hostname : "";
    if (from && from !== host) referrer = from;
  } catch (e) {}
  var body = JSON.stringify({
    path: window.location.pathname,
    lang: document.documentElement.lang || "",
    referrer: referrer,
    width: window.innerWidth || 0
  });
  try {
    // text/plain 이라 사전 요청(preflight) 없이 가고, 쿠키는 보내지 않는다.
    if (window.fetch) {
      window.fetch(endpoint, { method: "POST", body: body, keepalive: true, credentials: "omit", mode: "no-cors" })["catch"](function () {});
    } else if (nav.sendBeacon) {
      nav.sendBeacon(endpoint, body);
    }
  } catch (e) {}
})();
