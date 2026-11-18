import { NextResponse } from "next/server";

const DEFAULT_MODELS = [
  "Qwen/Qwen3-VL-8B-Instruct",
  "Qwen/Qwen3-VL-32B-Instruct",
  "Qwen/Qwen2.5-VL-7B-Instruct",
];

// POST /api/organize  { text }  →  { text, model }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const source = typeof body?.text === "string" ? body.text.trim() : "";

    if (!source) {
      return NextResponse.json({ error: "没有可整理的文字" }, { status: 400 });
    }

    if (source.length > 8000) {
      return NextResponse.json(
        { error: "文字太长了（超过 8000 字），先分几次整理" },
        { status: 400 }
      );
    }

    const key = process.env.SILICONFLOW_API_KEY;
    if (!key) {
      return NextResponse.json(
        { error: "服务端缺少 SILICONFLOW_API_KEY" },
        { status: 500 }
      );
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
          temperature: 0.2,
          max_tokens: 2000,
          messages: [
            {
              role: "system",
              content: [
                "你是严谨的笔记整理助手，服务对象是中国的大学生。",
                "你的任务是把手写笔记的识别结果整理成结构清晰、便于复习的文字。",
                "",
                "必须遵守：",
                "1. 绝不新增原文没有的信息。原文没写的知识点，一个字都不要补。",
                "2. 无法辨认的地方保留 [?]，不要用猜测填空。",
                "3. 保留专业术语、公式、代码符号的原样（比如 2^-2、\\n、++）。",
                "4. 修正明显的识别错字（形近字、同音字），但不得改变原意。",
                "5. 用编号或分点组织，让层次一眼可见。",
                "6. 直接输出整理后的正文，不要开场白、不要总结陈词、不要解释你做了什么。",
              ].join("\n"),
            },
            {
              role: "user",
              content: "下面是识别出来的原始笔记，请整理：\n\n" + source,
            },
          ],
        }),
      });

      const raw = await res.text();

      if (!res.ok) {
        tried.push({ model, error: raw.slice(0, 200) });
        continue;
      }

      let text = "";
      try {
        const data = JSON.parse(raw);
        text = data?.choices?.[0]?.message?.content ?? "";
      } catch {
        tried.push({ model, error: "返回格式无法解析" });
        continue;
      }

      if (!text.trim()) {
        tried.push({ model, error: "模型没有返回内容" });
        continue;
      }

      return NextResponse.json({ text, model });
    }

    return NextResponse.json(
      { error: "所有候选模型都不可用", tried },
      { status: 500 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: "服务端出错：" + (e instanceof Error ? e.message : String(e)) },
      { status: 500 }
    );
  }
}
