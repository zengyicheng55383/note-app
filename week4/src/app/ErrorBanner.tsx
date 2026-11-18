"use client";

import { useEffect, useState } from "react";

// 手机上看不到控制台，所以把 JS 报错直接显示在页面顶部。
// 排查完可以删掉这个组件。
export default function ErrorBanner() {
  const [msg, setMsg] = useState("");

  useEffect(() => {
    function onError(e: ErrorEvent) {
      setMsg(
        "JS 报错：" +
          e.message +
          (e.filename ? "  @" + e.filename.split("/").pop() : "") +
          (e.lineno ? ":" + e.lineno : "")
      );
    }

    function onRejection(e: PromiseRejectionEvent) {
      const reason = e.reason;
      setMsg(
        "未捕获的 Promise 错误：" +
          (reason && reason.message ? reason.message : String(reason))
      );
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  if (!msg) return null;

  return <pre className="js-error">{msg}</pre>;
}
