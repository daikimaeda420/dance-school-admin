(() => {
  const s = document.currentScript;
  if (!s) return;

  // データ属性
  const school = s.dataset.school || "";
  const theme = s.dataset.theme || "";
  const width = s.dataset.width || "100%";
  const height = s.dataset.height || ""; // 例: "600" or "600px"
  const minHeight = s.dataset.minHeight || "300";

  // 自ドメイン（embed.jsの配信元）を自動取得。手動で上書きしたい場合は data-origin を使う
  let autoOrigin = location.origin;
  try {
    autoOrigin = new URL(s.src).origin;
  } catch {}
  const origin = s.dataset.origin || autoOrigin;

  // 埋め込む先のパス
  const path = s.dataset.path || "/embed/chatbot";

  // ラッパ生成
  const wrapper = document.createElement("div");
  wrapper.style.width = width;
  wrapper.style.maxWidth = "100%";

  // iframe 生成
  const iframe = document.createElement("iframe");
  const params = new URLSearchParams({ school, theme, v: "2025-09-09" }); // v はキャッシュバスター
  iframe.src = `${origin}${path}?${params.toString()}`;
  iframe.style.width = "100%";
  iframe.style.border = "none";
  iframe.style.display = "block";
  iframe.setAttribute("loading", "lazy");

  // 初期高さ
  if (height) {
    iframe.style.height = /^\d+$/.test(height) ? `${height}px` : height;
  } else {
    iframe.style.height = `${minHeight}px`;
  }

  // セキュリティ
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

  // DOM 挿入
  s.parentNode && s.parentNode.insertBefore(wrapper, s.nextSibling);
  wrapper.appendChild(iframe);

  const childOrigin = (() => {
    try {
      return new URL(iframe.src).origin;
    } catch {
      return "";
    }
  })();
  const minH = parseInt(minHeight, 10) || 300;

  // 親で高さ更新
  const setHeight = (h) => {
    const px = Math.max(h, minH);
    iframe.style.height = px + "px";
  };

  // postMessage 受信
  const onMsg = (e) => {
    if (childOrigin && e.origin !== childOrigin) return; // セキュリティチェック
    const d = e.data;
    if (!d || typeof d !== "object") return;
    if (d.type === "RIZBO_RESIZE" && typeof d.height === "number") {
      setHeight(d.height);
    }
  };
  window.addEventListener("message", onMsg);
})();
