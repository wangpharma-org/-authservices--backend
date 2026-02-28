import { FindOptionsWhere, ILike, Or } from 'typeorm';

/**
 * Builds search conditions that match the search term against multiple fields
 * @param searchTerm The term to search for
 * @param searchableFields Array of field names to search within
 * @returns TypeORM where conditions using OR logic across fields
 */
export function buildSearchOptions<T extends object>(
  searchTerm: string | undefined,
  searchableFields: (keyof T)[],
): FindOptionsWhere<T> | FindOptionsWhere<T>[] | undefined {
  if (!searchTerm || !searchableFields.length) {
    return undefined;
  }

  // Create OR conditions for each searchable field
  const conditions = searchableFields.map((field) => ({
    [field]: ILike(`%${searchTerm}%`),
  })) as FindOptionsWhere<T>[];

  // Return single condition or OR array
  return conditions.length === 1 ? conditions[0] : (conditions as FindOptionsWhere<T>[]);
}

/**
 * Builds combined where conditions including search and additional filters
 * @param searchTerm The search term
 * @param searchableFields Fields to search within
 * @param additionalFilters Additional exact-match filters
 * @returns Combined TypeORM where conditions
 */
export function buildCombinedSearchOptions<T extends object>(
  searchTerm: string | undefined,
  searchableFields: (keyof T)[],
  additionalFilters?: Record<string, unknown>,
): FindOptionsWhere<T> | FindOptionsWhere<T>[] | undefined {
  const searchConditions = buildSearchOptions<T>(searchTerm, searchableFields);
  
  // Build additional filters (exact match)
  const baseFilters = {} as Record<string, unknown>;
  if (additionalFilters) {
    for (const [key, value] of Object.entries(additionalFilters)) {
      if (value !== undefined && value !== null) {
        baseFilters[key] = value;
      }
    }
  }

  // If no search term, return base filters only
  if (!searchConditions) {
    return Object.keys(baseFilters).length > 0 
      ? (baseFilters as FindOptionsWhere<T>) 
      : undefined;
  }

  // If no base filters, return search conditions only
  if (Object.keys(baseFilters).length === 0) {
    return searchConditions;
  }

  // Combine search conditions with base filters
  if (Array.isArray(searchConditions)) {
    return searchConditions.map(condition => ({
      ...baseFilters,
      ...condition,
    })) as FindOptionsWhere<T>[];
  } else {
    return {
      ...baseFilters,
      ...searchConditions,
    } as FindOptionsWhere<T>;
  }
}