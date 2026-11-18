import { NextResponse } from "next/server";

const DEFAULT_MODELS = [
  "Qwen/Qwen3-VL-8B-Instruct",
  "Qwen/Qwen3-VL-32B-Instruct",
];

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

// POST /api/quiz  { points: string[] }  →  { questions: {q,a}[] }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const points = Array.isArray(body?.points)
      ? body.points.filter((p: unknown) => typeof p === "string" && p.trim()).slice(0, 15)
      : [];

    if (points.length === 0) {
      return NextResponse.json({ error: "没有知识点，先提取再出题" }, { status: 400 });
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
          temperature: 0.4,
          max_tokens: 2000,
          messages: [
            {
              role: "system",
              content: [
                "你是一位会给大学生出复习题的助教。",
                "针对每一条知识点，出一道简答题，帮助学生真正理解而不是背原句。",
                "",
                "出题要求：",
                "1. 题目要问「为什么」「怎么算」「有什么区别」，不要只是「X 是什么」。",
                "2. 答案控制在 1-3 句话，必须和知识点一致，不许编造。",
                "3. 公式和符号原样保留。",
                "4. 每个知识点对应一道题，不要重复，不要多出。",
                "",
                '只输出一个 JSON 数组，每个元素形如 {"q": "题目", "a": "答案"}。',
                "不要输出任何其他文字，不要用 ```json 包裹。",
              ].join("\n"),
            },
            {
              role: "user",
              content:
                "知识点：\n" +
                points.map((p: string, i: number) => i + 1 + ". " + p).join("\n"),
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
        const questions = arr
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const q = String((item as { q?: unknown }).q ?? "").trim();
            const a = String((item as { a?: unknown }).a ?? "").trim();
            if (!q || !a) return null;
            return { q, a };
          })
          .filter((x): x is { q: string; a: string } => x !== null);

        if (questions.length === 0) {
          tried.push({ model, error: "生成结果为空" });
          continue;
        }

        return NextResponse.json({ questions, model });
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
