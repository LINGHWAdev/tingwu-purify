// ==UserScript==
// @name         听悟净化·大视频模式
// @namespace    yuwen-kanke
// @version      1.4
// @description  通义听悟转写页改造：隐藏AI生成内容；视频容器定为严格16:9（播放器自动适配重排，画面满格无漂移）；中栏宽度跟随视频、笔记栏弹性吃掉剩余空间；Alt+V剧场模式。转写、笔记、导出等原生功能全部保留。
// @author       ZCode
// @match        https://tingwu.aliyun.com/doc/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  // ========== 配置（按需修改） ==========
  const VIDEO_VH = 62;    // 正常模式：视频高度上限 = 视口高度的 62%
  const THEATER_VH = 80;  // 剧场模式：视频高度上限 = 视口高度的 80%

  // ========== 1. 布局样式（纯 CSS 不变式） ==========
  // 原理：只把视频外层容器（.StickVPWrapper）用 aspect-ratio 定成严格 16:9，
  // goldplay 播放器自带 ResizeObserver，会自动按容器重新初始化全部内部图层
  // （实测：内联尺寸、画面层、控制栏都会跟随，无需也不应去改它的内部元素）。
  // 中栏宽度跟随视频；笔记栏弹性吃掉剩余宽度。
  const CSS = `
    .editorContent {
      flex: 0 1 auto !important;
      width: min(100%, calc(${VIDEO_VH}vh * 16 / 9 + 72px)) !important;
    }
    .fileEditorViewport {
      flex: 1 1 auto !important;
      min-width: 320px !important;
      width: auto !important;
      max-width: none !important;
    }
    .StickVPWrapper {
      width: min(100%, calc(${VIDEO_VH}vh * 16 / 9)) !important;
      height: auto !important;
      aspect-ratio: 16 / 9 !important;
      margin: 0 auto 16px !important;
    }
    html.tw-theater .fileEditorViewport { display: none !important; }
    html.tw-theater .editorContent {
      width: min(100%, calc(${THEATER_VH}vh * 16 / 9 + 72px)) !important;
    }
    html.tw-theater .StickVPWrapper {
      width: min(100%, calc(${THEATER_VH}vh * 16 / 9)) !important;
    }
    /* 全屏时交给原生逻辑 */
    :fullscreen .StickVPWrapper, :-webkit-full-screen .StickVPWrapper {
      width: 100% !important;
      height: 100% !important;
      aspect-ratio: auto !important;
    }
  `;

  function injectStyle() {
    if (document.getElementById("tw-style")) return;
    const st = document.createElement("style");
    st.id = "tw-style";
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  // ========== 2. 隐藏 AI 生成内容（需按文本识别，只能用 JS） ==========
  const head = (el) => (el.innerText || "").replace(/\s+/g, "");
  function isAiBlock(k) {
    const t = head(k);
    return (
      k.querySelector(".keyWord") !== null ||
      t.startsWith("全文概要") ||
      t.startsWith("章节速览") ||
      t.includes("智能内容由AI模型生成")
    );
  }
  function hideAiBlocks() {
    const kw = document.querySelector(".keyWord");
    if (!kw || !kw.parentElement || !kw.parentElement.parentElement) return;
    for (const k of Array.from(kw.parentElement.parentElement.children)) {
      if (isAiBlock(k)) k.style.setProperty("display", "none", "important");
    }
  }

  function tick() {
    try { injectStyle(); hideAiBlocks(); } catch (e) { /* 静默容错 */ }
  }

  let timer = null;
  const schedule = () => {
    if (timer) return;
    timer = setTimeout(() => { timer = null; tick(); }, 300);
  };
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  setInterval(tick, 2000); // 兜底：页面重渲染后重新隐藏 AI 块

  // ========== 3. Alt+V 剧场模式 ==========
  document.addEventListener("keydown", (e) => {
    if (e.altKey && (e.key === "v" || e.key === "V")) {
      e.preventDefault();
      const on = document.documentElement.classList.toggle("tw-theater");
      showToast(on ? "剧场模式：视频最大化（Alt+V 返回）" : "正常模式：笔记栏已恢复");
    }
  });

  function showToast(msg) {
    const t = document.createElement("div");
    t.textContent = msg;
    Object.assign(t.style, {
      position: "fixed", top: "16px", left: "50%", transform: "translateX(-50%)",
      background: "rgba(0,0,0,.75)", color: "#fff", padding: "8px 18px",
      borderRadius: "8px", fontSize: "13px", zIndex: "99999",
      transition: "opacity .3s", pointerEvents: "none",
    });
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; }, 1600);
    setTimeout(() => t.remove(), 2000);
  }

  tick();
})();
