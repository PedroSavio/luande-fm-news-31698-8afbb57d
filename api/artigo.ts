import { SITE_URL, escapeHtml, supabaseRest } from "./_lib/supabase.js";

// Pré-renderização das matérias. O site é uma SPA: sem isso o Googlebot recebe um
// <div id="root"></div> vazio e só vê o conteúdo se executar o JS, o que causa o
// "Rastreada, mas não indexada" em massa no Search Console.
//
// Aqui o index.html gerado pelo Vite recebe título, meta tags, canonical, JSON-LD e
// o texto da matéria dentro do #root. Todo visitante recebe o mesmo HTML (não é
// cloaking); quando o bundle carrega, o React substitui o conteúdo do #root pela SPA.

const DEFAULT_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/j5I1wDmykQduHQAkT4lnKyPxmha2/social-images/social-1763673242461-4444.png";
const LOGO_URL =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/j5I1wDmykQduHQAkT4lnKyPxmha2/uploads/1763088643534-5522.png";
const SITE_NAME = "Portal Luandê Notícias";

interface ArticleRow {
  title: string;
  subtitle: string | null;
  content: string;
  category: string;
  image_url: string | null;
  image_description: string | null;
  created_at: string | null;
  updated_at: string | null;
  slug: string;
  journalist_name: string | null;
  tags: string[] | null;
}

let cachedTemplate: string | null = null;

// O index.html é estático e servido pela própria Vercel; busca uma vez por instância.
const loadTemplate = async (origin: string) => {
  if (cachedTemplate) return cachedTemplate;

  const response = await fetch(`${origin}/index.html`);
  if (!response.ok) throw new Error(`index.html ${response.status}`);

  cachedTemplate = await response.text();
  return cachedTemplate;
};

const stripHtml = (html: string) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

const truncate = (text: string, max: number) => (text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`);

const setTitle = (html: string, title: string) =>
  html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`);

// Troca o content de uma <meta name|property="key">, ou cria a tag se não existir.
const setMeta = (html: string, key: string, content: string) => {
  const attr = key.startsWith("og:") || key.startsWith("article:") ? "property" : "name";
  const pattern = new RegExp(`<meta\\s+(?:name|property)="${key}"[^>]*>`, "g");
  const tag = `<meta ${attr}="${key}" content="${escapeHtml(content)}">`;

  if (pattern.test(html)) return html.replace(pattern, tag);
  return html.replace("</head>", `  ${tag}\n</head>`);
};

const setCanonical = (html: string, url: string) => {
  const tag = `<link rel="canonical" href="${escapeHtml(url)}" />`;
  const pattern = /<link\s+rel="canonical"[^>]*>/g;

  if (pattern.test(html)) return html.replace(pattern, tag);
  return html.replace("</head>", `  ${tag}\n</head>`);
};

const addToHead = (html: string, snippet: string) => html.replace("</head>", `  ${snippet}\n</head>`);

const fillRoot = (html: string, body: string) =>
  html.replace(/<div id="root">\s*<\/div>/, `<div id="root">${body}</div>`);

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });

const renderArticleBody = (article: ArticleRow) => {
  const author = article.journalist_name || "Redação LuandêFM";
  const tags = article.tags?.length
    ? `<ul>${article.tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join("")}</ul>`
    : "";

  return `
    <header><a href="/">${SITE_NAME}</a></header>
    <main>
      <article>
        <p>${escapeHtml(article.category)}</p>
        <h1>${escapeHtml(article.title)}</h1>
        ${article.subtitle ? `<p>${escapeHtml(article.subtitle)}</p>` : ""}
        <p>Por ${escapeHtml(author)}${article.created_at ? ` · <time datetime="${article.created_at}">${formatDate(article.created_at)}</time>` : ""}</p>
        ${article.image_url ? `<figure><img src="${escapeHtml(article.image_url)}" alt="${escapeHtml(article.image_description || article.title)}">${article.image_description ? `<figcaption>${escapeHtml(article.image_description)}</figcaption>` : ""}</figure>` : ""}
        <div>${article.content}</div>
        ${tags}
      </article>
    </main>`;
};

