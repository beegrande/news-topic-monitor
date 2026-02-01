/**
 * Query Builder Types and Utilities
 *
 * This module provides types and utilities for building complex search queries
 * with boolean operators, field filters, and proximity searches.
 */

// Operators for combining conditions
export type BooleanOperator = "AND" | "OR";

// Fields that can be searched
export type SearchField = "any" | "title" | "content" | "source";

// A single search condition
export interface QueryCondition {
  id: string;
  field: SearchField;
  term: string;
  isNegated: boolean;
  proximityTerm?: string; // For proximity searches: "term1 NEAR term2"
  proximityDistance?: number; // Number of words between terms
}

// A group of conditions connected by an operator
export interface QueryGroup {
  id: string;
  operator: BooleanOperator;
  conditions: QueryCondition[];
}

// The complete query structure
export interface ParsedQuery {
  groups: QueryGroup[];
  operator: BooleanOperator; // Operator between groups
}

/**
 * Generate a unique ID for conditions and groups
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

/**
 * Create an empty condition
 */
export function createEmptyCondition(): QueryCondition {
  return {
    id: generateId(),
    field: "any",
    term: "",
    isNegated: false,
  };
}

/**
 * Create an empty group with one condition
 */
export function createEmptyGroup(): QueryGroup {
  return {
    id: generateId(),
    operator: "AND",
    conditions: [createEmptyCondition()],
  };
}

/**
 * Create an empty parsed query
 */
export function createEmptyQuery(): ParsedQuery {
  return {
    groups: [createEmptyGroup()],
    operator: "AND",
  };
}

/**
 * Convert a condition to a string representation
 */
function conditionToString(condition: QueryCondition): string {
  if (!condition.term.trim()) {
    return "";
  }

  let result = "";

  // Handle negation
  if (condition.isNegated) {
    result += "NOT ";
  }

  // Handle field prefix
  if (condition.field !== "any") {
    result += `${condition.field}:`;
  }

  // Handle proximity search
  if (condition.proximityTerm && condition.proximityDistance) {
    const distance = condition.proximityDistance;
    result += `"${condition.term}" NEAR/${distance} "${condition.proximityTerm}"`;
  } else {
    // Quote terms with spaces
    const term = condition.term.trim();
    if (term.includes(" ") && !term.startsWith('"')) {
      result += `"${term}"`;
    } else {
      result += term;
    }
  }

  return result;
}

/**
 * Convert a group to a string representation
 */
function groupToString(group: QueryGroup): string {
  const validConditions = group.conditions
    .map(conditionToString)
    .filter(s => s.trim() !== "");

  if (validConditions.length === 0) {
    return "";
  }

  if (validConditions.length === 1) {
    return validConditions[0];
  }

  return `(${validConditions.join(` ${group.operator} `)})`;
}

/**
 * Convert a parsed query to a string representation
 */
export function queryToString(query: ParsedQuery): string {
  const validGroups = query.groups
    .map(groupToString)
    .filter(s => s.trim() !== "");

  if (validGroups.length === 0) {
    return "";
  }

  if (validGroups.length === 1) {
    // Remove outer parentheses if there's only one group
    const result = validGroups[0];
    if (result.startsWith("(") && result.endsWith(")")) {
      return result.slice(1, -1);
    }
    return result;
  }

  return validGroups.join(` ${query.operator} `);
}

/**
 * Parse a simple comma-separated keyword string into a query
 * This is for backwards compatibility with the existing keyword format
 */
export function parseSimpleKeywords(keywords: string): ParsedQuery {
  const terms = keywords
    .split(",")
    .map(k => k.trim())
    .filter(k => k !== "");

  if (terms.length === 0) {
    return createEmptyQuery();
  }

  return {
    groups: [{
      id: generateId(),
      operator: "OR",
      conditions: terms.map(term => ({
        id: generateId(),
        field: "any" as SearchField,
        term,
        isNegated: false,
      })),
    }],
    operator: "OR",
  };
}

/**
 * Check if a string looks like an advanced query (has operators, fields, etc.)
 */
export function isAdvancedQuery(query: string): boolean {
  const advancedPatterns = [
    /\b(AND|OR|NOT)\b/,      // Boolean operators
    /\b(title|content|source):/i,  // Field prefixes
    /NEAR\/\d+/,              // Proximity searches
    /\([^)]+\)/,              // Grouping parentheses
  ];

  return advancedPatterns.some(pattern => pattern.test(query));
}

/**
 * Parse an advanced query string back into a ParsedQuery structure
 * This is a simplified parser that handles basic cases
 */
