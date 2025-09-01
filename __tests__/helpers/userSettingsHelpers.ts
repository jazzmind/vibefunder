import { User } from '../../src/models/User';
import { UserSettings } from '../../src/models/UserSettings';
import { UserPreferences } from '../../src/models/UserPreferences';

/**
 * Helper functions for user settings and preferences testing
 */

export interface TestUserSettings {
  notifications?: {
    marketing?: boolean;
    updates?: boolean;
    alerts?: boolean;
    campaigns?: boolean;
    security?: boolean;
  };
  privacy?: {
    profileVisibility?: 'public' | 'friends' | 'private';
    dataSharing?: boolean;
    searchable?: boolean;
    showActivity?: 'public' | 'friends' | 'private';
    allowMessages?: 'everyone' | 'connections' | 'none';
  };
  security?: {
    twoFactorEnabled?: boolean;
    loginAlerts?: boolean;
    sessionTimeout?: number;
  };
  localization?: {
    language?: string;
    timezone?: string;
    dateFormat?: string;
    timeFormat?: '12h' | '24h';
  };
  theme?: {
    mode?: 'light' | 'dark' | 'system';
    primaryColor?: string;
    fontSize?: 'small' | 'medium' | 'large';
    highContrast?: boolean;
  };
}

export interface TestUserPreferences {
  campaignInterests?: {
    categories?: string[];
    subcategories?: Record<string, string[]>;
  };
  notificationFrequency?: {
    email?: {
      frequency?: 'immediate' | 'daily' | 'weekly' | 'never';
      quietHours?: { start: string; end: string; timezone?: string };
      digest?: boolean;
      batchSimilar?: boolean;
    };
    push?: {
      frequency?: 'immediate' | 'daily' | 'weekly' | 'never';
      quietHours?: { start: string; end: string; timezone?: string };
      onlyImportant?: boolean;
    };
    sms?: {
      frequency?: 'immediate' | 'daily' | 'weekly' | 'never';
      emergencyOnly?: boolean;
    };
  };
  contentFiltering?: {
    ageRating?: 'G' | 'PG' | 'PG-13' | 'R' | 'NC-17';
    contentTypes?: Record<string, boolean>;
    blockedKeywords?: string[];
    languageFilter?: string[];
    safeSearch?: boolean;
  };
  currency?: {
    defaultCurrency?: string;
    displayFormat?: 'symbol' | 'code' | 'name';
    decimalPlaces?: number;
    showExchangeRates?: boolean;
  };
  communicationChannels?: {
    channels?: Record<string, { enabled: boolean; priority: number }>;
    fallbackOrder?: string[];
    requireConfirmation?: string[];
  };
}

/**
 * Create test user settings with default values
 */
export async function createTestUserSettings(
  user: User,
  customSettings: TestUserSettings = {}
): Promise<UserSettings> {
  const defaultSettings: TestUserSettings = {
    notifications: {
      marketing: true,
      updates: true,
      alerts: true,
      campaigns: true,
      security: true,
    },
    privacy: {
      profileVisibility: 'public',
      dataSharing: true,
      searchable: true,
      showActivity: 'public',
      allowMessages: 'everyone',
    },
    security: {
      twoFactorEnabled: false,
      loginAlerts: true,
      sessionTimeout: 3600,
    },
    localization: {
      language: 'en',
      timezone: 'UTC',
      dateFormat: 'YYYY-MM-DD',
      timeFormat: '24h',
    },
    theme: {
      mode: 'light',
      primaryColor: '#1976d2',
      fontSize: 'medium',
      highContrast: false,
    },
  };

  const mergedSettings = mergeDeep(defaultSettings, customSettings);
  
  const userSettings = new UserSettings({
    user_id: user.id,
    ...mergedSettings,
  });

  return await userSettings.save();
}

/**
 * Create test user preferences with default values
 */
export async function createTestUserPreferences(
  user: User,
  customPreferences: TestUserPreferences = {}
): Promise<UserPreferences> {
  const defaultPreferences: TestUserPreferences = {
    campaignInterests: {
      categories: ['technology', 'environment'],
      subcategories: {
        technology: ['software', 'ai'],
        environment: ['climate'],
      },
    },
    notificationFrequency: {
      email: {
        frequency: 'daily',
        quietHours: { start: '22:00', end: '08:00' },
        digest: true,
        batchSimilar: false,
      },
      push: {
        frequency: 'immediate',
        quietHours: { start: '23:00', end: '07:00' },
        onlyImportant: false,
      },
      sms: {
        frequency: 'never',
        emergencyOnly: true,
      },
    },
    contentFiltering: {
      ageRating: 'PG-13',
      contentTypes: {
        violence: false,
        adult: false,
        gambling: false,
        political: true,
      },
      blockedKeywords: [],
      languageFilter: ['en'],
      safeSearch: true,
    },
    currency: {
      defaultCurrency: 'USD',
      displayFormat: 'symbol',
      decimalPlaces: 2,
      showExchangeRates: false,
    },
    communicationChannels: {
      channels: {
        email: { enabled: true, priority: 1 },
        push: { enabled: true, priority: 2 },
        sms: { enabled: false, priority: 3 },
      },
      fallbackOrder: ['email', 'push'],
      requireConfirmation: ['sms'],
    },
  };

  const mergedPreferences = mergeDeep(defaultPreferences, customPreferences);
  
  const userPreferences = new UserPreferences({
    user_id: user.id,
    ...mergedPreferences,
  });

  return await userPreferences.save();
}

