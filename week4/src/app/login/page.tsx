"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;

    setBusy(true);
    setMessage("");

    // 注册
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        setMessage(error.message);
        setBusy(false);
        return;
      }

      if (data.session) {
        router.push("/");
        return;
      }

      setMessage("注册成功！去邮箱点一下确认链接，然后回来登录。");
      setBusy(false);
      setMode("login");
      return;
    }

    // 登录
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setBusy(false);
      return;
    }

    router.push("/");
  }

  return (
    <div className="login-wrap">
      <h1 className="login-title">
        {mode === "login" ? "登录" : "注册"} · 我的笔记
      </h1>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="邮箱"
            required
          />
        </div>

        <div className="field">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="密码（至少 6 位）"
            minLength={6}
            required
          />
        </div>

        <button className="btn-new btn-block" type="submit" disabled={busy}>
          {busy ? "请稍候…" : mode === "login" ? "登录" : "注册"}
        </button>
      </form>

      {message && <p className="msg">{message}</p>}

      <p className="switch">
        {mode === "login" ? "还没有账号？" : "已经有账号？"}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setMessage("");
          }}
        >
          {mode === "login" ? "去注册" : "去登录"}
        </button>
      </p>
    </div>
  );
}
