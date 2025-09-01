import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import app from '../../../src/app';
import { createTestUser, createAuthHeaders, cleanupTestData } from '../../helpers/testHelpers';
import { User } from '../../../src/models/User';
import { AuditLog } from '../../../src/models/AuditLog';

describe('User Preferences API', () => {
  let testUser: User;
  let authHeaders: Record<string, string>;
  let testUserId: string;

  beforeEach(async () => {
    testUser = await createTestUser({
      email: 'preferences-test@example.com',
      username: 'preferencesuser',
      password: 'SecurePass123!'
    });
    testUserId = testUser.id;
    authHeaders = await createAuthHeaders(testUser);
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Campaign Interest Categories', () => {
    it('should get campaign interest categories', async () => {
      const response = await request(app)
        .get('/api/users/preferences/campaign-interests')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.categories)).toBe(true);
      expect(response.body).toHaveProperty('selectedCategories');
      expect(response.body).toHaveProperty('availableCategories');
    });

    it('should update campaign interest categories', async () => {
      const interests = {
        categories: ['technology', 'environment', 'education', 'health'],
        subcategories: {
          technology: ['software', 'hardware', 'ai'],
          environment: ['climate', 'renewable-energy']
        }
      };

      const response = await request(app)
        .put('/api/users/preferences/campaign-interests')
        .set(authHeaders)
        .send(interests);

      expect(response.status).toBe(200);
      expect(response.body.data.categories).toHaveLength(4);
      expect(response.body.data.subcategories.technology).toHaveLength(3);
    });

    it('should validate campaign interest categories', async () => {
      const invalidInterests = {
        categories: ['invalid-category', 'another-invalid'],
        subcategories: {
          'non-existent': ['test']
        }
      };

      const response = await request(app)
        .put('/api/users/preferences/campaign-interests')
        .set(authHeaders)
        .send(invalidInterests);

      expect(response.status).toBe(400);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Invalid category'),
          expect.stringContaining('Subcategory parent does not exist')
        ])
      );
    });

    it('should get personalized campaign recommendations', async () => {
      // First set interests
      await request(app)
        .put('/api/users/preferences/campaign-interests')
        .set(authHeaders)
        .send({ categories: ['technology', 'environment'] });

      const response = await request(app)
        .get('/api/users/preferences/campaign-recommendations')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.recommendations)).toBe(true);
      expect(response.body).toHaveProperty('score');
      expect(response.body).toHaveProperty('reasoning');
    });

    it('should track interest changes over time', async () => {
      const initialInterests = { categories: ['technology'] };
      const updatedInterests = { categories: ['technology', 'environment'] };

      await request(app)
        .put('/api/users/preferences/campaign-interests')
        .set(authHeaders)
        .send(initialInterests);

      await request(app)
        .put('/api/users/preferences/campaign-interests')
        .set(authHeaders)
        .send(updatedInterests);

      const response = await request(app)
        .get('/api/users/preferences/campaign-interests/history')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.history).toHaveLength(2);
      expect(response.body.history[0].categories).toHaveLength(1);
      expect(response.body.history[1].categories).toHaveLength(2);
    });
  });

  describe('Notification Frequency Settings', () => {
    it('should get notification frequency preferences', async () => {
      const response = await request(app)
        .get('/api/users/preferences/notification-frequency')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('push');
      expect(response.body).toHaveProperty('sms');
      expect(response.body.email).toHaveProperty('frequency');
      expect(response.body.email).toHaveProperty('quietHours');
    });

    it('should update notification frequency settings', async () => {
      const frequencies = {
        email: {
          frequency: 'weekly',
          quietHours: { start: '22:00', end: '08:00' },
          digest: true,
          batchSimilar: true
        },
        push: {
          frequency: 'immediate',
          quietHours: { start: '23:00', end: '07:00' },
          onlyImportant: true
        },
        sms: {
          frequency: 'never',
          emergencyOnly: true
        }
      };

      const response = await request(app)
        .put('/api/users/preferences/notification-frequency')
        .set(authHeaders)
        .send(frequencies);

      expect(response.status).toBe(200);
      expect(response.body.data.email.frequency).toBe('weekly');
      expect(response.body.data.push.onlyImportant).toBe(true);
    });

    it('should validate notification frequency values', async () => {
      const invalidFrequencies = {
        email: {
          frequency: 'invalid',
          quietHours: { start: '25:00', end: '30:00' }
        },
        push: {
          frequency: 'wrong'
        }
      };

      const response = await request(app)
        .put('/api/users/preferences/notification-frequency')
        .set(authHeaders)
        .send(invalidFrequencies);

      expect(response.status).toBe(400);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('frequency must be one of'),
          expect.stringContaining('Invalid time format')
        ])
      );
    });

    it('should handle timezone-aware quiet hours', async () => {
      const preferences = {
        email: {
          quietHours: {
            start: '22:00',
            end: '08:00',
            timezone: 'America/New_York'
          }
        }
      };

      const response = await request(app)
        .put('/api/users/preferences/notification-frequency')
        .set(authHeaders)
        .send(preferences);

      expect(response.status).toBe(200);
      expect(response.body.data.email.quietHours.timezone).toBe('America/New_York');
    });

    it('should respect notification frequency in delivery', async () => {
      // Set weekly frequency
      await request(app)
        .put('/api/users/preferences/notification-frequency')
        .set(authHeaders)
        .send({
          email: { frequency: 'weekly' }
        });

      // Simulate checking if notification should be sent
      const response = await request(app)
        .get('/api/users/preferences/notification-frequency/should-send')
        .set(authHeaders)
        .query({ type: 'email', category: 'campaign-update' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('shouldSend');
      expect(response.body).toHaveProperty('nextAllowedTime');
    });
  });

  describe('Content Filtering Preferences', () => {
    it('should get content filtering preferences', async () => {
      const response = await request(app)
        .get('/api/users/preferences/content-filtering')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('ageRating');
      expect(response.body).toHaveProperty('contentTypes');
      expect(response.body).toHaveProperty('blockedKeywords');
      expect(response.body).toHaveProperty('languageFilter');
    });

    it('should update content filtering preferences', async () => {
      const filters = {
        ageRating: 'PG-13',
        contentTypes: {
          violence: false,
          adult: false,
          gambling: false,
          political: true
        },
        blockedKeywords: ['spam', 'scam', 'fake'],
        languageFilter: ['en', 'es'],
        safeSearch: true
      };

      const response = await request(app)
        .put('/api/users/preferences/content-filtering')
        .set(authHeaders)
        .send(filters);

      expect(response.status).toBe(200);
      expect(response.body.data.ageRating).toBe('PG-13');
      expect(response.body.data.blockedKeywords).toHaveLength(3);
    });

    it('should validate content filter values', async () => {
      const invalidFilters = {
        ageRating: 'invalid',
        languageFilter: ['invalid-lang'],
        contentTypes: {
          nonexistent: true
        }
      };

      const response = await request(app)
        .put('/api/users/preferences/content-filtering')
        .set(authHeaders)
        .send(invalidFilters);

      expect(response.status).toBe(400);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Invalid age rating'),
          expect.stringContaining('Invalid language code'),
          expect.stringContaining('Unknown content type')
        ])
      );
    });

    it('should apply content filters to campaign search', async () => {
      // Set content filters
      await request(app)
        .put('/api/users/preferences/content-filtering')
        .set(authHeaders)
        .send({
          contentTypes: { political: false },
          blockedKeywords: ['controversial']
        });

      // Search campaigns with filters applied
      const response = await request(app)
        .get('/api/campaigns/search')
        .set(authHeaders)
        .query({ q: 'test', applyFilters: 'true' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('campaigns');
      expect(response.body).toHaveProperty('filtersApplied');
      expect(response.body.filtersApplied).toBe(true);
    });

    it('should allow temporary filter bypass', async () => {
      const response = await request(app)
        .get('/api/campaigns/search')
        .set(authHeaders)
        .query({ q: 'political', bypassFilters: 'true' });

      expect(response.status).toBe(200);
      expect(response.body.filtersApplied).toBe(false);
    });
  });

  describe('Default Currency Selection', () => {
    it('should get currency preferences', async () => {
      const response = await request(app)
        .get('/api/users/preferences/currency')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('defaultCurrency');
      expect(response.body).toHaveProperty('supportedCurrencies');
      expect(response.body).toHaveProperty('exchangeRates');
    });

    it('should update default currency', async () => {
      const currencyPrefs = {
        defaultCurrency: 'EUR',
        displayFormat: 'symbol', // symbol, code, name
        decimalPlaces: 2,
        showExchangeRates: true
      };

      const response = await request(app)
        .put('/api/users/preferences/currency')
        .set(authHeaders)
        .send(currencyPrefs);

      expect(response.status).toBe(200);
      expect(response.body.data.defaultCurrency).toBe('EUR');
      expect(response.body.data.displayFormat).toBe('symbol');
    });

    it('should validate currency codes', async () => {
      const invalidCurrency = {
        defaultCurrency: 'INVALID',
        displayFormat: 'wrong'
      };

      const response = await request(app)
        .put('/api/users/preferences/currency')
        .set(authHeaders)
        .send(invalidCurrency);

      expect(response.status).toBe(400);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Invalid currency code'),
          expect.stringContaining('displayFormat must be one of')
        ])
      );
    });

    it('should get currency-formatted amounts', async () => {
      // Set currency preference
      await request(app)
        .put('/api/users/preferences/currency')
        .set(authHeaders)
        .send({ defaultCurrency: 'GBP' });

      const response = await request(app)
        .get('/api/users/preferences/currency/format')
        .set(authHeaders)
        .query({ amount: '1234.56' });

      expect(response.status).toBe(200);
      expect(response.body.formatted).toContain('£');
      expect(response.body.formatted).toContain('1,234.56');
    });

    it('should handle currency conversion', async () => {
      const response = await request(app)
        .get('/api/users/preferences/currency/convert')
        .set(authHeaders)
        .query({
          amount: '100',
          from: 'USD',
          to: 'EUR'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('convertedAmount');
      expect(response.body).toHaveProperty('exchangeRate');
      expect(response.body).toHaveProperty('lastUpdated');
    });
  });

  describe('Communication Channel Preferences', () => {
    it('should get communication channel preferences', async () => {
      const response = await request(app)
        .get('/api/users/preferences/communication-channels')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('channels');
      expect(response.body).toHaveProperty('priorities');
      expect(response.body.channels).toHaveProperty('email');
      expect(response.body.channels).toHaveProperty('sms');
      expect(response.body.channels).toHaveProperty('push');
    });

    it('should update communication channel preferences', async () => {
      const channelPrefs = {
        channels: {
          email: { enabled: true, priority: 1 },
          sms: { enabled: false, priority: 3 },
          push: { enabled: true, priority: 2 },
          inApp: { enabled: true, priority: 1 }
        },
        fallbackOrder: ['email', 'push', 'inApp'],
        requireConfirmation: ['sms', 'email']
      };

      const response = await request(app)
        .put('/api/users/preferences/communication-channels')
        .set(authHeaders)
        .send(channelPrefs);

      expect(response.status).toBe(200);
      expect(response.body.data.channels.email.enabled).toBe(true);
      expect(response.body.data.fallbackOrder).toHaveLength(3);
    });

    it('should validate communication channel settings', async () => {
      const invalidChannels = {
        channels: {
          invalidChannel: { enabled: true },
          email: { priority: 'invalid' }
        },
        fallbackOrder: ['nonexistent']
      };

      const response = await request(app)
        .put('/api/users/preferences/communication-channels')
        .set(authHeaders)
        .send(invalidChannels);

      expect(response.status).toBe(400);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Invalid channel'),
          expect.stringContaining('priority must be a number')
        ])
      );
    });

    it('should test communication channel delivery', async () => {
      const response = await request(app)
        .post('/api/users/preferences/communication-channels/test')
        .set(authHeaders)
        .send({
          channel: 'email',
          message: 'Test message'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Test message sent successfully');
    });

    it('should handle channel-specific configurations', async () => {
      const channelConfigs = {
        email: {
          htmlFormat: true,
          includePlainText: true,
          trackOpens: false,
          trackClicks: false
        },
        push: {
          sound: 'default',
          vibrate: true,
          badge: true
        },
        sms: {
          allowLongMessages: false,
          unicode: true
        }
      };

      const response = await request(app)
        .put('/api/users/preferences/communication-channels/config')
        .set(authHeaders)
        .send(channelConfigs);

      expect(response.status).toBe(200);
      expect(response.body.data.email.htmlFormat).toBe(true);
    });
  });

  describe('Data Export and Import Functionality', () => {
    it('should export all user preferences', async () => {
      const response = await request(app)
        .get('/api/users/preferences/export')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('preferences');
      expect(response.body).toHaveProperty('exportedAt');
      expect(response.body).toHaveProperty('format');
      expect(response.body.preferences).toHaveProperty('campaignInterests');
      expect(response.body.preferences).toHaveProperty('notificationFrequency');
      expect(response.body.preferences).toHaveProperty('contentFiltering');
    });

    it('should export preferences in different formats', async () => {
      const jsonResponse = await request(app)
        .get('/api/users/preferences/export')
        .set(authHeaders)
        .query({ format: 'json' });

      expect(jsonResponse.status).toBe(200);
      expect(jsonResponse.headers['content-type']).toContain('application/json');

      const csvResponse = await request(app)
        .get('/api/users/preferences/export')
        .set(authHeaders)
        .query({ format: 'csv' });

      expect(csvResponse.status).toBe(200);
      expect(csvResponse.headers['content-type']).toContain('text/csv');
    });

    it('should import user preferences', async () => {
      const preferencesData = {
        campaignInterests: {
          categories: ['technology', 'health']
        },
        notificationFrequency: {
          email: { frequency: 'daily' }
        },
        currency: {
          defaultCurrency: 'USD'
        }
      };

      const response = await request(app)
        .post('/api/users/preferences/import')
        .set(authHeaders)
        .send({
          preferences: preferencesData,
          format: 'json'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Preferences imported successfully');
      expect(response.body.imported).toBeGreaterThan(0);
      expect(response.body.skipped).toBeGreaterThanOrEqual(0);
    });

    it('should validate imported preferences data', async () => {
      const invalidData = {
        preferences: {
          invalidSection: { badData: true },
          currency: { defaultCurrency: 'INVALID' }
        }
      };

      const response = await request(app)
        .post('/api/users/preferences/import')
        .set(authHeaders)
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Unknown preference section'),
          expect.stringContaining('Invalid currency code')
        ])
      );
    });

    it('should handle partial import with rollback', async () => {
      const partiallyValidData = {
        preferences: {
          currency: { defaultCurrency: 'USD' },
          campaignInterests: { categories: ['invalid-category'] }
        }
      };

      const response = await request(app)
        .post('/api/users/preferences/import')
        .set(authHeaders)
        .send(partiallyValidData);

      expect(response.status).toBe(400);
      
      // Verify no partial updates occurred
      const currencyResponse = await request(app)
        .get('/api/users/preferences/currency')
        .set(authHeaders);
      
      expect(currencyResponse.body.defaultCurrency).not.toBe('USD');
    });

    it('should create backup before import', async () => {
      const validData = {
        preferences: {
          currency: { defaultCurrency: 'EUR' }
        }
      };

      const response = await request(app)
        .post('/api/users/preferences/import')
        .set(authHeaders)
        .send(validData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('backupCreated');
      expect(response.body.backupCreated).toBe(true);
    });
  });

  describe('Schema Validation and Security', () => {
    it('should validate preference schemas strictly', async () => {
      const invalidPreferences = {
        campaignInterests: {
          categories: 'should-be-array',
          subcategories: ['should-be-object']
        },
        notificationFrequency: {
          email: 'should-be-object'
        }
      };

      const response = await request(app)
        .put('/api/users/preferences/batch')
        .set(authHeaders)
        .send(invalidPreferences);

      expect(response.status).toBe(400);
      expect(response.body.errors).toHaveLength(3);
      expect(response.body.schemaErrors).toBeTruthy();
    });

    it('should sanitize preference inputs', async () => {
      const maliciousInput = {
        campaignInterests: {
          categories: ['<script>alert("xss")</script>', 'technology'],
          customNote: 'Normal note with <script>evil()</script>'
        }
      };

      const response = await request(app)
        .put('/api/users/preferences/campaign-interests')
        .set(authHeaders)
        .send(maliciousInput);

      expect(response.status).toBe(200);
      // Verify malicious content was sanitized
      expect(response.body.data.categories[0]).not.toContain('<script>');
      expect(response.body.data.customNote).not.toContain('<script>');
    });

    it('should log preference changes for audit', async () => {
      const preferences = {
        campaignInterests: {
          categories: ['technology']
        }
      };

      await request(app)
        .put('/api/users/preferences/campaign-interests')
        .set(authHeaders)
        .send(preferences);

      const auditLog = await AuditLog.findOne({
        user_id: testUserId,
        action: 'UPDATE_CAMPAIGN_INTERESTS'
      });

      expect(auditLog).toBeTruthy();
      expect(auditLog?.metadata).toHaveProperty('old_value');
      expect(auditLog?.metadata).toHaveProperty('new_value');
      expect(auditLog?.severity).toBe('low');
    });

    it('should rate limit preference updates', async () => {
      const requests = Array(15).fill(null).map((_, index) =>
        request(app)
          .put('/api/users/preferences/currency')
          .set(authHeaders)
          .send({ defaultCurrency: index % 2 === 0 ? 'USD' : 'EUR' })
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);
      expect(rateLimited).toBe(true);
    });

    it('should require authentication for all preference endpoints', async () => {
      const endpoints = [
        '/api/users/preferences/campaign-interests',
        '/api/users/preferences/notification-frequency',
        '/api/users/preferences/content-filtering',
        '/api/users/preferences/currency',
        '/api/users/preferences/communication-channels'
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        expect(response.status).toBe(401);
      }
    });

    it('should prevent unauthorized access to other users preferences', async () => {
      const otherUser = await createTestUser({
        email: 'other-prefs@example.com',
        username: 'otherprefsuser'
      });
      const otherHeaders = await createAuthHeaders(otherUser);

      const response = await request(app)
        .get(`/api/users/${testUserId}/preferences/campaign-interests`)
        .set(otherHeaders);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Access denied');
    });
  });

  describe('Performance and Caching', () => {
    it('should cache frequently accessed preferences', async () => {
      // First request
      const start1 = Date.now();
      await request(app)
        .get('/api/users/preferences/campaign-interests')
        .set(authHeaders);
      const time1 = Date.now() - start1;

      // Second request (should be cached)
      const start2 = Date.now();
      await request(app)
        .get('/api/users/preferences/campaign-interests')
        .set(authHeaders);
      const time2 = Date.now() - start2;

      // Cached request should be significantly faster
      expect(time2).toBeLessThan(time1 * 0.5);
    });

    it('should invalidate cache after updates', async () => {
      // Load into cache
      await request(app)
        .get('/api/users/preferences/campaign-interests')
        .set(authHeaders);

      // Update preferences
      await request(app)
        .put('/api/users/preferences/campaign-interests')
        .set(authHeaders)
        .send({ categories: ['technology'] });

      // Subsequent get should return updated data
      const response = await request(app)
        .get('/api/users/preferences/campaign-interests')
        .set(authHeaders);

      expect(response.body.categories).toContain('technology');
    });

    it('should handle concurrent preference updates gracefully', async () => {
      const updates = Array(5).fill(null).map((_, index) =>
        request(app)
          .put('/api/users/preferences/campaign-interests')
          .set(authHeaders)
          .send({ categories: [`category-${index}`] })
      );

      const responses = await Promise.all(updates);
      
      // All should succeed or fail gracefully, no crashes
      responses.forEach(response => {
        expect([200, 409, 429]).toContain(response.status);
      });

      // Final state should be consistent
      const finalState = await request(app)
        .get('/api/users/preferences/campaign-interests')
        .set(authHeaders);

      expect(finalState.status).toBe(200);
      expect(Array.isArray(finalState.body.categories)).toBe(true);
    });
  });
});