const renderJsonLd = (article: ArticleRow, url: string, description: string) => {
  const data = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    headline: truncate(article.title, 110),
    description,
    image: [article.image_url || DEFAULT_IMAGE],
    datePublished: article.created_at,
    dateModified: article.updated_at || article.created_at,
    articleSection: article.category,
    keywords: article.tags?.join(", ") || undefined,
    author: article.journalist_name
      ? { "@type": "Person", name: article.journalist_name }
      : { "@type": "Organization", name: "Redação LuandêFM", url: SITE_URL },
    publisher: {
      "@type": "NewsMediaOrganization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: { "@type": "ImageObject", url: LOGO_URL },
    },
  };

  // "<" escapado para o conteúdo não conseguir fechar a tag <script>.
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`;
};

const renderArticle = (template: string, article: ArticleRow) => {
  const url = `${SITE_URL}/artigo/${encodeURIComponent(article.slug)}`;
  const title = `${article.title} - ${SITE_NAME}`;
  const description = truncate(article.subtitle || stripHtml(article.content) || article.title, 160);
  const image = article.image_url || DEFAULT_IMAGE;

  let html = setTitle(template, title);
  html = setCanonical(html, url);
  html = setMeta(html, "description", description);
  html = setMeta(html, "og:type", "article");
  html = setMeta(html, "og:url", url);
  html = setMeta(html, "og:title", article.title);
  html = setMeta(html, "og:description", description);
  html = setMeta(html, "og:image", image);
  html = setMeta(html, "twitter:card", "summary_large_image");
  html = setMeta(html, "twitter:title", article.title);
  html = setMeta(html, "twitter:description", description);
  html = setMeta(html, "twitter:image", image);
  if (article.created_at) html = setMeta(html, "article:published_time", article.created_at);
  if (article.updated_at) html = setMeta(html, "article:modified_time", article.updated_at);
  html = addToHead(html, renderJsonLd(article, url, description));

  return fillRoot(html, renderArticleBody(article));
};

// Slug inexistente: 404 de verdade, com a SPA carregando a tela "Matéria não encontrada".
const renderNotFound = (template: string) => {
  let html = setTitle(template, `Matéria não encontrada - ${SITE_NAME}`);
  html = html.replace(/<link\s+rel="canonical"[^>]*>/g, "");
  return addToHead(html, '<meta name="robots" content="noindex, follow">');
};

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const slug = requestUrl.searchParams.get("slug") || "";

  try {
    const [template, articles] = await Promise.all([
      loadTemplate(requestUrl.origin),
      supabaseRest<ArticleRow[]>(
        `articles?select=title,subtitle,content,category,image_url,image_description,created_at,updated_at,slug,journalist_name,tags&published=eq.true&slug=eq.${encodeURIComponent(slug)}&limit=1`,
      ),
    ]);

    const article = articles[0];

    if (!article) {
      return new Response(renderNotFound(template), {
        status: 404,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, s-maxage=300",
        },
      });
    }

    return new Response(renderArticle(template, article), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    // Se o Supabase ou o template falharem, cai para a SPA pura em vez de derrubar a página.
    console.error("Erro ao pré-renderizar artigo:", slug, error);

    const fallback = await fetch(`${requestUrl.origin}/index.html`).catch(() => null);
    if (fallback?.ok) {
      return new Response(await fallback.text(), {
        headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
      });
    }

    return new Response("Erro ao carregar a matéria", { status: 500 });
  }
}

// Monitores e validadores costumam checar a URL com HEAD; sem isso a Vercel responde 405.
export async function HEAD(request: Request) {
  const response = await GET(request);
  return new Response(null, { status: response.status, headers: response.headers });
}
