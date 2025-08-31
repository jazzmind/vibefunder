// Export all AI services and their types
export { ContentEnhancementService } from './ContentEnhancementService';
export type { 
  ContentEnhancementInput, 
  ContentSuggestion, 
  ContentEnhancementResponse 
} from './ContentEnhancementService';

export { MilestoneSuggestionService } from './MilestoneSuggestionService';
export type { 
  MilestoneSuggestionInput, 
  MilestoneAcceptanceCriteria, 
  SuggestedMilestone, 
  MilestoneSuggestionResponse 
} from './MilestoneSuggestionService';

export { StretchGoalSuggestionService } from './StretchGoalSuggestionService';
export type { 
  StretchGoalSuggestionInput, 
  SuggestedStretchGoal, 
  StretchGoalSuggestionResponse 
} from './StretchGoalSuggestionService';

export { ImageGenerationService } from './ImageGenerationService';
export type { 
  ImageGenerationInput, 
  ImageGenerationResponse 
} from './ImageGenerationService';

// Export legacy function for backwards compatibility
export { generateCampaignImage } from './ImageGenerationService';
export type { ImageGenerationInput as CampaignImageData } from './ImageGenerationService';

export { ImageLibraryService } from './ImageLibraryService';
export type { 
  ImageGenerationInput as LibraryImageGenerationInput,
  ImageSearchInput,
  GeneratedImageResponse,
  ImageSearchResponse 
} from './ImageLibraryService';

// Re-export common AI service types
export type { AIResult, AIError, AIErrorType } from '@/lib/ai/aiService';