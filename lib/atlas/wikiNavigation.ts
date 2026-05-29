import { wikiStructure } from "@/data/wikiStructure";

export type WikiArticleMeta = {
  moduleIndex: number;
  moduleTitle: string;
  sectionId: string;
  slug: string;
  title: string;
  position: number;
};

const buildCatalog = (): WikiArticleMeta[] => {
  let position = 0;

  return wikiStructure.flatMap((section, moduleIndex) =>
    section.children.map((page) => ({
      moduleIndex,
      moduleTitle: section.title,
      sectionId: section.id,
      slug: page.slug,
      title: page.title,
      position: position++,
    })),
  );
};

export const articleCatalog = buildCatalog();

export const articleBySlug = new Map<string, WikiArticleMeta>(
  articleCatalog.map((article) => [article.slug, article]),
);

export const articlesByModule = new Map<number, WikiArticleMeta[]>();

for (const article of articleCatalog) {
  const group = articlesByModule.get(article.moduleIndex) ?? [];
  group.push(article);
  articlesByModule.set(article.moduleIndex, group);
}

export const getArticle = (slug: string) =>
  articleBySlug.get(slug);

export const getAdjacentArticles = (slug: string) => {
  const article = articleBySlug.get(slug);

  if (!article) {
    return {
      previous: undefined,
      next: undefined,
    };
  }

  return {
    previous: articleCatalog[article.position - 1],
    next: articleCatalog[article.position + 1],
  };
};

export const getModuleArticles = (moduleIndex: number) =>
  articlesByModule.get(moduleIndex) ?? [];

export const getModuleBounds = (moduleIndex: number) => {
  const articles = getModuleArticles(moduleIndex);

  if (!articles.length) {
    return {
      first: undefined,
      last: undefined,
    };
  }

  return {
    first: articles[0],
    last: articles[articles.length - 1],
  };
};

export const getProgressVector = (slug: string) => {
  const article = articleBySlug.get(slug);

  if (!article) return null;

  const moduleArticles = getModuleArticles(article.moduleIndex);

  return {
    absolute: article.position + 1,
    total: articleCatalog.length,
    module: moduleArticles.findIndex((a) => a.slug === slug) + 1,
    moduleTotal: moduleArticles.length,
    completion:
      ((article.position + 1) / articleCatalog.length) * 100,
  };
};
