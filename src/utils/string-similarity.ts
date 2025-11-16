/**
 * String similarity and distance utilities
 */

/**
 * Calculate Levenshtein distance between two strings
 * @param str1 First string
 * @param str2 Second string
 * @returns The minimum number of single-character edits needed to transform str1 into str2
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]) + 1;
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate similarity score between query and target string
 * Combines Levenshtein distance, substring matching, and word overlap
 * @param query The query string
 * @param target The target string to compare against
 * @returns A similarity score between 0 (completely different) and 1 (identical)
 */
export function calculateSimilarityScore(query: string, target: string): number {
  const queryLower = query.toLowerCase().trim();
  const targetLower = target.toLowerCase().trim();

  // Exact match gets highest score
  if (queryLower === targetLower) return 1.0;

  // Substring match bonus
  const substringBonus = targetLower.includes(queryLower) ? 0.3 : 0;

  // Normalized Levenshtein distance (0 = identical, 1 = completely different)
  const maxLen = Math.max(queryLower.length, targetLower.length);
  const levDistance = levenshteinDistance(queryLower, targetLower);
  const normalizedLevDistance = 1 - levDistance / maxLen;

  // Word overlap score
  const queryWords = new Set(queryLower.split(/\s+/));
  const targetWords = new Set(targetLower.split(/\s+/));
  const intersection = new Set(
    [...queryWords].filter((x) => targetWords.has(x)),
  );
  const union = new Set([...queryWords, ...targetWords]);
  const wordOverlapScore = union.size > 0 ? intersection.size / union.size : 0;

  // Combined score with weights
  const combinedScore =
    normalizedLevDistance * 0.4 + wordOverlapScore * 0.3 + substringBonus;

  return combinedScore;
}
