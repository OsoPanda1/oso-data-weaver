import type { WikiSection } from "@/data/wikiStructure";

export interface WikiSearchResult {
  sectionId: string;
  sectionTitle: string;
  moduleIndex: number;
  slug: string;
  title: string;
  score: number;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getScore(query: string, ...targets: string[]): number {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) {
    return 0;
  }

  let bestScore = 0;

  for (const target of targets) {
    const normalizedTarget = normalize(target);

    if (normalizedTarget.startsWith(normalizedQuery)) {
      bestScore = Math.max(bestScore, 100 - (normalizedTarget.length - normalizedQuery.length));
      continue;
    }

    if (normalizedTarget.includes(normalizedQuery)) {
      bestScore = Math.max(bestScore, 70 - (normalizedTarget.length - normalizedQuery.length));
    }
  }

  return Math.max(bestScore, 0);
}

export function searchWikiStructure(
  sections: WikiSection[],
  rawQuery: string,
): WikiSearchResult[] {
  const query = rawQuery.trim();
  if (!query) {
    return [];
  }

  const results: WikiSearchResult[] = [];

  sections.forEach((section, moduleIndex) => {
    section.children.forEach((page) => {
      const score = getScore(query, page.title, page.slug, section.title, section.id);

      if (score > 0) {
        results.push({
          sectionId: section.id,
          sectionTitle: section.title,
          moduleIndex,
          slug: page.slug,
          title: page.title,
          score,
        });
      }
    });
  });

  return results.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
}
