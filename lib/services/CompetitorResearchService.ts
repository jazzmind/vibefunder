import { MODELS } from '@/lib/ai/models';
import { searchPerplexity } from '@/lib/ai/search/base';

export class CompetitorResearchService {
  async research(productDescription: string, websiteUrl?: string): Promise<{ content: string }> {
    const system = 'You are a market analyst. Return concise competitor/alternative overview with key differentiators and notable gaps.';
    const user = `Product description: ${productDescription}\nWebsite: ${websiteUrl || 'n/a'}\nFind close competitors for this product, summarize their focus, and list key differentiators and gaps for our product.`;
    const content = await searchPerplexity(MODELS.perplexity, system, user);
    return { content };
  }
}

export default CompetitorResearchService;


