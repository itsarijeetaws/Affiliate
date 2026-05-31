// Shared scoring logic — used by product pages and comparison pages.
// All pure functions, no React imports.

// ─── String utils ─────────────────────────────────────────────────────────────

const isJunk = (s: string) => {
  const t = s.trim();
  return !t || t === "[]" || t === "{}" || t === "null" || t === "undefined";
};

export function normalizeStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string").filter(s => !isJunk(s));
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed))
        return parsed.filter((item): item is string => typeof item === "string").filter(s => !isJunk(s));
      return isJunk(value) ? [] : [value];
    } catch {
      return isJunk(value) ? [] : [value];
    }
  }
  return [];
}

export function hasKeyword(text: string, keywords: string[]): boolean {
  return keywords.some(k => text.includes(k));
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

export function computeExpertScore(rating: number, pros: string[], cons: string[]): number {
  const base = rating * 1.7;
  const prosBonus = Math.min(0.8, (pros.length / 5) * 0.8);
  const consPenalty = Math.min(0.6, (cons.length / 4) * 0.6);
  return Math.min(10, Math.max(0, base + prosBonus - consPenalty));
}

export function computeValueScore(price: number, rating: number, altPrices: number[]): number {
  if (!altPrices.length) return rating * 2;
  const avgPrice = altPrices.reduce((a, b) => a + b, 0) / altPrices.length;
  const priceFactor = Math.min(2, avgPrice / Math.max(1, price));
  return Math.min(10, Math.max(0, (rating / 5) * priceFactor * 6 + 2));
}

// ─── Verdict ──────────────────────────────────────────────────────────────────

export interface VerdictInfo {
  label: string;
  tagline: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export function getVerdict(score: number): VerdictInfo {
  if (score >= 9.0) return {
    label: "Editor's Choice",
    tagline: "An exceptional product that leads its category. Buy with full confidence.",
    color: "#22c55e", bgColor: "rgba(34,197,94,0.08)", borderColor: "rgba(34,197,94,0.25)",
  };
  if (score >= 8.0) return {
    label: "Highly Recommended",
    tagline: "Outstanding performance and value. One of the best choices in this category.",
    color: "#FF9900", bgColor: "rgba(255,153,0,0.08)", borderColor: "rgba(255,153,0,0.25)",
  };
  if (score >= 7.0) return {
    label: "Recommended",
    tagline: "A solid, well-rounded product worth buying if it suits your needs.",
    color: "#3b82f6", bgColor: "rgba(59,130,246,0.08)", borderColor: "rgba(59,130,246,0.25)",
  };
  if (score >= 5.5) return {
    label: "Worth Considering",
    tagline: "Decent option but check alternatives before committing — there may be better fits.",
    color: "#8b5cf6", bgColor: "rgba(139,92,246,0.08)", borderColor: "rgba(139,92,246,0.25)",
  };
  return {
    label: "Has Better Alternatives",
    tagline: "Several competing products offer better performance or value at this price point.",
    color: "#ef4444", bgColor: "rgba(239,68,68,0.08)", borderColor: "rgba(239,68,68,0.25)",
  };
}

// ─── Aspect scores ────────────────────────────────────────────────────────────

export interface AspectScore { label: string; score: number; icon: string }

export function getAspectScores(rating: number, pros: string[], cons: string[]): AspectScore[] {
  const proText = pros.join(" ").toLowerCase();
  const conText = cons.join(" ").toLowerCase();
  const base = rating * 2;
  const bump = (hasGood: boolean, hasBad: boolean) =>
    Math.min(10, Math.max(2, base + (hasGood ? 0.8 : 0) - (hasBad ? 1.2 : 0)));

  return [
    { label: "Performance",     icon: "⚡",
      score: bump(hasKeyword(proText, ["fast","speed","powerful","chip","processor","smooth","performance","quick","benchmark"]),
                  hasKeyword(conText,  ["slow","lag","sluggish","heat","throttle","stutter"])) },
    { label: "Value for Money", icon: "💰",
      score: bump(hasKeyword(proText, ["value","affordable","price","budget","cheap","worth"]),
                  hasKeyword(conText,  ["expensive","costly","price","overpriced","premium price"])) },
    { label: "Build & Design",  icon: "🔩",
      score: bump(hasKeyword(proText, ["build","premium","durable","solid","aluminum","metal","quality","rugged","titanium","sealed"]),
                  hasKeyword(conText,  ["plastic","flimsy","cheap","cheap build","feels cheap"])) },
    { label: "Battery & Stamina", icon: "🔋",
      score: bump(hasKeyword(proText, ["battery","hour","charging","endurance","stamina","all-day","mah","fast charge"]),
                  hasKeyword(conText,  ["battery","drain","short battery","charge often"])) },
    { label: "Features", icon: "✨",
      score: bump(pros.length >= 5,
                  hasKeyword(conText,  ["limited","missing","lacks","no nfc","no wireless","no usb"])) },
  ];
}

// ─── Buy/skip audience ────────────────────────────────────────────────────────

export function getWhoShouldBuy(pros: string[], cons: string[], price: number): string[] {
  const pt = pros.join(" ").toLowerCase();
  const ct = cons.join(" ").toLowerCase();
  const segments: string[] = [];

  if (price < 3000)  segments.push("Budget-conscious buyers");
  if (price >= 50000) segments.push("Premium segment buyers");
  if (hasKeyword(pt, ["battery","hour","stamina","all-day"]))               segments.push("Heavy daily users");
  if (hasKeyword(pt, ["portable","compact","lightweight","slim","travel"])) segments.push("Frequent travelers");
  if (hasKeyword(pt, ["noise cancell","anc","quiet","office"]))             segments.push("Office workers & commuters");
  if (hasKeyword(pt, ["gaming","fps","esport","low latency"]))              segments.push("Gamers");
  if (hasKeyword(pt, ["camera","photo","photography","sensor","zoom","lens"])) segments.push("Photography enthusiasts");
  if (hasKeyword(pt, ["waterproof","ip67","ip68","water resist","splash","rugged"])) segments.push("Outdoor adventurers");
  if (hasKeyword(pt, ["ai","assistant","smart home","alexa","google"]))     segments.push("Smart home users");
  if (hasKeyword(pt, ["student","college","productivity","office","work"])) segments.push("Students & professionals");
  if (hasKeyword(pt, ["display","amoled","oled","screen","bright"]))        segments.push("Media & streaming lovers");
  if (hasKeyword(pt, ["5g","fast network","speed"]))                        segments.push("Power network users");

  if (segments.length === 0) segments.push("General purpose users", "Value seekers");
  return segments.slice(0, 4);
}

export function getWhoShouldSkip(cons: string[], price: number): string[] {
  const ct = cons.join(" ").toLowerCase();
  const segments: string[] = [];

  if (hasKeyword(ct, ["expensive","costly","price"]) || price > 20000) segments.push("Budget shoppers");
  if (hasKeyword(ct, ["requires iphone","android only","ios only","requires android"])) segments.push("Users outside the ecosystem");
  if (hasKeyword(ct, ["heavy","bulky","large","big"]))                    segments.push("Minimalist carry users");
  if (hasKeyword(ct, ["subscription","require subscription","paid"]))     segments.push("Users avoiding recurring costs");
  if (hasKeyword(ct, ["learning curve","complex","complicated"]))         segments.push("Non-tech-savvy users");
  if (hasKeyword(ct, ["battery","drain","1-day","short battery"]))        segments.push("Users needing multi-day battery");
  if (hasKeyword(ct, ["no headphone","no 3.5","no usb-a","limited port"])) segments.push("Users needing legacy ports");
  if (hasKeyword(ct, ["ads","bloatware","software"]))                     segments.push("Pure software experience seekers");

  if (segments.length === 0) segments.push("Those with very specific requirements");
  return segments.slice(0, 3);
}
