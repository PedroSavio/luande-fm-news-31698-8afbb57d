import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import BreakingNews from "@/components/layout/BreakingNews";
import DateTimeBanner from "@/components/layout/DateTimeBanner";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import NewsCard from "@/components/news/NewsCard";

const Search = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (query) {
      searchArticles();
    } else {
      setLoading(false);
    }
  }, [query]);

  const searchArticles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .eq("published", true)
        .or(`title.ilike.%${query}%,content.ilike.%${query}%,subtitle.ilike.%${query}%`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error("Erro ao buscar artigos:", error);
    } finally {
      setLoading(false);
    }
  };


  const formatDate = (date: string) => {
    const now = new Date();
    const articleDate = new Date(date);
    const diffInHours = Math.floor((now.getTime() - articleDate.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return "Agora mesmo";
    if (diffInHours < 24) return `Há ${diffInHours} hora${diffInHours > 1 ? "s" : ""}`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Há ${diffInDays} dia${diffInDays > 1 ? "s" : ""}`;

    return articleDate.toLocaleDateString("pt-BR");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Buscando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <BreakingNews />
      <DateTimeBanner />
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <span className="w-1.5 h-10 bg-primary"></span>
            Resultados da Busca
          </h1>
          <p className="text-muted-foreground ml-5">
            {query ? (
              <>
                Buscando por: <span className="font-semibold text-foreground">"{query}"</span>
                {" - "}
                {articles.length} {articles.length === 1 ? "resultado encontrado" : "resultados encontrados"}
              </>
            ) : (
              "Digite algo para buscar notícias"
            )}
          </p>
        </div>

        {!query ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              Use a barra de pesquisa acima para encontrar notícias.
            </p>
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              Nenhuma notícia encontrada para "{query}".
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <Link key={article.id} to={`/artigo/${article.slug}`} className="block cursor-pointer">
                <NewsCard
                  title={article.title}
                  excerpt={article.subtitle || article.content.substring(0, 150) + "..."}
                  image={article.image_url || "/placeholder.svg"}
                  category={article.category}
                  author="Redação LuandêFM"
                  date={formatDate(article.created_at)}
                />
              </Link>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Search;
