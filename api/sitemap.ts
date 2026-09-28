import { SITE_URL, escapeHtml, supabaseRest } from "./_lib/supabase.js";

// Sitemap gerado a partir do banco: todas as matérias publicadas + páginas fixas + categorias.
// O PostgREST limita cada resposta a 1000 linhas, por isso a paginação via Range.
const PAGE_SIZE = 1000;

interface ArticleRow {
  slug: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface CategoryRow {
  slug: string;
}

const STATIC_PAGES = ["/eventos", "/videos", "/sobre-nos", "/contato", "/enviar-noticia"];

const loadArticles = async () => {
  const articles: ArticleRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const page = await supabaseRest<ArticleRow[]>(
      "articles?select=slug,created_at,updated_at&published=eq.true&slug=not.is.null&order=created_at.desc",
      { range: [from, from + PAGE_SIZE - 1] },
    );

    articles.push(...page);
    if (page.length < PAGE_SIZE) return articles;
  }
};

const urlEntry = (path: string, lastmod?: string | null) =>
  `  <url><loc>${escapeHtml(`${SITE_URL}${path}`)}</loc>${lastmod ? `<lastmod>${new Date(lastmod).toISOString()}</lastmod>` : ""}</url>`;

export async function GET() {
  try {
    const [articles, categories] = await Promise.all([
      loadArticles(),
      supabaseRest<CategoryRow[]>("categories?select=slug&is_active=eq.true"),
    ]);

    const entries = [
      urlEntry("/", articles[0]?.created_at),
      ...categories.map((category) => urlEntry(`/categoria/${encodeURIComponent(category.slug)}`)),
      ...STATIC_PAGES.map((path) => urlEntry(path)),
      ...articles.map((article) =>
        urlEntry(`/artigo/${encodeURIComponent(article.slug)}`, article.updated_at || article.created_at),
      ),
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join("\n")}\n</urlset>\n`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Erro ao gerar sitemap:", error);
    return new Response("Erro ao gerar sitemap", { status: 500 });
  }
}
