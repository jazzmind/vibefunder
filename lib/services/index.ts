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

// Re-export common AI service types
export type { AIResult, AIError, AIErrorType } from '../aiService';