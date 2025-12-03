// public/embed.js
(() => {
  const s =
    document.currentScript ||
    document.querySelector("script[data-rizbo-school],script[data-school]");
  if (!s) return;

  // 必須: school
  const school = s.dataset.rizboSchool || s.dataset.school || "";
  if (!school) {
    console.warn("[rizbo] data-rizbo-school が指定されていません");
    return;
  }

  // レイアウト系の設定（data-rizbo-* を優先）
  const theme = s.dataset.rizboTheme || s.dataset.theme || "light";
  const side = s.dataset.rizboSide || s.dataset.side || "right"; // left | right
  const openByDefault = (s.dataset.rizboOpen ?? s.dataset.open) === "true";
  const width = parseInt(s.dataset.rizboWidth || s.dataset.width || "380", 10);
  const height = parseInt(
    s.dataset.rizboHeight || s.dataset.height || "520",
    10
  );

  // paletteごとのボタンカラー（ChatbotEmbedClient の --rz-primary と対応）
  const paletteColorMap = {
    navy: "#2f5c7a",
    emerald: "#0f766e",
    orange: "#ea580c",
    purple: "#6d28d9",
    rose: "#be123c",
    gray: "#374151",
  };

  // origin / path
  let autoOrigin = location.origin;
  try {
    autoOrigin = new URL(s.src).origin;
  } catch {}
  const origin = s.dataset.origin || autoOrigin;
  const path = s.dataset.path || "/embed/chatbot";

  // メイン処理を async で定義
  const main = async () => {
    // --- ここで DB から palette / launcherText を取得する ---
    let paletteFromDb = "gray";
    let launcherTextFromDb = "質問はコチラ";

    try {
      const url = `${origin}/api/faq?${new URLSearchParams({
        school,
      }).toString()}`;

      const res = await fetch(url, { credentials: "omit" });
      if (res.ok) {
        const data = await res.json();
        if (
          data &&
          typeof data === "object" &&
          typeof data.palette === "string"
        ) {
          const p = data.palette.toLowerCase();
          if (paletteColorMap[p]) {
            paletteFromDb = p;
          }
        }
        if (
          data &&
          typeof data === "object" &&
          typeof data.launcherText === "string" &&
          data.launcherText.trim()
        ) {
          launcherTextFromDb = data.launcherText.trim();
        }
      } else {
        console.warn("[rizbo] /api/faq 取得に失敗しました", res.status);
      }
    } catch (e) {
      console.warn("[rizbo] /api/faq 取得中にエラー", e);
    }

    const palette = paletteFromDb; // DB が常にソース・オブ・トゥルース
    const color = paletteColorMap[palette] || paletteColorMap["gray"];

    // iframe の src（必要なら palette をクエリにも流すが、中身は DB と一致）
    const src = `${origin}${path}?${new URLSearchParams({
      school,
      theme,
      palette,
      v: "2025-11-19",
      mode: "bubble",
    }).toString()}`;

    // スタイル（衝突しにくい接頭辞）
    const css = `
  .rzb-launcher-wrap{position:fixed; z-index:2147483000;}
  .rzb-launcher-wrap.rzb-right{right:24px;bottom:24px;}
  .rzb-launcher-wrap.rzb-left{left:24px;bottom:24px;}

  .rzb-launcher{
    position:relative;
    width:56px;height:56px;border-radius:50%;
    background:${color};color:#fff;display:flex;align-items:center;justify-content:center;
    cursor:pointer; border:none;
  }
  .rzb-launcher img{
    filter: drop-shadow(0px 0px 4px rgba(0, 0, 0, 0.42));
  }

  /* 吹き出し本体 */
  .rzb-launcher-bubble{
    position:absolute;
    bottom:64px;
    right:0;
    transform-origin:100% 100%;
    background:#ffffff;
    color:#111827;
    font-size:12px;
    font-weight:600;
    padding:6px 10px;
    border-radius:999px;
    white-space:nowrap;
    box-shadow:0 6px 16px rgba(0,0,0,0.18);
    border:1px solid rgba(15,23,42,0.06);
    animation:rzbTalk 3s ease-in-out infinite;
  }
  .rzb-launcher-wrap.rzb-left .rzb-launcher-bubble{
    right:auto;
    left:0;
    transform-origin:0% 100%;
  }
  .rzb-launcher-bubble::after{
    content:"";
    position:absolute;
    bottom:-6px;
    right:14px;
    border-width:6px 6px 0 6px;
    border-style:solid;
    border-color:#ffffff transparent transparent transparent;
    filter: drop-shadow(0px 1px 1px rgba(0,0,0,0.1));
  }
  .rzb-launcher-wrap.rzb-left .rzb-launcher-bubble::after{
    right:auto;
    left:14px;
  }

  /* 「しゃべってる風」アニメーション */
  @keyframes rzbTalk{
    0%,60%,100%{
      transform:scale(0.96) translateY(0);
      opacity:0.6;
    }
    10%,30%{
      transform:scale(1) translateY(-2px);
      opacity:1;
    }
  }

  .rzb-panel{
    position:fixed; z-index:2147483001; background:#fff; overflow:hidden;
    width:${width}px; height:${height}px; border-radius:16px; box-shadow:0 20px 50px rgba(0,0,0,.25);
    display:none;
  }
  .rzb-panel.rzb-open{display:block}
  .rzb-panel.rzb-right{right:24px;bottom:96px}
  .rzb-panel.rzb-left{left:24px;bottom:96px}
  .rzb-iframe{width:100%;height:100%;border:none;display:block}

  @media (max-width:640px){
    .rzb-panel{
      right:0!important;left:0!important;bottom:0!important;width:100%!important;
      height:calc(100dvh - 16px)!important; border-radius:12px 12px 0 0
    }
    .rzb-launcher-wrap{
      right:16px!important;left:auto!important;bottom:16px!important;
    }
  }`;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    // ランチャーのラッパー
    const wrap = document.createElement("div");
    wrap.className = `rzb-launcher-wrap rzb-${side}`;

    // ランチャーボタン
    const btn = document.createElement("button");
    btn.className = `rzb-launcher`;
    btn.setAttribute("aria-label", "チャットを開く");
    btn.innerHTML = `
  <img src="https://rizbo.dansul.jp/outline-logo.png"
    alt="チャットを開く"
    width="64"
    height="64"
    style="width: auto;"/>
  `;

    // 吹き出し（launcherText が空なら出さない）
    let bubble = null;
    if (launcherTextFromDb && launcherTextFromDb.trim()) {
      const b = document.createElement("div");
      b.className = "rzb-launcher-bubble";
      b.textContent = launcherTextFromDb;
      bubble = b;
      wrap.appendChild(bubble);
    }

    wrap.appendChild(btn);

    // パネル
    const panel = document.createElement("div");
    panel.className = `rzb-panel rzb-${side}`;
    const iframe = document.createElement("iframe");
    iframe.className = "rzb-iframe";
    iframe.src = src;
    iframe.setAttribute(
      "sandbox",
      [
        "allow-forms",
        "allow-popups",
        "allow-scripts",
        "allow-same-origin",
        "allow-downloads",
        "allow-popups-to-escape-sandbox",
      ].join(" ")
    );
    iframe.setAttribute("allow", "clipboard-write; fullscreen");
    panel.appendChild(iframe);

    // DOM 追加
    document.body.appendChild(panel);
    document.body.appendChild(wrap);

    // 開閉
    const open = () => {
      panel.classList.add("rzb-open");
      btn.setAttribute("aria-label", "チャットを閉じる");
      btn.innerHTML = `<svg width="30" height="30" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 6 6 18M6 6l12 12" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>`;
      if (bubble) {
        bubble.style.display = "none";
      }
      iframe.focus();
    };
    const close = () => {
      panel.classList.remove("rzb-open");
      btn.setAttribute("aria-label", "チャットを開く");
      btn.innerHTML = `
    <img src="https://rizbo.dansul.jp/outline-logo.png" alt="チャットを開く" width="64" height="64" style="width: auto;"/>
  `;
      if (bubble) {
        bubble.style.display = "block";
      }
    };

    btn.addEventListener("click", () => {
      panel.classList.contains("rzb-open") ? close() : open();
    });
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && panel.classList.contains("rzb-open")) close();
    });

    // 子 → 親 連携
    const childOrigin = (() => {
      try {
        return new URL(iframe.src).origin;
      } catch {
        return "";
      }
    })();
    window.addEventListener("message", (e) => {
      if (childOrigin && e.origin !== childOrigin) return;
      const d = e.data || {};
      if (d.type === "RIZBO_CLOSE") close();
      if (d.type === "RIZBO_OPEN") open();
    });

    if (openByDefault) open();
  };

  // 実行
  main();
})();