/**
 * Generate test data for campaign interest categories
 */
export function generateCampaignInterestCategories(): string[] {
  return [
    'technology',
    'environment',
    'education',
    'health',
    'arts',
    'sports',
    'community',
    'business',
    'social-causes',
    'research',
    'food',
    'travel',
    'entertainment',
    'fashion',
    'automotive',
  ];
}

/**
 * Generate test data for subcategories
 */
export function generateSubcategories(): Record<string, string[]> {
  return {
    technology: ['software', 'hardware', 'ai', 'blockchain', 'mobile', 'web'],
    environment: ['climate', 'renewable-energy', 'conservation', 'recycling'],
    education: ['online-learning', 'stem', 'literacy', 'scholarships'],
    health: ['mental-health', 'fitness', 'nutrition', 'medical-research'],
    arts: ['music', 'visual-arts', 'theater', 'literature', 'film'],
    sports: ['team-sports', 'individual-sports', 'extreme-sports', 'youth-sports'],
    community: ['local-events', 'volunteering', 'neighborhood', 'civic'],
    business: ['startups', 'small-business', 'entrepreneurship', 'innovation'],
  };
}

/**
 * Generate test notification frequency scenarios
 */
export function generateNotificationFrequencyScenarios(): Array<{
  name: string;
  settings: TestUserPreferences['notificationFrequency'];
}> {
  return [
    {
      name: 'High Frequency User',
      settings: {
        email: { frequency: 'immediate', digest: false, batchSimilar: false },
        push: { frequency: 'immediate', onlyImportant: false },
        sms: { frequency: 'immediate', emergencyOnly: false },
      },
    },
    {
      name: 'Moderate User',
      settings: {
        email: { frequency: 'daily', digest: true, batchSimilar: true },
        push: { frequency: 'daily', onlyImportant: true },
        sms: { frequency: 'never', emergencyOnly: true },
      },
    },
    {
      name: 'Low Frequency User',
      settings: {
        email: { frequency: 'weekly', digest: true, batchSimilar: true },
        push: { frequency: 'weekly', onlyImportant: true },
        sms: { frequency: 'never', emergencyOnly: true },
      },
    },
    {
      name: 'Minimal Notifications',
      settings: {
        email: { frequency: 'never' },
        push: { frequency: 'never' },
        sms: { frequency: 'never', emergencyOnly: true },
      },
    },
  ];
}

/**
 * Generate test content filtering scenarios
 */
export function generateContentFilteringScenarios(): Array<{
  name: string;
  settings: TestUserPreferences['contentFiltering'];
}> {
  return [
    {
      name: 'Family Friendly',
      settings: {
        ageRating: 'G',
        contentTypes: {
          violence: false,
          adult: false,
          gambling: false,
          political: false,
        },
        blockedKeywords: ['violence', 'adult', 'controversial'],
        safeSearch: true,
      },
    },
    {
      name: 'Adult User',
      settings: {
        ageRating: 'R',
        contentTypes: {
          violence: true,
          adult: true,
          gambling: true,
          political: true,
        },
        blockedKeywords: [],
        safeSearch: false,
      },
    },
    {
      name: 'Conservative Filter',
      settings: {
        ageRating: 'PG',
        contentTypes: {
          violence: false,
          adult: false,
          gambling: false,
          political: false,
        },
        blockedKeywords: ['explicit', 'controversial', 'mature'],
        safeSearch: true,
      },
    },
  ];
}

/**
 * Generate test currency preferences
 */
export function generateCurrencyPreferences(): Array<{
  currency: string;
  region: string;
  settings: TestUserPreferences['currency'];
}> {
  return [
    {
      currency: 'USD',
      region: 'United States',
      settings: {
        defaultCurrency: 'USD',
        displayFormat: 'symbol',
        decimalPlaces: 2,
        showExchangeRates: false,
      },
    },
    {
      currency: 'EUR',
      region: 'Europe',
      settings: {
        defaultCurrency: 'EUR',
        displayFormat: 'symbol',
        decimalPlaces: 2,
        showExchangeRates: true,
      },
    },
    {
      currency: 'GBP',
      region: 'United Kingdom',
      settings: {
        defaultCurrency: 'GBP',
        displayFormat: 'symbol',
        decimalPlaces: 2,
        showExchangeRates: true,
      },
    },
    {
      currency: 'JPY',
      region: 'Japan',
      settings: {
        defaultCurrency: 'JPY',
        displayFormat: 'symbol',
        decimalPlaces: 0,
        showExchangeRates: true,
      },
    },
  ];
}

/**
 * Validate settings schema
 */
