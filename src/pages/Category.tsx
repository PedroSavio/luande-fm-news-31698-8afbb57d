import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { supabaseClient } from "@/lib/supabase-client";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import NewsCard from "@/components/news/NewsCard";

const Category = () => {
  const { category } = useParams();
  const [articles, setArticles] = useState<any[]>([]);
  const [categoryName, setCategoryName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArticles();
  }, [category]);

  const loadArticles = async () => {
    try {
      setLoading(true);

      const { data: categoryData, error: categoryError } = await supabaseClient
        .from("categories")
        .select("name")
        .eq("slug", category)
        .single();

      if (categoryError) {
        console.error("Erro ao carregar categoria:", categoryError);
      }

      const catName = categoryData?.name || category;
      setCategoryName(catName);

      const { data, error } = await supabaseClient
        .from("articles")
        .select("*")
        .eq("published", true)
        .eq("category", catName)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setArticles(data || []);
    } catch (error) {
      console.error("Erro ao carregar artigos:", error);
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
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8" />
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <span className="w-1.5 h-10 bg-primary"></span>
            {categoryName || category}
          </h1>
          <p className="text-muted-foreground ml-5">
            {articles.length} {articles.length === 1 ? "notícia encontrada" : "notícias encontradas"}
          </p>
        </div>

        {articles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              Nenhuma notícia encontrada nesta categoria.
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

export default Category;
