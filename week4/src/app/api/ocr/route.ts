import { NextResponse } from "next/server";

// 默认候选模型：按顺序尝试，前一个不可用就换下一个
const DEFAULT_MODELS = [
  "Qwen/Qwen3-VL-8B-Instruct",
  "Qwen/Qwen3-VL-32B-Instruct",
  "Qwen/Qwen2.5-VL-7B-Instruct",
  "Qwen/Qwen2.5-VL-32B-Instruct",
];

// GET /api/ocr  →  列出这个 Key 能用的视觉模型（浏览器直接打开就能看）
export async function GET() {
  const key = process.env.SILICONFLOW_API_KEY;
  if (!key) {
    return NextResponse.json({ error: "缺少 SILICONFLOW_API_KEY" }, { status: 500 });
  }

  try {
    const res = await fetch("https://api.siliconflow.cn/v1/models", {
      headers: { Authorization: "Bearer " + key },
    });
    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: "获取模型列表失败", raw: data }, { status: 500 });
    }

    const list = Array.isArray(data?.data) ? data.data : [];
    const ids = list
      .map((m: { id?: string }) => m.id ?? "")
      .filter((id: string) => /vl|vision|glm-4\.\d?v/i.test(id));

    return NextResponse.json({
      count: ids.length,
      models: ids,
      hint: "把上面任意一个填进 .env.local 的 SILICONFLOW_VL_MODEL",
    });
  } catch (e) {
    return NextResponse.json(
      { error: "请求失败：" + (e instanceof Error ? e.message : String(e)) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const imageUrl = body?.imageUrl;

    if (!imageUrl) {
      return NextResponse.json({ error: "缺少图片地址" }, { status: 400 });
    }

    const key = process.env.SILICONFLOW_API_KEY;
    if (!key) {
      return NextResponse.json(
        { error: "服务端缺少 SILICONFLOW_API_KEY，检查 .env.local 并重启" },
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
          temperature: 0.1,
          max_tokens: 2000,
          messages: [
            {
              role: "user",
              content: [
                { type: "image_url", image_url: { url: imageUrl } },
                {
                  type: "text",
                  text: [
                    "你是 OCR 助手。请把图片里的笔记内容逐字识别成文字。",
                    "要求：",
                    "1. 只用图片里真实存在的内容，不要总结、不要改写、不要补充。",
                    "2. 尽量保留原有的分点、编号、换行层次。",
                    "3. 数学公式用普通文字或符号近似表示。",
                    "4. 看不清的字用 [?] 代替。",
                    "5. 只输出识别结果，不要加任何解释。",
                  ].join("\n"),
                },
              ],
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
        tried.push({ model, error: "模型没有返回文字" });
        continue;
      }

      return NextResponse.json({ text, model });
    }

    return NextResponse.json(
      {
        error: "所有候选模型都不可用。打开 /api/ocr 看看你账号能用哪个模型，填进 SILICONFLOW_VL_MODEL",
        tried,
      },
      { status: 500 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: "服务端出错：" + (e instanceof Error ? e.message : String(e)) },
      { status: 500 }
    );
  }
}