export function validateSettingsSchema(settings: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate notifications
  if (settings.notifications) {
    const notificationKeys = ['marketing', 'updates', 'alerts', 'campaigns', 'security'];
    for (const key of notificationKeys) {
      if (settings.notifications[key] !== undefined && typeof settings.notifications[key] !== 'boolean') {
        errors.push(`notifications.${key} must be a boolean`);
      }
    }
  }

  // Validate privacy settings
  if (settings.privacy) {
    if (settings.privacy.profileVisibility && 
        !['public', 'friends', 'private'].includes(settings.privacy.profileVisibility)) {
      errors.push('privacy.profileVisibility must be one of: public, friends, private');
    }
    
    if (settings.privacy.showActivity && 
        !['public', 'friends', 'private'].includes(settings.privacy.showActivity)) {
      errors.push('privacy.showActivity must be one of: public, friends, private');
    }
  }

  // Validate theme settings
  if (settings.theme) {
    if (settings.theme.mode && !['light', 'dark', 'system'].includes(settings.theme.mode)) {
      errors.push('theme.mode must be one of: light, dark, system');
    }
    
    if (settings.theme.fontSize && !['small', 'medium', 'large'].includes(settings.theme.fontSize)) {
      errors.push('theme.fontSize must be one of: small, medium, large');
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Validate preferences schema
 */
export function validatePreferencesSchema(preferences: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate campaign interests
  if (preferences.campaignInterests) {
    if (preferences.campaignInterests.categories && 
        !Array.isArray(preferences.campaignInterests.categories)) {
      errors.push('campaignInterests.categories must be an array');
    }
  }

  // Validate notification frequency
  if (preferences.notificationFrequency) {
    const validFrequencies = ['immediate', 'daily', 'weekly', 'never'];
    ['email', 'push', 'sms'].forEach(channel => {
      if (preferences.notificationFrequency[channel]?.frequency &&
          !validFrequencies.includes(preferences.notificationFrequency[channel].frequency)) {
        errors.push(`notificationFrequency.${channel}.frequency must be one of: ${validFrequencies.join(', ')}`);
      }
    });
  }

  // Validate content filtering
  if (preferences.contentFiltering) {
    const validRatings = ['G', 'PG', 'PG-13', 'R', 'NC-17'];
    if (preferences.contentFiltering.ageRating &&
        !validRatings.includes(preferences.contentFiltering.ageRating)) {
      errors.push(`contentFiltering.ageRating must be one of: ${validRatings.join(', ')}`);
    }
  }

  // Validate currency
  if (preferences.currency) {
    const validFormats = ['symbol', 'code', 'name'];
    if (preferences.currency.displayFormat &&
        !validFormats.includes(preferences.currency.displayFormat)) {
      errors.push(`currency.displayFormat must be one of: ${validFormats.join(', ')}`);
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Deep merge utility function
 */
function mergeDeep(target: any, source: any): any {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = mergeDeep(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  
  return output;
}

function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Mock audit log entry for testing
 */
export function createMockAuditLogEntry(userId: string, action: string, metadata: any = {}) {
  return {
    id: `audit_${Date.now()}`,
    user_id: userId,
    action,
    metadata,
    severity: 'low',
    ip_address: '127.0.0.1',
    user_agent: 'Jest Test Runner',
    created_at: new Date(),
  };
}

/**
 * Create test session data
 */
export function createTestSessionData(userId: string) {
  return {
    id: `session_${Date.now()}`,
    user_id: userId,
    ip_address: '127.0.0.1',
    user_agent: 'Mozilla/5.0 (Test Browser)',
    last_activity: new Date(),
    created_at: new Date(),
    expires_at: new Date(Date.now() + 3600000), // 1 hour
  };
}

/**
 * Generate realistic test data patterns
 */
export function generateRealisticUserBehavior(): {
  settingsUpdates: Array<{ timestamp: Date; changes: any }>;
  preferenceUpdates: Array<{ timestamp: Date; changes: any }>;
} {
  const now = new Date();
  const settingsUpdates = [];
  const preferenceUpdates = [];

  // Simulate gradual preference evolution over time
  for (let i = 30; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    
    if (i === 30) {
      // Initial setup
      settingsUpdates.push({
        timestamp: date,
        changes: { theme: { mode: 'light' }, notifications: { marketing: true } },
      });
      preferenceUpdates.push({
        timestamp: date,
        changes: { campaignInterests: { categories: ['technology'] } },
      });
    } else if (i === 20) {
      // User discovers more interests
      preferenceUpdates.push({
        timestamp: date,
        changes: { 
          campaignInterests: { 
            categories: ['technology', 'environment', 'education'] 
          } 
        },
      });
    } else if (i === 10) {
      // User becomes more privacy conscious
      settingsUpdates.push({
        timestamp: date,
        changes: { 
          privacy: { profileVisibility: 'friends', dataSharing: false },
          notifications: { marketing: false }
        },
      });
    } else if (i === 5) {
      // User switches to dark mode
      settingsUpdates.push({
        timestamp: date,
        changes: { theme: { mode: 'dark' } },
      });
    }
  }

  return { settingsUpdates, preferenceUpdates };
}