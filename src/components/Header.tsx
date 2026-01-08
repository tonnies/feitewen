import { useState } from "react";
import { ChevronDown, Search, Menu, X } from "lucide-react";
import { cn } from "../lib/utils";

interface HeaderProps {
  topics: string[];
  currentTopic?: string;
}

export default function Header({ topics, currentTopic }: HeaderProps) {
  const [isTopicDropdownOpen, setIsTopicDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="border-b-4 border-black bg-[--color-cream]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo/Brand */}
          <a href="/" className="flex items-center">
            <h1 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight">
              Feite Wen
            </h1>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            {/* Topic Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsTopicDropdownOpen(!isTopicDropdownOpen)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 border-2 border-black bg-white",
                  "brutalist-shadow brutalist-hover uppercase font-bold text-sm"
                )}
              >
                {currentTopic || "All Topics"}
                <ChevronDown className="w-4 h-4" />
              </button>

              {isTopicDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-56 border-4 border-black bg-white z-50 brutalist-shadow">
                  <a
                    href="/"
                    className="block px-4 py-3 border-b-2 border-black hover:bg-[--color-cream-dark] transition-colors uppercase font-bold text-sm"
                  >
                    All Topics
                  </a>
                  {topics.map((topic) => (
                    <a
                      key={topic}
                      href={`/?topic=${encodeURIComponent(topic)}`}
                      className="block px-4 py-3 border-b-2 border-black last:border-b-0 hover:bg-[--color-cream-dark] transition-colors uppercase font-bold text-sm"
                    >
                      {topic}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Search Bar (UI only) */}
            <div className="relative">
              <input
                type="text"
                placeholder="SEARCH..."
                className="w-64 px-4 py-2 border-2 border-black bg-white uppercase font-bold text-sm placeholder:text-[--color-gray] focus:outline-none focus:ring-0"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[--color-gray]" />
            </div>

            {/* About Link */}
            <a
              href="/about"
              className={cn(
                "px-4 py-2 border-2 border-black bg-white",
                "brutalist-shadow brutalist-hover uppercase font-bold text-sm"
              )}
            >
              About
            </a>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 border-2 border-black bg-white brutalist-shadow"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-t-4 border-black py-4">
            {/* Search Bar */}
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="SEARCH..."
                className="w-full px-4 py-2 border-2 border-black bg-white uppercase font-bold text-sm placeholder:text-[--color-gray] focus:outline-none focus:ring-0"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[--color-gray]" />
            </div>

            {/* Topics */}
            <div className="mb-4">
              <p className="px-4 py-2 text-xs uppercase font-bold text-[--color-gray]">Topics</p>
              <a
                href="/"
                className="block px-4 py-3 border-2 border-black bg-white mb-2 hover:bg-[--color-cream-dark] transition-colors uppercase font-bold text-sm"
              >
                All Topics
              </a>
              {topics.map((topic) => (
                <a
                  key={topic}
                  href={`/?topic=${encodeURIComponent(topic)}`}
                  className="block px-4 py-3 border-2 border-black bg-white mb-2 hover:bg-[--color-cream-dark] transition-colors uppercase font-bold text-sm"
                >
                  {topic}
                </a>
              ))}
            </div>

            {/* About Link */}
            <a
              href="/about"
              className="block px-4 py-3 border-2 border-black bg-white hover:bg-[--color-cream-dark] transition-colors uppercase font-bold text-sm"
            >
              About
            </a>
          </div>
        )}
      </div>
    </header>
  );
}
