(() => {
  const s = document.currentScript;
  if (!s) return;

  // 設定
  const school = s.dataset.school || "";
  const theme = s.dataset.theme || "light";
  const side = s.dataset.side || "right"; // left | right
  const openByDefault = s.dataset.open === "true";
  const width = parseInt(s.dataset.width || "380", 10);
  const height = parseInt(s.dataset.height || "520", 10);

  // origin / path
  let autoOrigin = location.origin;
  try {
    autoOrigin = new URL(s.src).origin;
  } catch {}
  const origin = s.dataset.origin || autoOrigin;
  const path = s.dataset.path || "/embed/chatbot";
  const src = `${origin}${path}?${new URLSearchParams({
    school,
    theme,
    v: "2025-09-09",
    mode: "bubble",
  })}`;

  // スタイル（衝突しにくい接頭辞）
  const css = `
  .rzb-launcher{position:fixed; z-index:2147483000; width:56px;height:56px;border-radius:50%;
    background:#2f5c7a;color:#fff;display:flex;align-items:center;justify-content:center;
    box-shadow:0 10px 30px rgba(0,0,0,.25); cursor:pointer; border:none}
  .rzb-launcher.rzb-right{right:24px;bottom:24px} .rzb-launcher.rzb-left{left:24px;bottom:24px}
  .rzb-panel{position:fixed; z-index:2147483001; background:#fff; overflow:hidden;
    width:${width}px; height:${height}px; border-radius:16px; box-shadow:0 20px 50px rgba(0,0,0,.25);
    display:none}
  .rzb-panel.rzb-open{display:block}
  .rzb-panel.rzb-right{right:24px;bottom:96px} .rzb-panel.rzb-left{left:24px;bottom:96px}
  .rzb-iframe{width:100%;height:100%;border:none;display:block}
  @media (max-width:640px){
    .rzb-panel{right:0!important;left:0!important;bottom:0!important;width:100%!important;
      height:calc(100dvh - 16px)!important; border-radius:12px 12px 0 0}
    .rzb-launcher{right:16px!important;left:auto!important;bottom:16px!important}
  }`;
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);

  // ランチャー
  const btn = document.createElement("button");
  btn.className = `rzb-launcher rzb-${side}`;
  btn.setAttribute("aria-label", "チャットを開く");
  btn.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
      xmlns="http://www.w3.org/2000/svg">
      <path d="M21 12c0 4.418-4.03 8-9 8-1.04 0-2.04-.14-2.97-.4L3 21l1.46-4.38C3.55 15.18 3 13.65 3 12c0-4.42 4.03-8 9-8s9 3.58 9 8Z" stroke="white" stroke-width="2" />
    </svg>
  `;

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
  document.body.appendChild(btn);

  // 開閉
  const open = () => {
    panel.classList.add("rzb-open");
    btn.setAttribute("aria-label", "チャットを閉じる");
    // ランチャーを「×」風に
    btn.innerHTML = `<svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 6 6 18M6 6l12 12" stroke="white" stroke-width="2" stroke-linecap="round"/></svg>`;
    iframe.focus();
  };
  const close = () => {
    panel.classList.remove("rzb-open");
    btn.setAttribute("aria-label", "チャットを開く");
    btn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
        xmlns="http://www.w3.org/2000/svg">
        <path d="M21 12c0 4.418-4.03 8-9 8-1.04 0-2.04-.14-2.97-.4L3 21l1.46-4.38C3.55 15.18 3 13.65 3 12c0-4.42 4.03-8 9-8s9 3.58 9 8Z" stroke="white" stroke-width="2" />
      </svg>`;
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
})();
