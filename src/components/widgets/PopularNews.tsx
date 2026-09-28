import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

interface PopularNewsItem {
  title: string;
  views: number;
  slug: string;
}

const PopularNews = () => {
  const [popularNews, setPopularNews] = useState<PopularNewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPopularNews();
  }, []);

  const loadPopularNews = async () => {
    try {
      // Primeiro, tentar buscar artigos com analytics
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('article_analytics')
        .select(`
          article_id,
          views,
          articles!inner(title, slug, published)
        `)
        .eq('articles.published', true)
        .order('views', { ascending: false });

      if (analyticsError) throw analyticsError;

      if (analyticsData && analyticsData.length > 0) {
        // Agrupar por article_id e somar views
        const grouped = analyticsData.reduce((acc: any, curr: any) => {
          const articleId = curr.article_id;
          if (!acc[articleId]) {
            acc[articleId] = {
              title: curr.articles.title,
              slug: curr.articles.slug,
              views: 0
            };
          }
          acc[articleId].views += curr.views || 0;
          return acc;
        }, {});

        const sorted = Object.values(grouped)
          .sort((a: any, b: any) => b.views - a.views)
          .slice(0, 5) as PopularNewsItem[];

        if (sorted.length > 0) {
          setPopularNews(sorted);
          setLoading(false);
          return;
        }
      }

      // Se não houver dados de analytics, buscar as últimas matérias publicadas
      const { data: latestArticles, error: latestError } = await supabase
        .from('articles')
        .select('title, slug')
        .eq('published', true)
        .order('created_at', { ascending: false })
        .limit(5);

      if (latestError) throw latestError;

      const formattedLatest = (latestArticles || []).map(article => ({
        title: article.title,
        slug: article.slug,
        views: 0
      }));

      setPopularNews(formattedLatest);
    } catch (error) {
      console.error('Erro ao carregar notícias populares:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatViews = (views: number) => {
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}k`;
    }
    return views.toString();
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-destructive" />
            Mais Lidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-12 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-destructive" />
          Mais Lidas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {popularNews.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma visualização registrada ainda
          </p>
        ) : (
          <ul className="space-y-4">
            {popularNews.map((news, index) => (
              <li key={index} className="group cursor-pointer">
                <Link to={`/artigo/${news.slug}`} className="flex gap-3">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium line-clamp-2 group-hover:text-primary smooth-transition mb-1">
                      {news.title}
                    </h4>
                    {news.views > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {formatViews(news.views)} visualizações
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default PopularNews;
