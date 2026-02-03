import { Link } from "@tanstack/react-router";
import { Badge } from "~/components/ui/badge";
import { Tag } from "lucide-react";
import { cn } from "~/lib/utils";

interface ClickableKeywordProps {
  keyword: string;
  count?: number;
  className?: string;
  style?: React.CSSProperties;
  variant?: "default" | "secondary" | "destructive" | "outline";
  showIcon?: boolean;
}

export function ClickableKeyword({
  keyword,
  count,
  className,
  style,
  variant = "secondary",
  showIcon = false,
}: ClickableKeywordProps) {
  return (
    <Link to="/search" search={{ q: keyword }}>
      <Badge
        variant={variant}
        className={cn(
          "cursor-pointer transition-colors hover:bg-primary/20",
          className
        )}
        style={style}
      >
        {showIcon && <Tag className="w-3 h-3 mr-1" />}
        {keyword}
        {count !== undefined && (
          <span className="ml-1 text-muted-foreground">({count})</span>
        )}
      </Badge>
    </Link>
  );
}
