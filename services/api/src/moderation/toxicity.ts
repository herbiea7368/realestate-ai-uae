const toxicWords = ['scam', 'fraud', 'hate', 'kill'];

export function scoreText(text: string): number {
  const lower = text.toLowerCase();
  return toxicWords.some((word) => lower.includes(word)) ? 1 : 0;
}

