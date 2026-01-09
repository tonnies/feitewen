import { cn } from "../lib/utils";

interface ArticleCardProps {
  title: string;
  excerpt: string;
  publishDate: string;
  topics: string[];
  slug: string;
  coverImage?: string;
}

export default function ArticleCard({
  title,
  excerpt,
  publishDate,
  topics,
  slug,
  coverImage,
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
          "h-full border-4 border-black bg-white overflow-hidden",
          "brutalist-shadow brutalist-hover flex flex-col"
        )}
      >
        {/* Top Section: Topics and Title (White Background) */}
        <div className="p-4 sm:p-6">
          {/* Topics */}
          {topics.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {topics.map((topic) => (
                <span
                  key={topic}
                  className="px-2 py-1 border-2 border-black bg-[--color-cream] text-xs uppercase font-bold break-words"
                >
                  {topic}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-bold uppercase leading-tight break-words">
            {title}
          </h2>
        </div>

        {/* Bottom Section: Date, Excerpt, and Read More */}
        {coverImage ? (
          /* With Cover Image */
          <div
            className="relative p-4 sm:p-6 flex-1 flex flex-col justify-end bg-cover bg-center"
            style={{ backgroundImage: `url(${coverImage})` }}
          >
            {/* Dark Overlay for Text Readability */}
            <div className="absolute inset-0 bg-black bg-opacity-60"></div>

            {/* Content */}
            <div className="relative z-10">
              {/* Date */}
              <time className="block text-sm text-white mb-3 uppercase font-bold">
                {formattedDate}
              </time>

              {/* Excerpt */}
              {excerpt && (
                <p className="text-sm leading-relaxed mb-4 break-words text-white">
                  {excerpt}
                </p>
              )}

              {/* Read More */}
              <div className="pt-4 border-t-2 border-white">
                <span className="text-sm font-bold uppercase group-hover:underline text-white">
                  Read Full Article →
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Without Cover Image (Original Style) */
          <div className="p-4 sm:p-6 flex-1 flex flex-col justify-end">
            {/* Date */}
            <time className="block text-sm text-[--color-gray] mb-3 uppercase">
              {formattedDate}
            </time>

            {/* Excerpt */}
            {excerpt && (
              <p className="text-sm leading-relaxed mb-4 break-words">
                {excerpt}
              </p>
            )}

            {/* Read More */}
            <div className="pt-4 border-t-2 border-black">
              <span className="text-sm font-bold uppercase group-hover:underline">
                Read Full Article →
              </span>
            </div>
          </div>
        )}
      </article>
    </a>
  );
}
