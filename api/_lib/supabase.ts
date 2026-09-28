// Acesso à API REST do Supabase a partir das Vercel Functions.
// A chave é a publishable (anon), a mesma que já vai no bundle do front,
// então o fallback aqui não expõe nada novo; ele evita que as funções
// quebrem se as variáveis VITE_* não estiverem cadastradas no painel da Vercel.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || "https://iyijnxplswxeezhkowpn.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5aWpueHBsc3d4ZWV6aGtvd3BuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwNTM3MTksImV4cCI6MjA3NjYyOTcxOX0.TznqGMSNBZreyieLWlOopgGZsSHtTQDweXn60N11AnA";

export const SITE_URL = "https://www.luandefm.net";

export const supabaseRest = async <T>(path: string, init: { range?: [number, number] } = {}): Promise<T> => {
  const headers: Record<string, string> = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  };

  if (init.range) {
    headers["Range-Unit"] = "items";
    headers.Range = `${init.range[0]}-${init.range[1]}`;
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers });

  if (!response.ok) {
    throw new Error(`Supabase ${response.status}: ${await response.text()}`);
  }

  return response.json() as Promise<T>;
};

export const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
