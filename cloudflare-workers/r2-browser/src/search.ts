import type { FolderIndex, FolderNode, SearchHit } from './types';

const SCORE_PARENT_EXACT = 100;
const SCORE_PARENT_SUBSTRING = 30;
const SCORE_ANCESTOR_SUBSTRING = 5;
const SCORE_PLAYLIST_BONUS = 10;
const SCORE_TOKEN_ALL_MATCH = 25;

function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
}

function tokenize(query: string): string[] {
  return normalize(query)
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function scoreFolder(node: FolderNode, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  const parent = normalize(node.parentName);
  const ancestors = node.ancestors.map(normalize);

  let score = 0;
  let allTokensHit = true;

  for (const token of tokens) {
    let tokenHit = false;
    if (parent === token) {
      score += SCORE_PARENT_EXACT;
      tokenHit = true;
    } else if (parent.includes(token)) {
      score += SCORE_PARENT_SUBSTRING;
      tokenHit = true;
    }
    for (const a of ancestors) {
      if (a.includes(token)) {
        score += SCORE_ANCESTOR_SUBSTRING;
        tokenHit = true;
      }
    }
    if (!tokenHit) allTokensHit = false;
  }

  if (score === 0) return 0;
  if (allTokensHit) score += SCORE_TOKEN_ALL_MATCH;
  if (node.hasPlaylist) score += SCORE_PLAYLIST_BONUS;
  return score;
}

export function searchIndex(
  index: FolderIndex,
  query: string,
  limit = 20,
): SearchHit[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const hits: SearchHit[] = [];
  for (const node of index.folders) {
    const score = scoreFolder(node, tokens);
    if (score > 0) {
      hits.push({
        fullPath: node.fullPath,
        parentName: node.parentName,
        score,
        hasPlaylist: node.hasPlaylist,
        fileCount: node.fileCount,
      });
    }
  }

  hits.sort((a, b) => b.score - a.score || a.fullPath.localeCompare(b.fullPath));
  return hits.slice(0, limit);
}
