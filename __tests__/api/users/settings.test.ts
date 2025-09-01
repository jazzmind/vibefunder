import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import app from '@/app';
import { createTestUser, createAuthHeaders, cleanupTestData } from '../../helpers/testHelpers';
import { User } from '../../../src/models/User';
import { AuditLog } from '../../../src/models/AuditLog';

describe('User Settings API', () => {
  let testUser: User;
  let authHeaders: Record<string, string>;
  let testUserId: string;

  beforeEach(async () => {
    testUser = await createTestUser({
      email: 'settings-test@example.com',
      username: 'settingsuser',
      password: 'SecurePass123!'
    });
    testUserId = testUser.id;
    authHeaders = await createAuthHeaders(testUser);
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  describe('Email Notification Preferences', () => {
    it('should get email notification preferences', async () => {
      const response = await request(app)
        .get('/api/users/settings/notifications/email')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('marketing');
      expect(response.body).toHaveProperty('updates');
      expect(response.body).toHaveProperty('alerts');
      expect(response.body).toHaveProperty('campaigns');
      expect(response.body).toHaveProperty('security');
    });

    it('should update email notification preferences', async () => {
      const preferences = {
        marketing: false,
        updates: true,
        alerts: true,
        campaigns: false,
        security: true
      };

      const response = await request(app)
        .put('/api/users/settings/notifications/email')
        .set(authHeaders)
        .send(preferences);

      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject(preferences);
    });

    it('should validate email notification preference types', async () => {
      const invalidPreferences = {
        marketing: 'invalid',
        updates: 123,
        alerts: null
      };

      const response = await request(app)
        .put('/api/users/settings/notifications/email')
        .set(authHeaders)
        .send(invalidPreferences);

      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('marketing must be a boolean');
      expect(response.body.errors).toContain('updates must be a boolean');
      expect(response.body.errors).toContain('alerts must be a boolean');
    });

    it('should handle batch email preference updates', async () => {
      const batchUpdate = {
        marketing: false,
        updates: false,
        alerts: true,
        campaigns: true,
        security: true,
        newsletters: false
      };

      const response = await request(app)
        .put('/api/users/settings/notifications/email/batch')
        .set(authHeaders)
        .send(batchUpdate);

      expect(response.status).toBe(200);
      expect(response.body.updated).toBe(6);
    });

    it('should create audit log for email preference changes', async () => {
      const preferences = { marketing: false, alerts: true };

      await request(app)
        .put('/api/users/settings/notifications/email')
        .set(authHeaders)
        .send(preferences);

      const auditLog = await AuditLog.findOne({
        user_id: testUserId,
        action: 'UPDATE_EMAIL_PREFERENCES'
      });

      expect(auditLog).toBeTruthy();
      expect(auditLog?.metadata).toMatchObject(preferences);
    });
  });

  describe('Privacy Settings', () => {
    it('should get privacy settings', async () => {
      const response = await request(app)
        .get('/api/users/settings/privacy')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('profileVisibility');
      expect(response.body).toHaveProperty('dataSharing');
      expect(response.body).toHaveProperty('searchable');
      expect(response.body).toHaveProperty('showActivity');
      expect(response.body).toHaveProperty('allowMessages');
    });

    it('should update profile visibility settings', async () => {
      const privacySettings = {
        profileVisibility: 'friends',
        dataSharing: false,
        searchable: false,
        showActivity: 'private',
        allowMessages: 'connections'
      };

      const response = await request(app)
        .put('/api/users/settings/privacy')
        .set(authHeaders)
        .send(privacySettings);

      expect(response.status).toBe(200);
      expect(response.body.data.profileVisibility).toBe('friends');
      expect(response.body.data.dataSharing).toBe(false);
    });

    it('should validate privacy setting values', async () => {
      const invalidSettings = {
        profileVisibility: 'invalid',
        showActivity: 'wrong',
        allowMessages: 'bad'
      };

      const response = await request(app)
        .put('/api/users/settings/privacy')
        .set(authHeaders)
        .send(invalidSettings);

      expect(response.status).toBe(400);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('profileVisibility must be one of'),
          expect.stringContaining('showActivity must be one of'),
          expect.stringContaining('allowMessages must be one of')
        ])
      );
    });

    it('should handle data sharing consent withdrawal', async () => {
      const response = await request(app)
        .post('/api/users/settings/privacy/withdraw-consent')
        .set(authHeaders)
        .send({ consentType: 'marketing' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Consent withdrawn successfully');
    });

    it('should create audit log for privacy changes', async () => {
      const privacySettings = { profileVisibility: 'private' };

      await request(app)
        .put('/api/users/settings/privacy')
        .set(authHeaders)
        .send(privacySettings);

      const auditLog = await AuditLog.findOne({
        user_id: testUserId,
        action: 'UPDATE_PRIVACY_SETTINGS'
      });

      expect(auditLog).toBeTruthy();
      expect(auditLog?.severity).toBe('medium');
    });
  });

  describe('Account Security Settings', () => {
    it('should get security settings', async () => {
      const response = await request(app)
        .get('/api/users/settings/security')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('twoFactorEnabled');
      expect(response.body).toHaveProperty('activeSessions');
      expect(response.body).toHaveProperty('loginAlerts');
      expect(response.body).toHaveProperty('passwordLastChanged');
    });

    it('should enable two-factor authentication', async () => {
      const response = await request(app)
        .post('/api/users/settings/security/2fa/enable')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('qrCode');
      expect(response.body).toHaveProperty('backupCodes');
      expect(response.body.message).toBe('2FA setup initiated');
    });

    it('should confirm 2FA setup with valid code', async () => {
      // First enable 2FA
      await request(app)
        .post('/api/users/settings/security/2fa/enable')
        .set(authHeaders);

      const response = await request(app)
        .post('/api/users/settings/security/2fa/confirm')
        .set(authHeaders)
        .send({ code: '123456', backupVerified: true });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('2FA enabled successfully');
    });

    it('should disable 2FA with password confirmation', async () => {
      // Assume 2FA is already enabled
      const response = await request(app)
        .post('/api/users/settings/security/2fa/disable')
        .set(authHeaders)
        .send({ password: 'SecurePass123!' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('2FA disabled successfully');
    });

    it('should get active sessions', async () => {
      const response = await request(app)
        .get('/api/users/settings/security/sessions')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.sessions)).toBe(true);
      expect(response.body.sessions[0]).toHaveProperty('id');
      expect(response.body.sessions[0]).toHaveProperty('userAgent');
      expect(response.body.sessions[0]).toHaveProperty('ipAddress');
      expect(response.body.sessions[0]).toHaveProperty('lastActivity');
    });

    it('should terminate specific session', async () => {
      const sessionsResponse = await request(app)
        .get('/api/users/settings/security/sessions')
        .set(authHeaders);

      const sessionId = sessionsResponse.body.sessions[0].id;

      const response = await request(app)
        .delete(`/api/users/settings/security/sessions/${sessionId}`)
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Session terminated successfully');
    });

    it('should terminate all other sessions', async () => {
      const response = await request(app)
        .post('/api/users/settings/security/sessions/terminate-others')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('sessions terminated');
    });

    it('should create audit log for security changes', async () => {
      await request(app)
        .post('/api/users/settings/security/2fa/enable')
        .set(authHeaders);

      const auditLog = await AuditLog.findOne({
        user_id: testUserId,
        action: 'ENABLE_2FA'
      });

      expect(auditLog).toBeTruthy();
      expect(auditLog?.severity).toBe('high');
    });
  });

  describe('Language and Timezone Preferences', () => {
    it('should get language and timezone preferences', async () => {
      const response = await request(app)
        .get('/api/users/settings/localization')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('language');
      expect(response.body).toHaveProperty('timezone');
      expect(response.body).toHaveProperty('dateFormat');
      expect(response.body).toHaveProperty('timeFormat');
    });

    it('should update language preference', async () => {
      const localizationSettings = {
        language: 'es',
        timezone: 'America/Mexico_City',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h'
      };

      const response = await request(app)
        .put('/api/users/settings/localization')
        .set(authHeaders)
        .send(localizationSettings);

      expect(response.status).toBe(200);
      expect(response.body.data.language).toBe('es');
      expect(response.body.data.timezone).toBe('America/Mexico_City');
    });

    it('should validate language codes', async () => {
      const invalidSettings = {
        language: 'invalid',
        timezone: 'Bad/Timezone'
      };

      const response = await request(app)
        .put('/api/users/settings/localization')
        .set(authHeaders)
        .send(invalidSettings);

      expect(response.status).toBe(400);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Invalid language code'),
          expect.stringContaining('Invalid timezone')
        ])
      );
    });

    it('should auto-detect timezone from request', async () => {
      const response = await request(app)
        .post('/api/users/settings/localization/auto-detect')
        .set(authHeaders)
        .set('X-Timezone', 'America/New_York');

      expect(response.status).toBe(200);
      expect(response.body.data.timezone).toBe('America/New_York');
    });
  });

  describe('Theme Preferences', () => {
    it('should get theme preferences', async () => {
      const response = await request(app)
        .get('/api/users/settings/theme')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('mode');
      expect(response.body).toHaveProperty('primaryColor');
      expect(response.body).toHaveProperty('fontSize');
      expect(response.body).toHaveProperty('highContrast');
    });

    it('should update theme to dark mode', async () => {
      const themeSettings = {
        mode: 'dark',
        primaryColor: '#1976d2',
        fontSize: 'medium',
        highContrast: false
      };

      const response = await request(app)
        .put('/api/users/settings/theme')
        .set(authHeaders)
        .send(themeSettings);

      expect(response.status).toBe(200);
      expect(response.body.data.mode).toBe('dark');
    });

    it('should validate theme values', async () => {
      const invalidTheme = {
        mode: 'invalid',
        fontSize: 'wrong',
        primaryColor: 'notahex'
      };

      const response = await request(app)
        .put('/api/users/settings/theme')
        .set(authHeaders)
        .send(invalidTheme);

      expect(response.status).toBe(400);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('mode must be one of'),
          expect.stringContaining('fontSize must be one of'),
          expect.stringContaining('primaryColor must be a valid hex color')
        ])
      );
    });

    it('should support system theme preference', async () => {
      const themeSettings = { mode: 'system' };

      const response = await request(app)
        .put('/api/users/settings/theme')
        .set(authHeaders)
        .send(themeSettings);

      expect(response.status).toBe(200);
      expect(response.body.data.mode).toBe('system');
    });
  });

  describe('Payment Method Management', () => {
    it('should get payment methods', async () => {
      const response = await request(app)
        .get('/api/users/settings/payment-methods')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.paymentMethods)).toBe(true);
      expect(response.body).toHaveProperty('defaultMethod');
    });

    it('should add payment method', async () => {
      const paymentMethod = {
        type: 'card',
        last4: '4242',
        brand: 'visa',
        expiryMonth: 12,
        expiryYear: 2025,
        stripePaymentMethodId: 'pm_test_123'
      };

      const response = await request(app)
        .post('/api/users/settings/payment-methods')
        .set(authHeaders)
        .send(paymentMethod);

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.last4).toBe('4242');
    });

    it('should set default payment method', async () => {
      const response = await request(app)
        .put('/api/users/settings/payment-methods/pm_123/default')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Default payment method updated');
    });

    it('should delete payment method', async () => {
      const response = await request(app)
        .delete('/api/users/settings/payment-methods/pm_123')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Payment method removed');
    });

    it('should prevent deletion of last payment method', async () => {
      // Assume user has only one payment method
      const response = await request(app)
        .delete('/api/users/settings/payment-methods/pm_last')
        .set(authHeaders);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Cannot delete the last payment method');
    });
  });

  describe('Connected Accounts (Social Logins)', () => {
    it('should get connected accounts', async () => {
      const response = await request(app)
        .get('/api/users/settings/connected-accounts')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.accounts)).toBe(true);
    });

    it('should connect Google account', async () => {
      const response = await request(app)
        .post('/api/users/settings/connected-accounts/google')
        .set(authHeaders)
        .send({
          googleId: 'google_123',
          email: 'user@gmail.com',
          accessToken: 'token_123'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Google account connected');
    });

    it('should disconnect social account', async () => {
      const response = await request(app)
        .delete('/api/users/settings/connected-accounts/google')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Google account disconnected');
    });

    it('should prevent disconnection if no password set', async () => {
      // Simulate user with no password (social login only)
      const response = await request(app)
        .delete('/api/users/settings/connected-accounts/google')
        .set(authHeaders);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Set a password before disconnecting');
    });

    it('should sync profile data from connected account', async () => {
      const response = await request(app)
        .post('/api/users/settings/connected-accounts/google/sync')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Profile synced successfully');
    });
  });

  describe('Authorization and Security', () => {
    it('should require authentication for settings endpoints', async () => {
      const response = await request(app)
        .get('/api/users/settings/notifications/email');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Authentication required');
    });

    it('should prevent access to other users settings', async () => {
      const otherUser = await createTestUser({
        email: 'other@example.com',
        username: 'otheruser'
      });
      const otherHeaders = await createAuthHeaders(otherUser);

      const response = await request(app)
        .get(`/api/users/${testUserId}/settings/privacy`)
        .set(otherHeaders);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Access denied');
    });

    it('should rate limit settings updates', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app)
          .put('/api/users/settings/theme')
          .set(authHeaders)
          .send({ mode: 'dark' })
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);
      expect(rateLimited).toBe(true);
    });

    it('should validate sensitive setting changes with password', async () => {
      const response = await request(app)
        .put('/api/users/settings/security/password')
        .set(authHeaders)
        .send({
          currentPassword: 'SecurePass123!',
          newPassword: 'NewSecurePass456!'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Password updated successfully');
    });

    it('should create comprehensive audit logs', async () => {
      await request(app)
        .put('/api/users/settings/privacy')
        .set(authHeaders)
        .send({ profileVisibility: 'private' });

      const auditLogs = await AuditLog.find({ user_id: testUserId });
      const privacyLog = auditLogs.find(log => log.action === 'UPDATE_PRIVACY_SETTINGS');

      expect(privacyLog).toBeTruthy();
      expect(privacyLog?.metadata).toHaveProperty('old_value');
      expect(privacyLog?.metadata).toHaveProperty('new_value');
      expect(privacyLog?.ip_address).toBeTruthy();
      expect(privacyLog?.user_agent).toBeTruthy();
    });
  });

  describe('Batch Operations and Performance', () => {
    it('should handle batch settings updates efficiently', async () => {
      const batchUpdate = {
        notifications: {
          marketing: false,
          updates: true
        },
        privacy: {
          profileVisibility: 'friends'
        },
        theme: {
          mode: 'dark'
        }
      };

      const response = await request(app)
        .put('/api/users/settings/batch')
        .set(authHeaders)
        .send(batchUpdate);

      expect(response.status).toBe(200);
      expect(response.body.updated).toBeGreaterThan(0);
    });

    it('should validate all settings in batch operations', async () => {
      const invalidBatch = {
        notifications: { marketing: 'invalid' },
        privacy: { profileVisibility: 'wrong' },
        theme: { mode: 'bad' }
      };

      const response = await request(app)
        .put('/api/users/settings/batch')
        .set(authHeaders)
        .send(invalidBatch);

      expect(response.status).toBe(400);
      expect(response.body.errors).toHaveLength(3);
    });

    it('should maintain atomicity in batch updates', async () => {
      const partiallyInvalidBatch = {
        notifications: { marketing: true },
        privacy: { profileVisibility: 'invalid' }
      };

      const response = await request(app)
        .put('/api/users/settings/batch')
        .set(authHeaders)
        .send(partiallyInvalidBatch);

      expect(response.status).toBe(400);
      // Verify no partial updates occurred
      const settingsResponse = await request(app)
        .get('/api/users/settings/notifications/email')
        .set(authHeaders);
      
      // Marketing should still be default value, not updated
      expect(settingsResponse.body.marketing).not.toBe(true);
    });
  });

  describe('Data Export and Import', () => {
    it('should export user settings', async () => {
      const response = await request(app)
        .get('/api/users/settings/export')
        .set(authHeaders);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('settings');
      expect(response.body).toHaveProperty('exportedAt');
      expect(response.body.settings).toHaveProperty('notifications');
      expect(response.body.settings).toHaveProperty('privacy');
      expect(response.body.settings).toHaveProperty('theme');
    });

    it('should import user settings', async () => {
      const settingsData = {
        notifications: { marketing: false },
        privacy: { profileVisibility: 'friends' },
        theme: { mode: 'dark' }
      };

      const response = await request(app)
        .post('/api/users/settings/import')
        .set(authHeaders)
        .send({ settings: settingsData });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Settings imported successfully');
      expect(response.body.imported).toBeGreaterThan(0);
    });

    it('should validate imported settings format', async () => {
      const invalidImport = {
        settings: {
          invalidSection: { badData: true }
        }
      };

      const response = await request(app)
        .post('/api/users/settings/import')
        .set(authHeaders)
        .send(invalidImport);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid settings format');
    });
  });
});