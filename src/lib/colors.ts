export const LEVEL_COLORS = {
  1: { bg: 'bg-red-100', text: 'text-red-700', fill: '#EF4444', label: 'Beginning to Understand' },
  2: { bg: 'bg-orange-100', text: 'text-orange-700', fill: '#F97316', label: 'Approaching Understanding' },
  3: { bg: 'bg-green-100', text: 'text-green-700', fill: '#22C55E', label: 'Understands' },
  4: { bg: 'bg-blue-100', text: 'text-blue-700', fill: '#3B82F6', label: 'Advanced Understanding' },
} as const;

export const PLATFORM_COLORS = {
  ixl: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'IXL' },
  khan_academy: { bg: 'bg-green-100', text: 'text-green-700', label: 'Khan Academy' },
  reflex: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Reflex' },
  lexiacore5: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'LexiaCore5' },
} as const;

export type LevelKey = keyof typeof LEVEL_COLORS;
export type PlatformKey = keyof typeof PLATFORM_COLORS;

export function getLevelColor(level: number) {
  return LEVEL_COLORS[level as LevelKey] ?? { bg: 'bg-gray-100', text: 'text-gray-700', fill: '#6B7280', label: `Level ${level}` };
}

export function getPlatformColor(platform: string) {
  return PLATFORM_COLORS[platform as PlatformKey] ?? { bg: 'bg-gray-100', text: 'text-gray-700', label: platform };
}
