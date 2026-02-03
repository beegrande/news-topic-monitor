import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { X, ExternalLink, Newspaper } from "lucide-react";
import { getArticlesByTopicQuery } from "~/queries/articles";
import type {
  ArticleVolumeDataPoint,
  SentimentDistribution,
  SourceDistribution,
  SentimentOverTimeDataPoint,
  KeywordCount,
  CountryDistribution,
} from "~/data-access/articles";
import type { ArticleSentiment } from "~/db/schema";

interface TopicAnalyticsData {
  articleVolume: ArticleVolumeDataPoint[];
  sentimentDistribution: SentimentDistribution[];
  sourceDistribution: SourceDistribution[];
  sentimentOverTime: SentimentOverTimeDataPoint[];
  trendingKeywords: KeywordCount[];
  countryDistribution?: CountryDistribution[];
}

interface TopicAnalyticsProps {
  data: TopicAnalyticsData;
  topicId?: string;
}

interface FilterState {
  type: "source" | "sentiment" | "date" | null;
  value: string | null;
  label: string | null;
}

const SENTIMENT_COLORS = {
  positive: "#22c55e",
  negative: "#ef4444",
  neutral: "#6b7280",
  unknown: "#9ca3af",
};

const CHART_COLORS = [
  "#f97316", // orange
  "#3b82f6", // blue
  "#22c55e", // green
  "#ef4444", // red
  "#8b5cf6", // purple
  "#eab308", // yellow
  "#06b6d4", // cyan
  "#ec4899", // pink
];

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatFullDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Filtered Articles Section
function FilteredArticlesSection({
  topicId,
  filter,
  onClear,
}: {
  topicId: string;
  filter: FilterState;
  onClear: () => void;
}) {
  const { data, isLoading } = useQuery({
    ...getArticlesByTopicQuery({
      topicId,
      limit: 10,
      source: filter.type === "source" ? filter.value || undefined : undefined,
      sentiment:
        filter.type === "sentiment"
          ? (filter.value as ArticleSentiment)
          : undefined,
    }),
    enabled: !!filter.type && !!filter.value,
  });

  const articles = data?.articles ?? [];

  if (!filter.type || !filter.value) return null;

  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">
              Articles: {filter.label}
            </CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X className="h-4 w-4 mr-1" />
            Clear filter
          </Button>
        </div>
        <CardDescription>
          Click on an article to open it in a new tab
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : articles.length > 0 ? (
          <div className="space-y-3">
            {articles.map((article) => (
              <a
                key={article.id}
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm line-clamp-2">
                      {article.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{article.source}</span>
                      <span>•</span>
                      <span>
                        {article.publishedAt
                          ? new Date(article.publishedAt).toLocaleDateString()
                          : "Unknown date"}
                      </span>
                      {article.sentiment && (
                        <>
                          <span>•</span>
                          <Badge
                            variant="outline"
                            className="text-xs py-0"
                            style={{
                              borderColor:
                                SENTIMENT_COLORS[
                                  article.sentiment as keyof typeof SENTIMENT_COLORS
                                ],
                              color:
                                SENTIMENT_COLORS[
                                  article.sentiment as keyof typeof SENTIMENT_COLORS
                                ],
                            }}
                          >
                            {article.sentiment}
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            No articles found for this filter
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function ArticleVolumeChart({
  data,
  onDateSelect,
}: {
  data: ArticleVolumeDataPoint[];
  onDateSelect?: (date: string, label: string) => void;
}) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Article Volume Over Time</CardTitle>
          <CardDescription>Daily article counts</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No data available yet
          </p>
        </CardContent>
      </Card>
    );
  }

  const formattedData = data.map((d) => ({
    ...d,
    formattedDate: formatDate(d.date),
    fullDate: formatFullDate(d.date),
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleClick = (data: any) => {
    if (onDateSelect && data?.date && data?.fullDate) {
      onDateSelect(data.date, data.fullDate);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Article Volume Over Time</CardTitle>
        <CardDescription>
          Daily article counts for the past 30 days
          {onDateSelect && (
            <span className="text-primary ml-1">(click a bar to filter)</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="formattedDate"
              tick={{ fontSize: 12 }}
              className="fill-muted-foreground"
            />
            <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Bar
              dataKey="count"
              fill="#f97316"
              radius={[4, 4, 0, 0]}
              cursor={onDateSelect ? "pointer" : undefined}
              onClick={(data) => handleClick(data)}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function SentimentDistributionChart({
  data,
  onSentimentSelect,
}: {
  data: SentimentDistribution[];
  onSentimentSelect?: (sentiment: string, label: string) => void;
}) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sentiment Distribution</CardTitle>
          <CardDescription>Overall sentiment breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No data available yet
          </p>
        </CardContent>
      </Card>
    );
  }

  const total = data.reduce((sum, d) => sum + d.count, 0);
  const chartData = data.map((d) => ({
    name: d.sentiment.charAt(0).toUpperCase() + d.sentiment.slice(1),
    sentiment: d.sentiment,
    value: d.count,
    percentage: Math.round((d.count / total) * 100),
    color:
      SENTIMENT_COLORS[d.sentiment as keyof typeof SENTIMENT_COLORS] ||
      SENTIMENT_COLORS.unknown,
  }));

  const handleClick = (entry: { sentiment: string; name: string }) => {
    if (onSentimentSelect) {
      onSentimentSelect(entry.sentiment, entry.name);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Sentiment Distribution</CardTitle>
        <CardDescription>
          Overall sentiment breakdown of articles
          {onSentimentSelect && (
            <span className="text-primary ml-1">(click to filter)</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center gap-4">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                cursor={onSentimentSelect ? "pointer" : undefined}
                onClick={(_, index) => handleClick(chartData[index])}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 justify-center">
            {chartData.map((entry) => (
              <button
                key={entry.name}
                onClick={() => handleClick(entry)}
                className="flex items-center gap-2 text-sm hover:bg-accent px-2 py-1 rounded transition-colors"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span>
                  {entry.name}: {entry.percentage}%
                </span>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SourceDistributionChart({
  data,
  onSourceSelect,
}: {
  data: SourceDistribution[];
  onSourceSelect?: (source: string) => void;
}) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Source Distribution</CardTitle>
          <CardDescription>Articles by news source</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No data available yet
          </p>
        </CardContent>
      </Card>
    );
  }

  // Take top 8 sources
  const topSources = data.slice(0, 8);
  const chartData = topSources.map((d, index) => ({
    name: d.source,
    count: d.count,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleClick = (data: any) => {
    if (onSourceSelect && data?.name) {
      onSourceSelect(data.name);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Source Distribution</CardTitle>
        <CardDescription>
          Top news sources by article count
          {onSourceSelect && (
            <span className="text-primary ml-1">(click to filter)</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              type="number"
              tick={{ fontSize: 12 }}
              className="fill-muted-foreground"
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12 }}
              width={120}
              className="fill-muted-foreground"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Bar
              dataKey="count"
              radius={[0, 4, 4, 0]}
              cursor={onSourceSelect ? "pointer" : undefined}
              onClick={(data) => handleClick(data)}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function SentimentOverTimeChart({
  data,
}: {
  data: SentimentOverTimeDataPoint[];
}) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sentiment Trends</CardTitle>
          <CardDescription>Sentiment changes over time</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No data available yet
          </p>
        </CardContent>
      </Card>
    );
  }

  const formattedData = data.map((d) => ({
    ...d,
    formattedDate: formatDate(d.date),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Sentiment Trends</CardTitle>
        <CardDescription>
          How sentiment changes over the past 30 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="formattedDate"
              tick={{ fontSize: 12 }}
              className="fill-muted-foreground"
            />
            <YAxis tick={{ fontSize: 12 }} className="fill-muted-foreground" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="positive"
              stroke={SENTIMENT_COLORS.positive}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="negative"
              stroke={SENTIMENT_COLORS.negative}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
            <Line
              type="monotone"
              dataKey="neutral"
              stroke={SENTIMENT_COLORS.neutral}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function CountryDistributionChart({
  data,
  onCountrySelect,
}: {
  data: CountryDistribution[];
  onCountrySelect?: (country: string) => void;
}) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Geographic Distribution</CardTitle>
          <CardDescription>Articles by country</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No geographic data available yet
          </p>
        </CardContent>
      </Card>
    );
  }

  // Take top 10 countries
  const topCountries = data.slice(0, 10);
  const chartData = topCountries.map((d, index) => ({
    name: d.country,
    code: d.countryCode,
    count: d.count,
    fill: CHART_COLORS[index % CHART_COLORS.length],
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleClick = (data: any) => {
    if (onCountrySelect && data?.name) {
      onCountrySelect(data.name);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Geographic Distribution</CardTitle>
        <CardDescription>
          Top countries by article count
          {onCountrySelect && (
            <span className="text-primary ml-1">(click to filter)</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              type="number"
              tick={{ fontSize: 12 }}
              className="fill-muted-foreground"
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12 }}
              width={120}
              className="fill-muted-foreground"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Bar
              dataKey="count"
              radius={[0, 4, 4, 0]}
              cursor={onCountrySelect ? "pointer" : undefined}
              onClick={(data) => handleClick(data)}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function TrendingKeywordsCard({ data }: { data: KeywordCount[] }) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Trending Keywords</CardTitle>
          <CardDescription>Popular terms from recent articles</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            No keywords found yet
          </p>
        </CardContent>
      </Card>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Trending Keywords</CardTitle>
        <CardDescription>
          Most frequent terms from the past 7 days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {data.map((keyword) => {
            const intensity = keyword.count / maxCount;
            const size =
              intensity > 0.7
                ? "text-base"
                : intensity > 0.4
                  ? "text-sm"
                  : "text-xs";
            return (
              <Badge
                key={keyword.keyword}
                variant="secondary"
                className={`${size} transition-colors hover:bg-primary/20`}
                style={{
                  opacity: 0.5 + intensity * 0.5,
                }}
              >
                {keyword.keyword}
                <span className="ml-1 text-muted-foreground">
                  ({keyword.count})
                </span>
              </Badge>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function TopicAnalytics({ data, topicId }: TopicAnalyticsProps) {
  const [filter, setFilter] = useState<FilterState>({
    type: null,
    value: null,
    label: null,
  });

  const handleSourceSelect = (source: string) => {
    setFilter({ type: "source", value: source, label: source });
  };

  const handleSentimentSelect = (sentiment: string, label: string) => {
    setFilter({ type: "sentiment", value: sentiment, label });
  };

  const handleClearFilter = () => {
    setFilter({ type: null, value: null, label: null });
  };

  return (
    <div className="space-y-6">
      {/* Show filtered articles at the top when a filter is active */}
      {topicId && filter.type && (
        <FilteredArticlesSection
          topicId={topicId}
          filter={filter}
          onClear={handleClearFilter}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ArticleVolumeChart data={data.articleVolume} />
        <SentimentDistributionChart
          data={data.sentimentDistribution}
          onSentimentSelect={topicId ? handleSentimentSelect : undefined}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SentimentOverTimeChart data={data.sentimentOverTime} />
        <SourceDistributionChart
          data={data.sourceDistribution}
          onSourceSelect={topicId ? handleSourceSelect : undefined}
        />
      </div>
      {data.countryDistribution && data.countryDistribution.length > 0 && (
        <CountryDistributionChart data={data.countryDistribution} />
      )}
      <TrendingKeywordsCard data={data.trendingKeywords} />
    </div>
  );
}

export function TopicAnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-5 bg-muted rounded w-1/3 animate-pulse" />
              <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-[300px] bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <div className="h-5 bg-muted rounded w-1/4 animate-pulse" />
          <div className="h-4 bg-muted rounded w-1/3 animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="h-6 bg-muted rounded w-16 animate-pulse"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
