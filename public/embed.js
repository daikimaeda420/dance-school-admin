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

  // paletteごとのボタンカラー
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
  const diagnosisPath = "/embed/diagnosis"; // 診断ページのパス

  // メイン処理を async で定義
  const main = async () => {
    // DB から設定を取得
    let paletteFromDb = "gray";
    let launcherTextFromDb = "質問はコチラ";
    let chatEnabled = true;
    let diagnosisEnabled = false;

    try {
      const url = `${origin}/api/faq?${new URLSearchParams({
        school,
      }).toString()}`;

      const res = await fetch(url, { credentials: "omit" });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === "object") {
          if (typeof data.palette === "string") {
            const p = data.palette.toLowerCase();
            if (paletteColorMap[p]) paletteFromDb = p;
          }
          if (typeof data.launcherText === "string" && data.launcherText.trim()) {
            launcherTextFromDb = data.launcherText.trim();
          }
          if (typeof data.chatEnabled === "boolean") {
            chatEnabled = data.chatEnabled;
          }
          if (typeof data.diagnosisEnabled === "boolean") {
            diagnosisEnabled = data.diagnosisEnabled;
          }
        }
      } else {
        console.warn("[rizbo] /api/faq 取得に失敗しました", res.status);
      }
    } catch (e) {
      console.warn("[rizbo] /api/faq 取得中にエラー", e);
    }

    const palette = paletteFromDb;
    const color = paletteColorMap[palette] || paletteColorMap["gray"];

    // スタイル定義
    const css = `
      .rzb-widget-container {
        position: fixed;
        z-index: 2147483000;
        bottom: 24px;
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 16px;
        pointer-events: none; /* コンテナ自体はクリック透過 */
      }
      .rzb-widget-container.rzb-right { right: 24px; flex-direction: row-reverse; }
      .rzb-widget-container.rzb-left { left: 24px; flex-direction: row; }

      /* チャットランチャー */
      .rzb-launcher {
        position: relative;
        width: 56px; height: 56px; border-radius: 50%;
        background: ${color}; color: #fff;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; border: none;
        pointer-events: auto;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transition: transform 0.2s ease;
      }
      .rzb-launcher:hover { transform: scale(1.05); }
      .rzb-launcher img { filter: drop-shadow(0px 0px 4px rgba(0, 0, 0, 0.42)); }
    
      /* 吹き出し */
      .rzb-launcher-bubble {
        position: absolute;
        bottom: 64px;
        right: -10px;
        transform-origin: 100% 100%;
        background: #ffffff;
        color: #111827;
        font-size: 12px; font-weight: 600;
        padding: 6px 10px;
        border-radius: 999px;
        white-space: nowrap;
        box-shadow: 0 6px 16px rgba(0,0,0,0.18);
        border: 1px solid rgba(15,23,42,0.06);
        animation: rzbTalk 3s ease-in-out infinite;
        pointer-events: auto;
      }
      .rzb-widget-container.rzb-left .rzb-launcher-bubble {
        right: auto; left: 0; transform-origin: 0% 100%;
      }
      .rzb-launcher-bubble::after {
        content: ""; position: absolute; bottom: -6px; right: 14px;
        border-width: 6px 6px 0 6px; border-style: solid;
        border-color: #ffffff transparent transparent transparent;
        filter: drop-shadow(0px 1px 1px rgba(0,0,0,0.1));
      }
      .rzb-widget-container.rzb-left .rzb-launcher-bubble::after {
        right: auto; left: 14px;
      }

      /* 診断バナー (丸型バッジ風) */
      .rzb-diagnosis-banner {
        pointer-events: auto;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        width: 170px; height: 170px;
        background: #fff;
        border: 7px solid #4b4b4b; /* ダークグレーの太枠 */
        border-radius: 50%; /* 完全な正円 */
        text-decoration: none;
        box-shadow: 0 8px 16px rgba(0,0,0,0.12);
        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        cursor: pointer;
        line-height: 1.2;
        gap: 3px;
        box-sizing: border-box;
      }
      .rzb-diagnosis-banner:hover {
        transform: translateY(-4px) scale(1.03);
        box-shadow: 0 12px 24px rgba(0,0,0,0.18);
      }
      
      /* バナー内テキスト 共通・個別調整 */
      .rzb-badge-text-top {
        color: #6b7280; /* グレー */
        font-size: 14px;
        font-weight: 700;
        margin-bottom: 2px;
      }
      .rzb-badge-text-sub {
        color: #1f2937;
        font-size: 10px;
        font-weight: 800;
        margin-bottom: 4px;
      }
      .rzb-badge-marker {
        background: linear-gradient(transparent 60%, rgba(253, 224, 71, 0.8) 60%);
        padding: 0 2px;
        color: #ea580c;
      }
      .rzb-badge-text-main {
        color: #ea580c;
        font-size: 16px;
        font-weight: 900;
        letter-spacing: -0.02em;
        line-height: 1.1;
      }
      .rzb-badge-text-large {
        color: #ea580c;
        font-size: 22px;
        font-weight: 900;
        margin-top: 1px;
        margin-bottom: 4px;
        letter-spacing: 0.05em;
      }

      /* 診断スタートボタン風要素 */
      .rzb-diagnosis-start-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 2px;
        padding: 4px 14px;
        background: #ea580c;
        color: #fff;
        font-size: 11px;
        font-weight: 900;
        border-radius: 999px;
      }
      .rzb-diagnosis-start-btn svg {
        width: 10px;
        height: 10px;
        fill: currentColor;
      }

      @keyframes rzbTalk {
        0%,60%,100% { transform: scale(0.96) translateY(0); opacity: 0.6; }
        10%,30% { transform: scale(1) translateY(-2px); opacity: 1; }
      }

      /* チャットパネル */
      .rzb-panel {
        position: fixed; z-index: 2147483001; background: #fff; overflow: hidden;
        width: ${width}px; height: ${height}px; border-radius: 16px; box-shadow: 0 20px 50px rgba(0,0,0,.25);
        display: none;
      }
      .rzb-panel.rzb-open { display: block; }
      .rzb-panel.rzb-right { right: 24px; bottom: 96px; }
      .rzb-panel.rzb-left { left: 24px; bottom: 96px; }
      .rzb-iframe { width: 100%; height: 100%; border: none; display: block; }

      @media (max-width: 640px) {
        .rzb-panel {
          right: 0!important; left: 0!important; bottom: 0!important; width: 100%!important;
          height: calc(100dvh - 16px)!important; border-radius: 12px 12px 0 0;
        }
        .rzb-widget-container {
          right: 16px!important; left: auto!important; bottom: 16px!important;
          flex-direction: column-reverse; /* モバイルでは縦並び */
          align-items: flex-end;
          gap: 12px;
        }
        .rzb-widget-container.rzb-left {
          right: auto!important; left: 16px!important;
          align-items: flex-start;
        }
      }
    `;

    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    // コンテナ作成
    const container = document.createElement("div");
    container.className = `rzb-widget-container rzb-${side}`;

    let panel = null;
    let btn = null;
    let iframe = null;
    let bubble = null;

    // --- チャットボット (chatEnabled) ---
    if (chatEnabled) {
      // ランチャーボタン
      btn = document.createElement("button");
      btn.className = `rzb-launcher`;
      btn.setAttribute("aria-label", "チャットを開く");
      btn.innerHTML = `
        <img src="https://rizbo.dansul.jp/outline-logo.png"
          alt="チャットを開く" width="64" height="64" style="width: auto;"/>
      `;

      // 吹き出し
      if (launcherTextFromDb && launcherTextFromDb.trim()) {
        const b = document.createElement("div");
        b.className = "rzb-launcher-bubble";
        b.textContent = launcherTextFromDb;
        bubble = b;
        // ランチャーボタンの中に吹き出しを入れる構造に変更も考えられるが、
        // 既存CSSに合わせて container 直下 or ラッパー制御が必要
        // ここではランチャーボタンと一緒にラップして扱うか、Absolute配置で調整
        // 既存CSSは `.rzb-launcher-bubble` が絶対配置なので、
        // ボタンをラップするdivを作ってそこに入れるのが無難だが、
        // 今回は container が flex なので、ボタンと一緒に配置するためのラッパーを作る
        
        const launcherWrap = document.createElement("div");
        launcherWrap.style.position = "relative";
        launcherWrap.style.pointerEvents = "auto";
        launcherWrap.appendChild(btn);
        launcherWrap.appendChild(b);
        container.appendChild(launcherWrap);
      } else {
         const launcherWrap = document.createElement("div");
         launcherWrap.style.position = "relative";
         launcherWrap.style.pointerEvents = "auto";
         launcherWrap.appendChild(btn);
         container.appendChild(launcherWrap);
      }

      // パネル
      panel = document.createElement("div");
      panel.className = `rzb-panel rzb-${side}`;
      iframe = document.createElement("iframe");
      iframe.className = "rzb-iframe";
      
      const iframeSrc = `${origin}${path}?${new URLSearchParams({
        school,
        theme,
        palette,
        v: "2025-11-19",
        mode: "bubble",
      }).toString()}`;
      
      iframe.src = iframeSrc;
      iframe.setAttribute(
        "sandbox",
        [
          "allow-forms", "allow-popups", "allow-scripts", "allow-same-origin",
          "allow-downloads", "allow-popups-to-escape-sandbox"
        ].join(" ")
      );
      iframe.setAttribute("allow", "clipboard-write; fullscreen");
      panel.appendChild(iframe);
      document.body.appendChild(panel);

      // 開閉ロジック
      const open = () => {
        panel.classList.add("rzb-open");
        btn.setAttribute("aria-label", "チャットを閉じる");
        btn.innerHTML = `<svg width="30" height="30" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 6 6 18M6 6l12 12" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>`;
        if (bubble) bubble.style.display = "none";
        iframe.focus();
      };
      const close = () => {
        panel.classList.remove("rzb-open");
        btn.setAttribute("aria-label", "チャットを開く");
        btn.innerHTML = `
          <img src="https://rizbo.dansul.jp/outline-logo.png" alt="チャットを開く" width="64" height="64" style="width: auto;"/>
        `;
        if (bubble) bubble.style.display = "block";
      };

      btn.addEventListener("click", () => {
        panel.classList.contains("rzb-open") ? close() : open();
      });
      window.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && panel && panel.classList.contains("rzb-open")) close();
      });

      // 子 → 親 連携
      const childOrigin = (() => {
        try { return new URL(iframe.src).origin; } catch { return ""; }
      })();
      window.addEventListener("message", (e) => {
        if (childOrigin && e.origin !== childOrigin) return;
        const d = e.data || {};
        if (d.type === "RIZBO_CLOSE") close();
        if (d.type === "RIZBO_OPEN") open();
      });

      if (openByDefault) open();
    }

    // --- 診断バナー (diagnosisEnabled) ---
    if (diagnosisEnabled) {
      const banner = document.createElement("a");
      banner.className = "rzb-diagnosis-banner";
      banner.href = `${origin}${diagnosisPath}?schoolId=${encodeURIComponent(school)}`;
      banner.target = "_blank";
      banner.rel = "noopener noreferrer";
      banner.innerHTML = `
        <span class="rzb-badge-text-top">簡単30秒!</span>
        <span class="rzb-badge-text-sub"><span class="rzb-badge-marker">おすすめのレッスン</span>をご紹介!</span>
        <span class="rzb-badge-text-main">ダンスレッスン</span>
        <span class="rzb-badge-text-large">診断</span>
        <span class="rzb-diagnosis-start-btn">
          診断スタート
          <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </span>
      `;
      
      const bannerContainer = document.createElement("div");
      bannerContainer.className = "rzb-widget-container rzb-left";
      bannerContainer.appendChild(banner);
      document.body.appendChild(bannerContainer);
    }

    // ウィジェットコンテナをbodyに追加 (中身がある場合のみ)
    if (container.hasChildNodes()) {
      document.body.appendChild(container);
    }
  };

  main();
})();
