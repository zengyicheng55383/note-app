import { NextResponse } from "next/server";

const DEFAULT_MODELS = [
  "Qwen/Qwen3-VL-8B-Instruct",
  "Qwen/Qwen3-VL-32B-Instruct",
];

// 从模型输出里抠出 JSON 数组（模型经常包在 ```json 里）
function extractArray(text: string): unknown[] {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("没有找到 JSON 数组");
  }

  const parsed = JSON.parse(text.slice(start, end + 1));

  if (!Array.isArray(parsed)) {
    throw new Error("返回的不是数组");
  }

  return parsed;
}

// POST /api/points  { text }  →  { points: string[] }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const source = typeof body?.text === "string" ? body.text.trim() : "";

    if (!source) {
      return NextResponse.json({ error: "没有可抽取的文字" }, { status: 400 });
    }

    if (source.length > 8000) {
      return NextResponse.json(
        { error: "文字太长了（超过 8000 字），先分几次处理" },
        { status: 400 }
      );
    }

    const key = process.env.SILICONFLOW_API_KEY;
    if (!key) {
      return NextResponse.json({ error: "服务端缺少 SILICONFLOW_API_KEY" }, { status: 500 });
    }

    const preferred = process.env.SILICONFLOW_VL_MODEL;
    const models = Array.from(
      new Set([preferred, ...DEFAULT_MODELS].filter(Boolean) as string[])
    );

    const tried: { model: string; error: string }[] = [];

    for (const model of models) {
      const res = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + key,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          max_tokens: 1500,
          messages: [
            {
              role: "system",
              content: [
                "你是帮大学生整理复习资料的知识点抽取器。",
                "从给定笔记中抽出可以单独拿出来考自己的知识点。",
                "",
                "每条知识点必须满足：",
                "1. 是一句独立、完整、脱离上下文也看得懂的陈述。",
                "2. 只讲一件事。不要写「本章讲了X」这种概括。",
                "3. 是可以在原文中找到依据的，不许编造。",
                "4. 保留公式、符号、术语的本来写法。",
                "5. 5 到 15 条，太少说明抽得不够，太多说明拆得太碎。",
                "",
                '只输出一个 JSON 数组，每个元素形如 {"statement": "知识点内容"}。',
                "不要输出任何其他文字，不要用 ```json 包裹。",
              ].join("\n"),
            },
            {
              role: "user",
              content: "笔记内容：\n\n" + source,
            },
          ],
        }),
      });

      const raw = await res.text();

      if (!res.ok) {
        tried.push({ model, error: raw.slice(0, 200) });
        continue;
      }

      let content = "";
      try {
        const data = JSON.parse(raw);
        content = data?.choices?.[0]?.message?.content ?? "";
      } catch {
        tried.push({ model, error: "返回格式无法解析" });
        continue;
      }

      try {
        const arr = extractArray(content);
        const points = arr
          .map((item) => {
            if (typeof item === "string") return item.trim();
            if (item && typeof item === "object" && "statement" in item) {
              return String((item as { statement: unknown }).statement).trim();
            }
            return "";
          })
          .filter((s) => s.length > 0);

        if (points.length === 0) {
          tried.push({ model, error: "抽出来是空的" });
          continue;
        }

        return NextResponse.json({ points, model });
      } catch (e) {
        tried.push({
          model,
          error: "JSON 解析失败：" + (e instanceof Error ? e.message : String(e)),
        });
        continue;
      }
    }

    return NextResponse.json({ error: "所有候选模型都不可用", tried }, { status: 500 });
  } catch (e) {
    return NextResponse.json(
      { error: "服务端出错：" + (e instanceof Error ? e.message : String(e)) },
      { status: 500 }
    );
  }
}
