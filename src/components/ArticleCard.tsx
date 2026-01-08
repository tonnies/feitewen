import { cn } from "../lib/utils";

interface ArticleCardProps {
  title: string;
  excerpt: string;
  publishDate: string;
  topics: string[];
  slug: string;
  whyItMatters?: string;
}

export default function ArticleCard({
  title,
  excerpt,
  publishDate,
  topics,
  slug,
  whyItMatters,
}: ArticleCardProps) {
  const formattedDate = new Date(publishDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <a
      href={`/article/${slug}`}
      className="block group"
    >
      <article
        className={cn(
          "h-full border-4 border-black bg-white p-6",
          "brutalist-shadow brutalist-hover"
        )}
      >
        {/* Topics */}
        {topics.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {topics.map((topic) => (
              <span
                key={topic}
                className="px-3 py-1 border-2 border-black bg-[--color-cream] text-xs uppercase font-bold"
              >
                {topic}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h2 className="text-2xl font-bold uppercase mb-3 leading-tight">
          {title}
        </h2>

        {/* Date */}
        <time className="block text-sm text-[--color-gray] mb-3 uppercase">
          {formattedDate}
        </time>

        {/* Excerpt */}
        {excerpt && (
          <p className="text-sm leading-relaxed mb-4">
            {excerpt}
          </p>
        )}

        {/* Why It Matters */}
        {whyItMatters && (
          <div className="border-t-2 border-black pt-4">
            <p className="text-xs uppercase font-bold mb-2">Why It Matters:</p>
            <p className="text-sm leading-relaxed">
              {whyItMatters}
            </p>
          </div>
        )}

        {/* Read More */}
        <div className="mt-4 pt-4 border-t-2 border-black">
          <span className="text-sm font-bold uppercase group-hover:underline">
            Read Full Article →
          </span>
        </div>
      </article>
    </a>
  );
}
