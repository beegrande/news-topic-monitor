import type { CollectionWithTopicCount } from "~/data-access/collections";
import {
  FolderOpen,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { formatRelativeTime } from "~/utils/date";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

interface CollectionCardProps {
  collection: CollectionWithTopicCount;
  onEdit?: (collection: CollectionWithTopicCount) => void;
  onDelete?: (id: string) => void;
}

export function CollectionCard({
  collection,
  onEdit,
  onDelete,
}: CollectionCardProps) {
  return (
    <Card className="group hover:shadow-lg hover:border-border/60 transition-all duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: collection.color || "#3B82F6" }}
              />
              <Badge variant="outline" className="text-xs">
                {collection.topicCount} topic{collection.topicCount !== 1 ? "s" : ""}
              </Badge>
            </div>
            <Link to="/collections/$id" params={{ id: collection.id }}>
              <CardTitle className="text-lg line-clamp-1 group-hover:text-primary transition-colors cursor-pointer">
                {collection.name}
              </CardTitle>
            </Link>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(collection)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete?.(collection.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {collection.description && (
          <CardDescription className="line-clamp-2 mt-1">
            {collection.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t">
          <div className="flex items-center gap-1.5">
            <FolderOpen className="h-4 w-4" />
            <span>Collection</span>
          </div>
          <time dateTime={new Date(collection.updatedAt).toISOString()}>
            Updated {formatRelativeTime(new Date(collection.updatedAt).toISOString())}
          </time>
        </div>
      </CardContent>
    </Card>
  );
}
