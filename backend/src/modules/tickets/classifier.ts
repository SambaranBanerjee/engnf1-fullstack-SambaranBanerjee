export type TicketCategory =
  | "BILLING"
  | "BUG"
  | "FEATURE_REQUEST"
  | "LOGIN"
  | "DELIVERY";

export type TicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export interface ClassificationResult {
  autoCategory: TicketCategory;
  priority: TicketPriority;
}

const CATEGORY_RULES: ReadonlyArray<{
  category: TicketCategory;
  terms: readonly string[];
}> = [
  {
    category: "BILLING",
    terms: ["refund", "invoice", "charge", "payment"],
  },
  {
    category: "LOGIN",
    terms: ["password", "2fa", "sign in", "locked out", "login"],
  },
  {
    category: "DELIVERY",
    terms: ["package", "arrived", "shipping", "tracking", "delivery"],
  },
  {
    category: "BUG",
    terms: ["crash", "error", "500", "exception", "broken"],
  },
];

const PRIORITY_RULES: ReadonlyArray<{
  priority: Extract<TicketPriority, "URGENT" | "HIGH">;
  terms: readonly string[];
}> = [
  {
    priority: "URGENT",
    terms: ["urgent", "production down", "locked out"],
  },
  {
    priority: "HIGH",
    terms: ["error", "refund", "not arrived"],
  },
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function normalizeTicketText(subject: string, body: string): string {
  return `${subject} ${body}`.toLowerCase().replace(/\s+/g, " ").trim();
}

function matchesTerm(normalizedText: string, term: string): boolean {
  const normalizedTerm = term.toLowerCase().replace(/\s+/g, " ").trim();
  if (!normalizedTerm) return false;

  // Multi-word phrases match as normalized substrings; single tokens use word boundaries
  if (normalizedTerm.includes(" ")) {
    return normalizedText.includes(normalizedTerm);
  }

  const wordRegex = new RegExp(`\\b${escapeRegex(normalizedTerm)}\\b`, "i");
  return wordRegex.test(normalizedText);
}

export function classifyTicket(
  subject: string,
  body: string,
): ClassificationResult {
  const text = normalizeTicketText(subject, body);

  let autoCategory: TicketCategory = "FEATURE_REQUEST";
  for (const rule of CATEGORY_RULES) {
    if (rule.terms.some((term) => matchesTerm(text, term))) {
      autoCategory = rule.category;
      break;
    }
  }

  let priority: TicketPriority = "MEDIUM";
  for (const rule of PRIORITY_RULES) {
    if (rule.terms.some((term) => matchesTerm(text, term))) {
      priority = rule.priority;
      break;
    }
  }

  return { autoCategory, priority };
}