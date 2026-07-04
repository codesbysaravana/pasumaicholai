const numberWordMap: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
  hundred: 100,
  thousand: 1000,
};

const categoryMap: Array<{ category: "fruit" | "vegetable" | "grain" | "other"; keywords: string[] }> = [
  { category: "fruit", keywords: ["fruit", "fruits", "pazham", "பழம்"] },
  { category: "vegetable", keywords: ["vegetable", "vegetables", "veggie", "kaikari", "காய்கறி"] },
  { category: "grain", keywords: ["grain", "grains", "cereal", "dhaniyam", "தானியம்"] },
  { category: "other", keywords: ["other", "others", "misc", "மற்றவை"] },
];

export function cleanTranscript(transcript: string): string {
  return transcript.replace(/\s+/g, " ").trim();
}

export function extractNumber(value: string): number | null {
  const cleaned = cleanTranscript(value).toLowerCase();
  const directMatch = cleaned.match(/-?\d+(\.\d+)?/);
  if (directMatch) {
    const parsed = Number(directMatch[0]);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const tokens = cleaned
    .replace(/[^a-z\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  if (!tokens.length) {
    return null;
  }

  let total = 0;
  let current = 0;

  for (const token of tokens) {
    const mapped = numberWordMap[token];
    if (mapped === undefined) {
      continue;
    }

    if (mapped === 100 || mapped === 1000) {
      current = (current || 1) * mapped;
      if (mapped === 1000) {
        total += current;
        current = 0;
      }
      continue;
    }

    current += mapped;
  }

  const result = total + current;
  return result > 0 ? result : null;
}

export function extractCategory(transcript: string): "fruit" | "vegetable" | "grain" | "other" | null {
  const cleaned = cleanTranscript(transcript).toLowerCase();
  const match = categoryMap.find((item) => item.keywords.some((keyword) => cleaned.includes(keyword)));
  return match?.category ?? null;
}
