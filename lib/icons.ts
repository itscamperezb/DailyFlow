export const ICON_EMOJI_MAP: Record<string, string> = {
  dumbbell: '🏋️', book: '📚', briefcase: '💼', search: '🔍',
  users: '👨‍👩‍👧', moon: '🌙', folder: '📁', trophy: '🏆',
  star: '⭐', heart: '❤️', fire: '🔥', music: '🎵',
  camera: '📷', code: '💻', coffee: '☕', target: '🎯',
}

export function getIconDisplay(icon: string): string {
  if (!icon) return ''
  return ICON_EMOJI_MAP[icon] ?? icon
}
