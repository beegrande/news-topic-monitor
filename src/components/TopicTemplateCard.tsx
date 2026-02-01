import {
  Cpu,
  Landmark,
  Trophy,
  Briefcase,
  FlaskConical,
  Clapperboard,
  HeartPulse,
  Leaf,
  Tag,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import type { TopicTemplate } from "~/data/topic-templates";

const iconMap = {
  cpu: Cpu,
  landmark: Landmark,
  trophy: Trophy,
  briefcase: Briefcase,
  flask: FlaskConical,
  clapperboard: Clapperboard,
  "heart-pulse": HeartPulse,
  leaf: Leaf,
} as const;

interface TopicTemplateCardProps {
  template: TopicTemplate;
  onUseTemplate: (template: TopicTemplate) => void;
}

export function TopicTemplateCard({
  template,
  onUseTemplate,
}: TopicTemplateCardProps) {
  const Icon = iconMap[template.icon];
  const keywords = template.keywords.split(",").slice(0, 3);

  return (
    <div className="group bg-card border rounded-lg p-4 hover:border-primary/50 transition-all">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/40 rounded-lg flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h4 className="font-semibold text-sm">{template.name}</h4>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {template.description}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {keywords.map((keyword, idx) => (
          <Badge key={idx} variant="secondary" className="text-xs">
            <Tag className="w-3 h-3 mr-1" />
            {keyword.trim()}
          </Badge>
        ))}
        {template.keywords.split(",").length > 3 && (
          <Badge variant="outline" className="text-xs">
            +{template.keywords.split(",").length - 3} more
          </Badge>
        )}
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => onUseTemplate(template)}
      >
        Use Template
      </Button>
    </div>
  );
}
