import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

const SECRET = process.env.REVALIDATE_SECRET;

// POST /api/revalidate
// Body: { secret, category, slug }
// Called by Express after a blog is saved or approved.
export async function POST(req) {
  try {
    const { secret, category, slug } = await req.json();

    if (!SECRET || secret !== SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!category || !slug) {
      return NextResponse.json({ error: 'category and slug are required' }, { status: 400 });
    }

    // Bust the article page
    revalidatePath(`/${category}/${slug}`);
    // Bust the category listing so the new article appears there too
    revalidatePath(`/${category}`);
    // Bust the sitemap so Google discovers the new article immediately
    revalidatePath('/sitemap.xml');
    // Bust llms.txt so LLM crawlers see the new article
    revalidatePath('/llms.txt');

    return NextResponse.json({ revalidated: true, path: `/${category}/${slug}` });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
