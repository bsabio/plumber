import { db } from '@/db';
import { newsletterContent } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * MCP Resources — provide contextual data for the AI mediator.
 */

// ── plumber://newsletter/latest ──
export async function getLatestNewsletter(): Promise<{
  uri: string;
  name: string;
  description: string;
  content: string;
}> {
  const articles = db
    .select()
    .from(newsletterContent)
    .where(eq(newsletterContent.isActive, true))
    .orderBy(desc(newsletterContent.publishedAt))
    .limit(3)
    .all();

  const content = articles
    .map((a) => `## ${a.title}\n*Category: ${a.category}*\n\n${a.body}`)
    .join('\n\n---\n\n');

  return {
    uri: 'plumber://newsletter/latest',
    name: 'Latest Newsletter Content',
    description: 'The 3 most recent active newsletter articles from Pipe Dream Plumbing',
    content: content || 'No newsletter articles available.',
  };
}

// ── plumber://faq ──
export async function getFAQ(): Promise<{
  uri: string;
  name: string;
  description: string;
  content: string;
}> {
  const faqArticles = db
    .select()
    .from(newsletterContent)
    .where(eq(newsletterContent.category, 'faq'))
    .orderBy(desc(newsletterContent.publishedAt))
    .all();

  const content = faqArticles
    .map((a) => `## ${a.title}\n\n${a.body}`)
    .join('\n\n---\n\n');

  return {
    uri: 'plumber://faq',
    name: 'Frequently Asked Questions',
    description: 'FAQ content from Pipe Dream Plumbing',
    content: content || 'No FAQ articles available.',
  };
}
