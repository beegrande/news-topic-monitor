import { useState, useCallback } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Layers,
  Search,
} from "lucide-react";
import {
  type ParsedQuery,
  type QueryCondition,
  type QueryGroup,
  type BooleanOperator,
  type SearchField,
  createEmptyCondition,
  createEmptyGroup,
  createEmptyQuery,
  queryToString,
  parseSimpleKeywords,
  parseAdvancedQuery,
  isAdvancedQuery,
  validateQuery,
  getQueryDescription,
  generateId,
} from "~/utils/query-parser";

interface AdvancedQueryBuilderProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function AdvancedQueryBuilder({
  value,
  onChange,
  error,
}: AdvancedQueryBuilderProps) {
  const [isAdvancedMode, setIsAdvancedMode] = useState(() =>
    isAdvancedQuery(value)
  );
  const [query, setQuery] = useState<ParsedQuery>(() => {
    if (!value) return createEmptyQuery();
    if (isAdvancedQuery(value)) {
      return parseAdvancedQuery(value);
    }
    return parseSimpleKeywords(value);
  });
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(query.groups.map((g) => g.id))
  );

  const updateQuery = useCallback(
    (newQuery: ParsedQuery) => {
      setQuery(newQuery);
      onChange(queryToString(newQuery));
    },
    [onChange]
  );

  const toggleAdvancedMode = () => {
    if (!isAdvancedMode) {
      // Switching to advanced mode
      const parsed = parseSimpleKeywords(value);
      setQuery(parsed);
      setExpandedGroups(new Set(parsed.groups.map((g) => g.id)));
    }
    setIsAdvancedMode(!isAdvancedMode);
  };

  const updateCondition = (
    groupId: string,
    conditionId: string,
    updates: Partial<QueryCondition>
  ) => {
    const newQuery = {
      ...query,
      groups: query.groups.map((group) => {
        if (group.id !== groupId) return group;
        return {
          ...group,
          conditions: group.conditions.map((condition) => {
            if (condition.id !== conditionId) return condition;
            return { ...condition, ...updates };
          }),
        };
      }),
    };
    updateQuery(newQuery);
  };

  const addCondition = (groupId: string) => {
    const newQuery = {
      ...query,
      groups: query.groups.map((group) => {
        if (group.id !== groupId) return group;
        return {
          ...group,
          conditions: [...group.conditions, createEmptyCondition()],
        };
      }),
    };
    updateQuery(newQuery);
  };

  const removeCondition = (groupId: string, conditionId: string) => {
    const newQuery = {
      ...query,
      groups: query.groups.map((group) => {
        if (group.id !== groupId) return group;
        const newConditions = group.conditions.filter(
          (c) => c.id !== conditionId
        );
        // Ensure at least one condition remains
        if (newConditions.length === 0) {
          newConditions.push(createEmptyCondition());
        }
        return { ...group, conditions: newConditions };
      }),
    };
    updateQuery(newQuery);
  };

  const updateGroupOperator = (groupId: string, operator: BooleanOperator) => {
    const newQuery = {
      ...query,
      groups: query.groups.map((group) => {
        if (group.id !== groupId) return group;
        return { ...group, operator };
      }),
    };
    updateQuery(newQuery);
  };

  const addGroup = () => {
    const newGroup = createEmptyGroup();
    const newQuery = {
      ...query,
      groups: [...query.groups, newGroup],
    };
    setExpandedGroups((prev) => new Set([...prev, newGroup.id]));
    updateQuery(newQuery);
  };

  const removeGroup = (groupId: string) => {
    if (query.groups.length <= 1) return;
    const newQuery = {
      ...query,
      groups: query.groups.filter((g) => g.id !== groupId),
    };
    updateQuery(newQuery);
  };

  const updateTopOperator = (operator: BooleanOperator) => {
    updateQuery({ ...query, operator });
  };

  const toggleGroupExpanded = (groupId: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const validationError = validateQuery(query);

  // Simple mode - just a comma-separated input
  if (!isAdvancedMode) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="keywords">Keywords</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleAdvancedMode}
            className="text-xs h-6 px-2 gap-1"
          >
            <Layers className="w-3 h-3" />
            Advanced Mode
          </Button>
        </div>
        <Input
          id="keywords"
          placeholder="e.g., artificial intelligence, machine learning, GPT"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Separate multiple keywords with commas
        </p>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }

  // Advanced mode - full query builder
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Query Builder</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleAdvancedMode}
          className="text-xs h-6 px-2 gap-1"
        >
          <Search className="w-3 h-3" />
          Simple Mode
        </Button>
      </div>

      <div className="space-y-3">
        {query.groups.map((group, groupIndex) => (
          <div key={group.id}>
            {/* Group operator between groups */}
            {groupIndex > 0 && (
              <div className="flex items-center justify-center py-2">
                <Select
                  value={query.operator}
                  onValueChange={(v) => updateTopOperator(v as BooleanOperator)}
                >
                  <SelectTrigger className="w-20 h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AND">AND</SelectItem>
                    <SelectItem value="OR">OR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Group card */}
            <div className="border rounded-lg bg-muted/30">
              {/* Group header */}
              <div
                className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/50 rounded-t-lg"
                onClick={() => toggleGroupExpanded(group.id)}
              >
                <div className="flex items-center gap-2">
                  {expandedGroups.has(group.id) ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="text-sm font-medium">
                    Group {groupIndex + 1}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    ({group.conditions.filter((c) => c.term.trim()).length}{" "}
                    conditions)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={group.operator}
                    onValueChange={(v) =>
                      updateGroupOperator(group.id, v as BooleanOperator)
                    }
                  >
                    <SelectTrigger
                      className="w-16 h-6 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AND">AND</SelectItem>
                      <SelectItem value="OR">OR</SelectItem>
                    </SelectContent>
                  </Select>
                  {query.groups.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeGroup(group.id);
                      }}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Group conditions */}
              {expandedGroups.has(group.id) && (
                <div className="px-3 pb-3 space-y-2">
                  {group.conditions.map((condition, conditionIndex) => (
                    <ConditionRow
                      key={condition.id}
                      condition={condition}
                      showOperator={conditionIndex > 0}
                      groupOperator={group.operator}
                      canRemove={group.conditions.length > 1}
                      onUpdate={(updates) =>
                        updateCondition(group.id, condition.id, updates)
                      }
                      onRemove={() => removeCondition(group.id, condition.id)}
                    />
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => addCondition(group.id)}
                    className="h-7 text-xs gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add Condition
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addGroup}
          className="w-full h-8 text-xs gap-1"
        >
          <Plus className="w-3 h-3" />
          Add Group
        </Button>
      </div>

      {/* Query preview */}
      <div className="bg-muted/50 rounded-lg p-3 space-y-1">
        <p className="text-xs font-medium text-muted-foreground">
          Query Preview:
        </p>
        <p className="text-sm font-mono break-all">
          {queryToString(query) || "(empty query)"}
        </p>
      </div>

      {(validationError || error) && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {validationError || error}
        </p>
      )}
    </div>
  );
}

interface ConditionRowProps {
  condition: QueryCondition;
  showOperator: boolean;
  groupOperator: BooleanOperator;
  canRemove: boolean;
  onUpdate: (updates: Partial<QueryCondition>) => void;
  onRemove: () => void;
}

function ConditionRow({
  condition,
  showOperator,
  groupOperator,
  canRemove,
  onUpdate,
  onRemove,
}: ConditionRowProps) {
  const [showProximity, setShowProximity] = useState(
    !!condition.proximityTerm
  );

  return (
    <div className="space-y-2">
      {showOperator && (
        <div className="text-xs text-center text-muted-foreground font-medium">
          {groupOperator}
        </div>
      )}
      <div className="flex items-start gap-2">
        {/* Field selector */}
        <Select
          value={condition.field}
          onValueChange={(v) => onUpdate({ field: v as SearchField })}
        >
          <SelectTrigger className="w-24 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Any field</SelectItem>
            <SelectItem value="title">Title</SelectItem>
            <SelectItem value="content">Content</SelectItem>
            <SelectItem value="source">Source</SelectItem>
          </SelectContent>
        </Select>

        {/* Main term input */}
        <div className="flex-1 space-y-1">
          <Input
            placeholder="Enter search term..."
            value={condition.term}
            onChange={(e) => onUpdate({ term: e.target.value })}
            className="h-8 text-sm"
          />

          {/* Proximity search toggle */}
          {showProximity && (
            <div className="flex items-center gap-2 pl-2">
              <span className="text-xs text-muted-foreground">NEAR/</span>
              <Input
                type="number"
                min={1}
                max={50}
                placeholder="5"
                value={condition.proximityDistance || ""}
                onChange={(e) =>
                  onUpdate({
                    proximityDistance: parseInt(e.target.value) || undefined,
                  })
                }
                className="w-14 h-6 text-xs"
              />
              <Input
                placeholder="Second term..."
                value={condition.proximityTerm || ""}
                onChange={(e) =>
                  onUpdate({ proximityTerm: e.target.value || undefined })
                }
                className="flex-1 h-6 text-xs"
              />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1">
            <Checkbox
              id={`not-${condition.id}`}
              checked={condition.isNegated}
              onCheckedChange={(checked) =>
                onUpdate({ isNegated: checked === true })
              }
              className="h-3 w-3"
            />
            <Label
              htmlFor={`not-${condition.id}`}
              className="text-xs text-muted-foreground cursor-pointer"
            >
              NOT
            </Label>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setShowProximity(!showProximity);
              if (!showProximity) {
                onUpdate({ proximityTerm: undefined, proximityDistance: 5 });
              } else {
                onUpdate({ proximityTerm: undefined, proximityDistance: undefined });
              }
            }}
            className={`h-6 px-1 text-xs ${showProximity ? "bg-muted" : ""}`}
            title="Proximity search"
          >
            NEAR
          </Button>

          {canRemove && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
