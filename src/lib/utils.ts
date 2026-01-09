import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Topic color mapping with pastel colors
export function getTopicColor(topic: string): string {
  const colorMap: Record<string, string> = {
    'Economics': 'bg-blue-200 border-blue-400',
    'Electricity': 'bg-yellow-200 border-yellow-400',
    'Politics': 'bg-purple-200 border-purple-400',
    'Crime': 'bg-red-200 border-red-400',
    'Community': 'bg-green-200 border-green-400',
    'International': 'bg-indigo-200 border-indigo-400',
    'Geopolitics': 'bg-violet-200 border-violet-400',
    'Environment': 'bg-emerald-200 border-emerald-400',
    'Education': 'bg-sky-200 border-sky-400',
    'Sport': 'bg-orange-200 border-orange-400',
    'Rugby': 'bg-amber-200 border-amber-400',
    'Local Governance': 'bg-pink-200 border-pink-400',
  };

  return colorMap[topic] || 'bg-gray-200 border-gray-400';
}
