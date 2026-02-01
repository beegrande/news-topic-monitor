import { Button } from "~/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Newspaper, Bell, Search, Rss } from "lucide-react";

export function Hero() {
  return (
    <section className="container mx-auto px-4 py-16 sm:py-24">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-16 items-center">
        <div className="flex flex-col justify-center space-y-6">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Monitor the News That Matters with{" "}
              <span className="text-primary">NewsMonitor</span>
            </h1>
            <p className="text-lg text-muted-foreground sm:text-xl max-w-2xl">
              Track topics, get real-time alerts, and never miss important news.
              Set up keyword monitors, receive webhook notifications, and stay
              ahead of the stories that impact you.
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button size="lg" className="text-base" asChild>
              <Link to="/dashboard">
                <Newspaper className="mr-2 h-4 w-4" />
                Get Started
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-6 pt-4">
            <div className="text-center">
              <Search className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">Monitor Topics</p>
            </div>
            <div className="text-center">
              <Bell className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">Get Alerts</p>
            </div>
            <div className="text-center">
              <Rss className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium">Track News</p>
            </div>
          </div>
        </div>
        <div className="flex justify-center lg:justify-end">
          <div className="relative">
            <div className="h-80 w-80 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border border-border overflow-hidden">
              <div className="text-center p-8">
                <div className="h-20 w-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <Newspaper className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Your News Feed</h3>
                <p className="text-sm text-muted-foreground">
                  Stay informed with personalized topic monitoring and instant
                  alerts
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
