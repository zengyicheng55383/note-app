"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

function withTimeout<T>(p: PromiseLike<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("超时 " + ms / 1000 + " 秒"));
    }, ms);

    Promise.resolve(p).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

// 把图片压到长边 1600px 的 JPEG，通常 200-600KB
async function compressImage(file: File): Promise<File> {
  try {
    if (typeof createImageBitmap !== "function") return file;

    const bitmap = await withTimeout(createImageBitmap(file), 10000);

    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85)
    );

    if (!blob) return file;

    return new File([blob], "photo.jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export default function NewNotePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("");
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState("启动");

  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (!data.user) router.replace("/login");
      })
      .catch(() => {
        setStep("登录检查失败（网络）");
      });
  }, [router]);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const original = e.target.files?.[0];
    if (!original) return;

    setError("");
    setStep(
      "选了文件：" + original.name + " / " + Math.round(original.size / 1024) + " KB"
    );

    try {
      const compressed = await compressImage(original);

      setStep(
        "压缩后：" +
          compressed.name +
          " / " +
          Math.round(compressed.size / 1024) +
          " KB / " +
          compressed.type
      );

      setFile(compressed);
      setPreview(URL.createObjectURL(compressed));
    } catch (err) {
      setStep("处理图片出错：" + (err instanceof Error ? err.message : String(err)));
    }
  }

  async function handleSave() {
    const t = title.trim();

    if (!t) {
      setError("标题不能为空");
      return;
    }

    setBusy(true);
    setError("");

    try {
      setStep("1 检查登录…");
      const { data: userData } = await withTimeout(supabase.auth.getUser(), 15000);

      if (!userData.user) {
        router.replace("/login");
        return;
      }

      let imagePath: string | null = null;

      if (file) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = userData.user.id + "/" + Date.now() + "." + ext;

        setStep("2 上传图片…");
        const { error: uploadError } = await supabase.storage
          .from("note-images")
          .upload(path, file, { contentType: file.type || "image/jpeg" });

        if (uploadError) {
          setStep("2 上传失败：" + uploadError.message);
          setError(uploadError.message);
          setBusy(false);
          return;
        }

        imagePath = path;
        setStep("2 上传完成");
      }

      setStep("3 写入数据库…");
      const { error } = await supabase.from("notes").insert({
        user_id: userData.user.id,
        title: t,
        tag: tag.trim() || "未分类",
        content: content.trim(),
        image_path: imagePath,
      });

      if (error) {
        setStep("3 写入失败：" + error.message);
        setError(error.message);
        setBusy(false);
        return;
      }

      setStep("3 完成，返回列表");
      router.push("/");
    } catch (err) {
      const m = err instanceof Error ? err.message : String(err);
      setStep("出错：" + m);
      setError("保存失败：" + m);
      setBusy(false);
    }
  }

  return (
    <div className="app">
      <Link href="/" className="back">
        ← 返回列表
      </Link>

      <h1 className="detail-title">新建笔记</h1>

      {process.env.NODE_ENV !== "production" && (
        <p className="debug-line">调试：{step}</p>
      )}

      <div className="field">
        <input
          className="input-plain"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="标题，比如：矩阵可逆的等价条件"
        />
      </div>

      <div className="field">
        <input
          className="input-plain"
          type="text"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="科目 / 标签（可不填）"
        />
      </div>

      <div className="field">
        <textarea
          className="textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="正文…&#10;可以写多行。"
          rows={10}
        />
      </div>

      <div className="field">
        <label className="file-label">
          {file ? "换一张图片" : "📷 拍照 / 选择图片（可不选）"}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFile}
            hidden
          />
        </label>

        {preview && <img className="preview" src={preview} alt="图片预览" />}
      </div>

      {error && <p className="msg">{error}</p>}

      <button
        className="btn-new btn-block"
        type="button"
        onClick={handleSave}
        disabled={busy}
      >
        {busy ? "保存中…" : "保存"}
      </button>
    </div>
  );
}
