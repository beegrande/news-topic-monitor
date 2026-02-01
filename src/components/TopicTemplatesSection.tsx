import { Sparkles } from "lucide-react";
import { TopicTemplateCard } from "./TopicTemplateCard";
import { topicTemplates, type TopicTemplate } from "~/data/topic-templates";

interface TopicTemplatesSectionProps {
  onUseTemplate: (template: TopicTemplate) => void;
}

export function TopicTemplatesSection({
  onUseTemplate,
}: TopicTemplatesSectionProps) {
  return (
    <div className="mt-12 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Quick Start Templates</h3>
      </div>
      <p className="text-muted-foreground mb-6">
        Get started quickly with these pre-configured templates. Click "Use
        Template" to customize and create your topic.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {topicTemplates.map((template) => (
          <TopicTemplateCard
            key={template.id}
            template={template}
            onUseTemplate={onUseTemplate}
          />
        ))}
      </div>
    </div>
  );
}
