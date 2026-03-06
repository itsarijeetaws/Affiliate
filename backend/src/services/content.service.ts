type ContentInput = {
  productName: string;
  category: string;
  features: string[];
  pros: string[];
  cons: string[];
};

export type GeneratedArticle = {
  title: string;
  sections: {
    introduction: string;
    overview: string;
    keyFeatures: string;
    prosCons: string;
    whoShouldBuy: string;
    buyingGuide: string;
    faq: string;
    conclusion: string;
  };
  faq: Array<{ question: string; answer: string }>;
};

// Replace with your AI provider call if OPENAI/Claude/etc is configured.
export async function generateStructuredReview(input: ContentInput): Promise<GeneratedArticle> {
  return {
    title: `${input.productName} Review: Is It Worth It?`,
    sections: {
      introduction: `This in-depth review covers ${input.productName} in the ${input.category} category.`,
      overview: `${input.productName} is designed for users who need reliability and consistent results.`,
      keyFeatures: `Key features include ${input.features.join(", ")}.`,
      prosCons: `Pros: ${input.pros.join(", ")}. Cons: ${input.cons.join(", ")}.`,
      whoShouldBuy: `${input.productName} is a strong fit for users prioritizing value and performance.`,
      buyingGuide: `Compare specs, budget, warranty, and support before purchasing.`,
      faq: `Below are the most common questions users ask before buying.`,
      conclusion: `Overall, ${input.productName} is a solid choice for most buyers in this segment.`
    },
    faq: [
      {
        question: `Is ${input.productName} good for beginners?`,
        answer: "Yes, most beginners can use it without a steep learning curve."
      },
      {
        question: "How often should I compare prices?",
        answer: "At least weekly, because marketplace prices can change quickly."
      }
    ]
  };
}

export function articleToHtml(article: GeneratedArticle): string {
  return `
    <h1>${article.title}</h1>
    <h2>Introduction</h2>
    <p>${article.sections.introduction}</p>
    <h2>Product Overview</h2>
    <p>${article.sections.overview}</p>
    <h2>Key Features</h2>
    <p>${article.sections.keyFeatures}</p>
    <h2>Pros and Cons</h2>
    <p>${article.sections.prosCons}</p>
    <h2>Who Should Buy It</h2>
    <p>${article.sections.whoShouldBuy}</p>
    <h2>Buying Guide</h2>
    <p>${article.sections.buyingGuide}</p>
    <h2>FAQ</h2>
    ${article.faq.map((q) => `<h3>${q.question}</h3><p>${q.answer}</p>`).join("")}
    <h2>Conclusion</h2>
    <p>${article.sections.conclusion}</p>
  `;
}
