import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import PopularNews from "@/components/widgets/PopularNews";
import Poll from "@/components/widgets/Poll";
import ChatWidget from "@/components/widgets/ChatWidget";
import ContactForm from "@/components/widgets/ContactForm";
import WeatherWidget from "@/components/widgets/WeatherWidget";
import EconomyWidget from "@/components/widgets/EconomyWidget";
import HoroscopeWidget from "@/components/widgets/HoroscopeWidget";
import AdSpace from "@/components/widgets/AdSpace";
import InternalAds from "@/components/widgets/InternalAds";
import FootballResults from "@/components/widgets/FootballResults";
import TrocandoEmMiudos from "@/components/widgets/TrocandoEmMiudos";
import HorizontalAdsStrip from "@/components/widgets/HorizontalAdsStrip";
import YouTubeVideos from "@/components/widgets/YouTubeVideos";

import { Clock, ChevronRight, Play } from "lucide-react";
import sergipeMap from "@/assets/sergipe-map.png";

const Index = () => {
  const [articles, setArticles] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem("cached_articles");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [categories, setCategories] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem("cached_categories");
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadArticles();
    loadCategories();

    const articlesChannel = supabase
      .channel("articles-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "articles" }, () => {
        loadArticles();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(articlesChannel);
    };
  }, []);

  const loadArticles = async () => {
    try {
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const list = data || [];
      setArticles(list);
      try { localStorage.setItem("cached_articles", JSON.stringify(list)); } catch {}
    } catch (error) {
      console.error("Erro ao carregar artigos:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });
      if (error) throw error;
      const list = data || [];
      setCategories(list);
      try { localStorage.setItem("cached_categories", JSON.stringify(list)); } catch {}
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
    }
  };


  const formatDate = (date: string) => {
    const now = new Date();
    const articleDate = new Date(date);
    const diffInHours = Math.floor((now.getTime() - articleDate.getTime()) / (1000 * 60 * 60));
    if (diffInHours < 1) return "Agora mesmo";
    if (diffInHours < 24) return `Há ${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Há ${diffInDays}d`;
    return articleDate.toLocaleDateString("pt-BR");
  };

  const getArticlesByCategory = (categoryName: string) => {
    return articles.filter((a) => a.category === categoryName);
  };

  const featuredArticles = articles.filter((a) => a.featured);
  const heroArticle = featuredArticles[0] || articles[0];
  const secondaryArticles = featuredArticles.length > 1 ? featuredArticles.slice(1, 4) : articles.slice(1, 4);
  const latestArticles = articles.slice(0, 20);

  return (
    <div className="min-h-screen flex flex-col bg-background relative">
      <div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center" aria-hidden="true">
        <img
          src={sergipeMap}
          alt=""
          className="w-[600px] h-[600px] object-contain opacity-[0.03]"
        />
      </div>

      <Header />

      <main className="flex-1">
        <div className="bg-primary">
          <div className="container mx-auto px-4 py-2.5 flex items-center justify-center">
            <Link
              to="/enviar-noticia"
              className="text-primary-foreground hover:text-primary-foreground/80 smooth-transition text-sm font-semibold font-body flex items-center gap-2"
            >
              📰 Nos Envie Sua Notícia
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="container mx-auto px-4 py-3">
          <AdSpace position="header" />
        </div>

        {heroArticle && (
          <section className="container mx-auto px-4 mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Link
                to={`/artigo/${heroArticle.slug}`}
                className="block lg:col-span-2 relative rounded-lg overflow-hidden cursor-pointer group"
              >
                <img
                  src={heroArticle.image_url || "/placeholder.svg"}
                  alt={heroArticle.title}
                  className="w-full h-64 sm:h-80 lg:h-[420px] object-cover group-hover:scale-105 smooth-transition"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
                  <span className="category-label">{heroArticle.category}</span>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mt-2 leading-tight font-display line-clamp-3">
                    {heroArticle.title}
                  </h1>
                  {heroArticle.subtitle && (
                    <p className="text-white/80 text-sm mt-2 line-clamp-2 font-body">
                      {heroArticle.subtitle}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-3 text-white/60 text-xs font-body">
                    <Clock className="h-3 w-3" />
                    <span>{formatDate(heroArticle.created_at)}</span>
                  </div>
                </div>
              </Link>

              <div className="flex flex-col gap-3">
                {secondaryArticles.map((article: any) => (
                  <Link
                    key={article.id}
                    to={`/artigo/${article.slug}`}
                    className="block relative rounded-lg overflow-hidden cursor-pointer group flex-1 min-h-[120px]"
                  >
                    <img
                      src={article.image_url || "/placeholder.svg"}
                      alt={article.title}
                      className="w-full h-full object-cover absolute inset-0 group-hover:scale-105 smooth-transition"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <span className="category-label">{article.category}</span>
                      <h3 className="text-sm font-bold text-white mt-1 line-clamp-2 font-display leading-snug">
                        {article.title}
                      </h3>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        <HorizontalAdsStrip />

        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            <div className="lg:col-span-2 space-y-8">
              <section>
                <div className="flex items-center justify-between mb-4 border-b-2 border-primary pb-2">
                  <h2 className="section-title">
                    <span className="section-divider"></span>
                    Últimas Notícias
                  </h2>
                </div>
                <div className="space-y-0 divide-y divide-border">
                  {latestArticles.slice(4, 14).map((article: any) => (
                    <Link
                      key={article.id}
                      to={`/artigo/${article.slug}`}
                      className="flex gap-4 py-4 cursor-pointer group"
                    >
                      <img
                        src={article.image_url || "/placeholder.svg"}
                        alt={article.title}
                        className="w-24 h-20 sm:w-32 sm:h-24 object-cover rounded flex-shrink-0 group-hover:opacity-90 smooth-transition"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="category-label">{article.category}</span>
                        <h3 className="text-sm sm:text-base font-bold mt-1 line-clamp-2 group-hover:text-primary smooth-transition font-display leading-snug">
                          {article.title}
                        </h3>
                        {article.subtitle && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1 font-body hidden sm:block">
                            {article.subtitle}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground font-body">
                          <Clock className="h-3 w-3" />
                          <span>{formatDate(article.created_at)}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>

              <InternalAds position="inline" className="my-4" />

              {categories.slice(0, 6).map((category) => {
                const catArticles = getArticlesByCategory(category.name);
                if (catArticles.length === 0) return null;

                return (
                  <section key={category.id}>
                    <div className="flex items-center justify-between mb-4 border-b-2 border-primary pb-2">
                      <h2 className="section-title">
                        <span className="section-divider"></span>
                        {category.name}
                      </h2>
                      <Link
                        to={`/categoria/${category.slug}`}
                        className="text-xs font-semibold text-primary hover:underline font-body flex items-center gap-1"
                      >
                        Ver mais <ChevronRight className="h-3 w-3" />
                      </Link>
                    </div>

                    {catArticles[0] && (
                      <Link
                        to={`/artigo/${catArticles[0].slug}`}
                        className="block mb-4 cursor-pointer group"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <img
                            src={catArticles[0].image_url || "/placeholder.svg"}
                            alt={catArticles[0].title}
                            className="w-full h-48 object-cover rounded group-hover:opacity-90 smooth-transition"
                          />
                          <div>
                            <h3 className="text-lg font-bold group-hover:text-primary smooth-transition font-display leading-snug">
                              {catArticles[0].title}
                            </h3>
                            {catArticles[0].subtitle && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-3 font-body">
                                {catArticles[0].subtitle}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground font-body">
                              <Clock className="h-3 w-3" />
                              <span>{formatDate(catArticles[0].created_at)}</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    )}

                    <div className="space-y-0 divide-y divide-border">
                      {catArticles.slice(1, 5).map((article: any) => (
                        <Link
                          key={article.id}
                          to={`/artigo/${article.slug}`}
                          className="flex items-start gap-3 py-3 cursor-pointer group"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></span>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold group-hover:text-primary smooth-transition line-clamp-2 font-body">
                              {article.title}
                            </h4>
                            <span className="text-xs text-muted-foreground font-body">{formatDate(article.created_at)}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                );
              })}

              <TrocandoEmMiudos />
              <div className="lg:hidden">
                <InternalAds position="inline" source="uploaded" mobileFormat="horizontal" className="my-2" />
              </div>
            </div>

            <aside className="space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-3 border-b-2 border-destructive pb-2">
                  <Play className="h-4 w-4 text-destructive" />
                  <h3 className="text-base font-bold font-display">Ao Vivo</h3>
                </div>
                <div className="aspect-video rounded overflow-hidden shadow-md">
                  <iframe
                    className="w-full h-full"
                    src="https://www.youtube.com/embed/live_stream?channel=UCS35bHapJqRtfG9kcq9f9FA&autoplay=0&mute=0"
                    title="LuandeFM Ao Vivo"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                </div>
              </div>

              <InternalAds position="banner" className="my-2" />
              <PopularNews />
              <FootballResults />
              <WeatherWidget />
              <EconomyWidget />
              <HoroscopeWidget />
              <Poll />
              <ContactForm />
              <ChatWidget />
            </aside>
          </div>
        </div>

        <YouTubeVideos />

        <div className="container mx-auto px-4 py-4">
          <AdSpace position="footer" />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Index;
