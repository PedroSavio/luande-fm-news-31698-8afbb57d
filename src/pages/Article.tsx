import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { SITE_URL } from "@/lib/site";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, User, ArrowLeft, Share2 } from "lucide-react";
import { MediaGalleryCarousel } from "@/components/article/MediaGalleryCarousel";
import { ShareDialog } from "@/components/article/ShareDialog";
import { Card, CardContent } from "@/components/ui/card";
import InternalAds from "@/components/widgets/InternalAds";

interface Article {
  id: string;
  title: string;
  subtitle: string | null;
  content: string;
  category: string;
  image_url: string | null;
  author_id: string | null;
  created_at: string;
  tags: string[] | null;
  media_gallery: any;
  slug: string;
  image_description: string | null;
  journalist_name: string | null;
}

const Article = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([]);

  useEffect(() => {
    loadArticle();
  }, [slug]);

  useEffect(() => {
    if (!article) return;

    const setMeta = (property: string, content: string) => {
      let el = document.querySelector(`meta[property="${property}"]`) || document.querySelector(`meta[name="${property}"]`);
      if (el) {
        el.setAttribute("content", content);
      } else {
        el = document.createElement("meta");
        el.setAttribute(property.startsWith("og:") ? "property" : "name", property);
        el.setAttribute("content", content);
        document.head.appendChild(el);
      }
    };

    const articleUrl = `${SITE_URL}/artigo/${article.slug}`;

    document.title = `${article.title} - Portal Luandê Notícias`;
    setMeta("og:title", article.title);
    setMeta("og:description", article.subtitle || article.title);
    setMeta(
      "og:image",
      article.image_url ||
        "https://storage.googleapis.com/gpt-engineer-file-uploads/j5I1wDmykQduHQAkT4lnKyPxmha2/social-images/social-1763673242461-4444.png",
    );
    setMeta("og:url", articleUrl);
    setMeta("og:type", "article");
    setMeta("twitter:title", article.title);
    setMeta("twitter:description", article.subtitle || article.title);
    setMeta(
      "twitter:image",
      article.image_url ||
        "https://storage.googleapis.com/gpt-engineer-file-uploads/j5I1wDmykQduHQAkT4lnKyPxmha2/social-images/social-1763673242461-4444.png",
    );
    setMeta("twitter:card", "summary_large_image");

    return () => {
      document.title = "Portal Luandê Notícias - Portal de Notícias | Política, Esportes, Entretenimento";
    };
  }, [article]);

  // Artigo inexistente: não redireciona (o Googlebot registraria como redirect),
  // mostra a tela de "não encontrada" e pede para não indexar.
  useEffect(() => {
    if (!notFound) return;

    const meta = document.createElement("meta");
    meta.setAttribute("name", "robots");
    meta.setAttribute("content", "noindex, follow");
    document.head.appendChild(meta);

    return () => {
      meta.remove();
    };
  }, [notFound]);

  const loadArticle = async () => {
    setLoading(true);
    setNotFound(false);
    try {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("slug", slug)
        .eq("published", true)
        .single();

      if (error) throw error;
      setArticle(data);

      if (data?.id) {
        await supabase.rpc("register_article_view", {
          p_article_id: data.id,
          p_traffic_source: "direct",
        });
      }

      if (data?.category && data?.id) {
        loadRelatedArticles(data.category, data.id);
      }
    } catch (error) {
      console.error("Erro ao carregar artigo:", error);
      setArticle(null);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  const loadRelatedArticles = async (category: string, currentArticleId: string) => {
    try {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("category", category)
        .eq("published", true)
        .neq("id", currentArticleId)
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) throw error;
      setRelatedArticles(data || []);
    } catch (error) {
      console.error("Erro ao carregar artigos relacionados:", error);
    }
  };

  const handleShare = () => {
    setShareDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1" />
        <Footer />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-background">
          <div className="container mx-auto px-4 py-16 max-w-2xl text-center">
            <h1 className="text-3xl font-bold mb-4">Matéria não encontrada</h1>
            <p className="text-muted-foreground mb-8">
              A matéria que você procura não existe ou foi removida.
            </p>
            <Button asChild>
              <Link to="/">Voltar para a página inicial</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const shareUrl = `https://www.luandefm.net/artigo/${encodeURIComponent(article.slug)}`;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-background">
        <article className="container mx-auto px-4 py-8 max-w-4xl">
          <Button variant="ghost" onClick={() => navigate("/")} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>

          <div className="mb-6">
            <Badge className="mb-4">{article.category}</Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">{article.title}</h1>
            {article.subtitle && <p className="text-xl text-muted-foreground mb-6">{article.subtitle}</p>}

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-6">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{article.journalist_name || 'Redação LuandêFM'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{formatDate(article.created_at)}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleShare} className="ml-auto">
                <Share2 className="w-4 h-4 mr-2" />
                Compartilhar
              </Button>
            </div>
          </div>

          {article.media_gallery && article.media_gallery.length > 0 ? (
            <div className="mb-8">
              <MediaGalleryCarousel media={article.media_gallery} title={article.title} />
              {article.image_description && (
                <p className="text-sm text-muted-foreground mt-2 italic">{article.image_description}</p>
              )}
            </div>
          ) : (
            article.image_url && (
              <div className="mb-8 rounded-lg overflow-hidden">
                <img src={article.image_url} alt={article.title} className="w-full h-auto object-cover" />
                {article.image_description && (
                  <p className="text-sm text-muted-foreground mt-2 italic">{article.image_description}</p>
                )}
              </div>
            )
          )}

          <InternalAds position="article" className="my-6" />

          <div
            className="prose prose-lg max-w-none mb-8 [&>p]:mb-4 [&>p]:leading-relaxed [&>h1]:mb-4 [&>h1]:mt-6 [&>h2]:mb-4 [&>h2]:mt-6 [&>h3]:mb-4 [&>h3]:mt-6 [&>ul]:mb-4 [&>ol]:mb-4 [&>blockquote]:mb-4 [&>blockquote]:pl-4 [&>blockquote]:border-l-4"
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          <InternalAds position="inline" className="my-6" />
          {article.tags && article.tags.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-3">Tags:</h3>
              <div className="flex flex-wrap gap-2">
                {article.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {relatedArticles.length > 0 && (
            <div className="mt-12 pt-8 border-t border-border">
              <h2 className="text-2xl font-bold mb-6">Matérias Relacionadas</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {relatedArticles.map((related) => (
                  <Link key={related.id} to={`/artigo/${related.slug}`} className="block">
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer h-full">
                      {related.image_url && (
                        <div className="relative h-48 overflow-hidden">
                          <img
                            src={related.image_url}
                            alt={related.title}
                            className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                          />
                          <Badge className="absolute top-2 left-2">{related.category}</Badge>
                        </div>
                      )}
                      <CardContent className="p-4">
                        <h3 className="font-bold text-lg mb-2 line-clamp-2 hover:text-primary transition-colors">
                          {related.title}
                        </h3>
                        {related.subtitle && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{related.subtitle}</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(related.created_at)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>
      </main>

      <Footer />

      <ShareDialog open={shareDialogOpen} onOpenChange={setShareDialogOpen} title={article.title} url={shareUrl} slug={article.slug} />
    </div>
  );
};

export default Article;
