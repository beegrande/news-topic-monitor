export interface TopicTemplate {
  id: string;
  name: string;
  description: string;
  keywords: string;
  category: string;
  icon: "cpu" | "landmark" | "trophy" | "briefcase" | "flask" | "clapperboard" | "heart-pulse" | "leaf";
}

export const topicTemplates: TopicTemplate[] = [
  {
    id: "tech",
    name: "Technology & AI",
    description: "Latest news on artificial intelligence, tech companies, and digital innovation",
    keywords: "artificial intelligence, machine learning, ChatGPT, OpenAI, Google, Apple, Microsoft, tech startup, software, programming",
    category: "Technology",
    icon: "cpu",
  },
  {
    id: "politics",
    name: "Politics & Government",
    description: "Political news, elections, policy changes, and government decisions",
    keywords: "politics, election, congress, senate, parliament, government, policy, legislation, voting, democracy",
    category: "Politics",
    icon: "landmark",
  },
  {
    id: "sports",
    name: "Sports",
    description: "Sports news, scores, transfers, and major sporting events",
    keywords: "football, soccer, basketball, NFL, NBA, Premier League, Olympics, World Cup, sports, athlete",
    category: "Sports",
    icon: "trophy",
  },
  {
    id: "business",
    name: "Business & Finance",
    description: "Stock market, company news, economic indicators, and financial trends",
    keywords: "stock market, economy, finance, investment, startup, IPO, earnings, Wall Street, cryptocurrency, bitcoin",
    category: "Business",
    icon: "briefcase",
  },
  {
    id: "science",
    name: "Science & Research",
    description: "Scientific discoveries, research breakthroughs, and space exploration",
    keywords: "science, research, NASA, space, physics, biology, chemistry, discovery, study, experiment",
    category: "Science",
    icon: "flask",
  },
  {
    id: "entertainment",
    name: "Entertainment",
    description: "Movies, TV shows, music, celebrities, and pop culture",
    keywords: "movie, film, Netflix, streaming, music, celebrity, Hollywood, TV show, entertainment, concert",
    category: "Entertainment",
    icon: "clapperboard",
  },
  {
    id: "health",
    name: "Health & Medicine",
    description: "Health news, medical research, healthcare policy, and wellness",
    keywords: "health, medicine, vaccine, FDA, healthcare, hospital, disease, treatment, mental health, wellness",
    category: "Health",
    icon: "heart-pulse",
  },
  {
    id: "environment",
    name: "Climate & Environment",
    description: "Climate change, environmental policy, sustainability, and green energy",
    keywords: "climate change, environment, sustainability, renewable energy, solar, wind, carbon, pollution, conservation, green",
    category: "Environment",
    icon: "leaf",
  },
];
