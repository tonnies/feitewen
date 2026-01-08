interface NotionBlocksProps {
  blocks: any[];
}

export default function NotionBlocks({ blocks }: NotionBlocksProps) {
  const renderBlock = (block: any) => {
    const { type, id } = block;

    switch (type) {
      case "paragraph":
        return (
          <p key={id} className="mb-4 leading-relaxed">
            {block.paragraph.rich_text.map((text: any) => renderRichText(text)).filter(Boolean)}
          </p>
        );

      case "heading_1":
        return (
          <h1 key={id} className="text-4xl font-bold uppercase mb-6 mt-8">
            {block.heading_1.rich_text.map((text: any) => text.plain_text).join("")}
          </h1>
        );

      case "heading_2":
        return (
          <h2 key={id} className="text-3xl font-bold uppercase mb-4 mt-6">
            {block.heading_2.rich_text.map((text: any) => text.plain_text).join("")}
          </h2>
        );

      case "heading_3":
        return (
          <h3 key={id} className="text-2xl font-bold uppercase mb-3 mt-5">
            {block.heading_3.rich_text.map((text: any) => text.plain_text).join("")}
          </h3>
        );

      case "bulleted_list_item":
        return (
          <li key={id} className="ml-6 mb-2 list-disc">
            {block.bulleted_list_item.rich_text.map((text: any) => renderRichText(text)).filter(Boolean)}
          </li>
        );

      case "numbered_list_item":
        return (
          <li key={id} className="ml-6 mb-2 list-decimal">
            {block.numbered_list_item.rich_text.map((text: any) => renderRichText(text)).filter(Boolean)}
          </li>
        );

      case "quote":
        return (
          <blockquote
            key={id}
            className="border-l-4 border-black pl-6 my-6 italic bg-[--color-cream-dark] py-4"
          >
            {block.quote.rich_text.map((text: any) => renderRichText(text)).filter(Boolean)}
          </blockquote>
        );

      case "divider":
        return <hr key={id} className="my-8 border-t-4 border-black" />;

      case "image":
        const imageUrl = block.image.type === "external"
          ? block.image.external.url
          : block.image.file?.url;
        const caption = block.image.caption?.[0]?.plain_text || "";

        return (
          <figure key={id} className="my-8 border-4 border-black">
            <img
              src={imageUrl}
              alt={caption}
              className="w-full"
            />
            {caption && (
              <figcaption className="p-4 bg-[--color-cream-dark] text-sm border-t-4 border-black">
                {caption}
              </figcaption>
            )}
          </figure>
        );

      default:
        return null;
    }
  };

  const renderRichText = (text: any) => {
    if (!text.plain_text) return null;

    let content: React.ReactNode = text.plain_text;

    if (text.annotations.bold) {
      content = <strong>{content}</strong>;
    }
    if (text.annotations.italic) {
      content = <em>{content}</em>;
    }
    if (text.annotations.strikethrough) {
      content = <s>{content}</s>;
    }
    if (text.annotations.underline) {
      content = <u>{content}</u>;
    }
    if (text.annotations.code) {
      content = (
        <code className="px-2 py-1 bg-[--color-cream-dark] border-2 border-black font-mono text-sm">
          {content}
        </code>
      );
    }

    if (text.href) {
      content = (
        <a
          href={text.href}
          className="underline hover:bg-black hover:text-white transition-colors"
          target="_blank"
          rel="noopener noreferrer"
        >
          {content}
        </a>
      );
    }

    return content;
  };

  return (
    <div className="prose prose-lg max-w-none">
      {blocks.map((block) => renderBlock(block))}
    </div>
  );
}
