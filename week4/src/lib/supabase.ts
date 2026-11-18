import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    "缺少 Supabase 环境变量：检查 week4/.env.local 的两个值，改完必须重启 npm run dev"
  );
}

export const supabase = createClient(url, key);