export function parseAdvancedQuery(queryString: string): ParsedQuery {
  const trimmed = queryString.trim();

  if (!trimmed) {
    return createEmptyQuery();
  }

  // If it's not an advanced query, treat as simple keywords
  if (!isAdvancedQuery(trimmed)) {
    return parseSimpleKeywords(trimmed);
  }

  // For advanced queries, we'll do a basic parse
  // Split by top-level AND/OR (not inside parentheses)
  const groups: QueryGroup[] = [];
  let topOperator: BooleanOperator = "AND";

  // Find the top-level operator
  const topAndMatch = / AND (?![^(]*\))/;
  const topOrMatch = / OR (?![^(]*\))/;

  let parts: string[];
  if (topAndMatch.test(trimmed)) {
    topOperator = "AND";
    parts = trimmed.split(topAndMatch);
  } else if (topOrMatch.test(trimmed)) {
    topOperator = "OR";
    parts = trimmed.split(topOrMatch);
  } else {
    parts = [trimmed];
  }

  for (const part of parts) {
    const group = parseGroupString(part.trim());
    if (group) {
      groups.push(group);
    }
  }

  if (groups.length === 0) {
    return createEmptyQuery();
  }

  return {
    groups,
    operator: topOperator,
  };
}

/**
 * Parse a group string (possibly with parentheses) into a QueryGroup
 */
function parseGroupString(groupStr: string): QueryGroup | null {
  let content = groupStr;

  // Remove outer parentheses if present
  if (content.startsWith("(") && content.endsWith(")")) {
    content = content.slice(1, -1);
  }

  // Determine the operator within this group
  let operator: BooleanOperator = "AND";
  let parts: string[];

  if (/ AND /.test(content)) {
    operator = "AND";
    parts = content.split(/ AND /);
  } else if (/ OR /.test(content)) {
    operator = "OR";
    parts = content.split(/ OR /);
  } else {
    parts = [content];
  }

  const conditions: QueryCondition[] = [];

  for (const part of parts) {
    const condition = parseConditionString(part.trim());
    if (condition) {
      conditions.push(condition);
    }
  }

  if (conditions.length === 0) {
    return null;
  }

  return {
    id: generateId(),
    operator,
    conditions,
  };
}

/**
 * Parse a condition string into a QueryCondition
 */
function parseConditionString(condStr: string): QueryCondition | null {
  let content = condStr.trim();

  if (!content) {
    return null;
  }

  let isNegated = false;
  let field: SearchField = "any";
  let term = "";
  let proximityTerm: string | undefined;
  let proximityDistance: number | undefined;

  // Check for NOT prefix
  if (content.startsWith("NOT ")) {
    isNegated = true;
    content = content.slice(4).trim();
  }

  // Check for field prefix
  const fieldMatch = content.match(/^(title|content|source):/i);
  if (fieldMatch) {
    field = fieldMatch[1].toLowerCase() as SearchField;
    content = content.slice(fieldMatch[0].length).trim();
  }

  // Check for proximity search
  const proximityMatch = content.match(/"([^"]+)"\s+NEAR\/(\d+)\s+"([^"]+)"/);
  if (proximityMatch) {
    term = proximityMatch[1];
    proximityDistance = parseInt(proximityMatch[2], 10);
    proximityTerm = proximityMatch[3];
  } else {
    // Remove quotes if present
    if (content.startsWith('"') && content.endsWith('"')) {
      term = content.slice(1, -1);
    } else {
      term = content;
    }
  }

  return {
    id: generateId(),
    field,
    term,
    isNegated,
    proximityTerm,
    proximityDistance,
  };
}

/**
 * Validate a query - returns error message if invalid, null if valid
 */
export function validateQuery(query: ParsedQuery): string | null {
  const hasAnyTerm = query.groups.some(group =>
    group.conditions.some(condition => condition.term.trim() !== "")
  );

  if (!hasAnyTerm) {
    return "At least one search term is required";
  }

  // Check for invalid proximity searches
  for (const group of query.groups) {
    for (const condition of group.conditions) {
      if (condition.proximityTerm !== undefined && condition.proximityDistance !== undefined) {
        if (condition.proximityDistance < 1 || condition.proximityDistance > 50) {
          return "Proximity distance must be between 1 and 50";
        }
      }
    }
  }

  return null;
}

/**
 * Get a human-readable description of the query
 */
export function getQueryDescription(query: ParsedQuery): string {
  const groupDescriptions = query.groups.map(group => {
    const conditions = group.conditions
      .filter(c => c.term.trim())
      .map(c => {
        let desc = "";
        if (c.isNegated) desc += "NOT ";
        if (c.field !== "any") desc += `${c.field}: `;
        desc += c.term;
        if (c.proximityTerm) {
          desc += ` near "${c.proximityTerm}"`;
        }
        return desc;
      });

    if (conditions.length === 0) return "";
    if (conditions.length === 1) return conditions[0];
    return conditions.join(` ${group.operator} `);
  }).filter(d => d);

  if (groupDescriptions.length === 0) return "Empty query";
  if (groupDescriptions.length === 1) return groupDescriptions[0];
  return groupDescriptions.map(d => `(${d})`).join(` ${query.operator} `);
}
