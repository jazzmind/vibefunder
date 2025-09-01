import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import request from 'supertest';
import app from '../../../app';
import { User } from '../../../models/User';
import { generateTestToken, createTestUser, cleanupTestData } from '../../helpers/testHelpers';
import { uploadImage, deleteImage } from '../../../services/imageService';

// Mock external services
jest.mock('../../../services/imageService');
const mockUploadImage = uploadImage as jest.MockedFunction<typeof uploadImage>;
const mockDeleteImage = deleteImage as jest.MockedFunction<typeof deleteImage>;

describe('User Profile API', () => {
  let testUser: User;
  let otherUser: User;
  let adminUser: User;
  let userToken: string;
  let otherUserToken: string;
  let adminToken: string;

  beforeEach(async () => {
    // Create test users with different roles
    testUser = await createTestUser({
      email: 'testuser@example.com',
      name: 'Test User',
      bio: 'Original test bio',
      avatar: 'https://example.com/avatar.jpg',
      isPublic: true,
      socialLinks: {
        twitter: 'https://twitter.com/testuser',
        linkedin: 'https://linkedin.com/in/testuser'
      }
    });

    otherUser = await createTestUser({
      email: 'other@example.com',
      name: 'Other User',
      bio: 'Other user bio',
      isPublic: false,
      role: 'user'
    });

    adminUser = await createTestUser({
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin'
    });

    userToken = generateTestToken(testUser);
    otherUserToken = generateTestToken(otherUser);
    adminToken = generateTestToken(adminUser);
  });

  afterEach(async () => {
    await cleanupTestData();
    jest.clearAllMocks();
  });

  describe('GET /api/users/:id/profile', () => {
    describe('Public Profile Access', () => {
      it('should return public profile fields for unauthenticated users', async () => {
        const response = await request(app)
          .get(`/api/users/${testUser.id}/profile`)
          .expect(200);

        expect(response.body).toHaveProperty('id', testUser.id);
        expect(response.body).toHaveProperty('name', 'Test User');
        expect(response.body).toHaveProperty('avatar');
        expect(response.body).toHaveProperty('bio');
        expect(response.body).toHaveProperty('socialLinks');
        
        // Should not include private fields
        expect(response.body).not.toHaveProperty('email');
        expect(response.body).not.toHaveProperty('phone');
        expect(response.body).not.toHaveProperty('address');
        expect(response.body).not.toHaveProperty('preferences');
      });

      it('should return 404 for private profiles when unauthenticated', async () => {
        await request(app)
          .get(`/api/users/${otherUser.id}/profile`)
          .expect(404);
      });

      it('should return public fields for authenticated users viewing others', async () => {
        const response = await request(app)
          .get(`/api/users/${testUser.id}/profile`)
          .set('Authorization', `Bearer ${otherUserToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('name');
        expect(response.body).not.toHaveProperty('email');
      });
    });

    describe('Own Profile Access', () => {
      it('should return full profile for user viewing own profile', async () => {
        const response = await request(app)
          .get(`/api/users/${testUser.id}/profile`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('id', testUser.id);
        expect(response.body).toHaveProperty('name', 'Test User');
        expect(response.body).toHaveProperty('email', 'testuser@example.com');
        expect(response.body).toHaveProperty('bio');
        expect(response.body).toHaveProperty('avatar');
        expect(response.body).toHaveProperty('socialLinks');
        expect(response.body).toHaveProperty('isPublic', true);
        expect(response.body).toHaveProperty('preferences');
        expect(response.body).toHaveProperty('createdAt');
        expect(response.body).toHaveProperty('updatedAt');
      });

      it('should include private fields when user accesses own private profile', async () => {
        const response = await request(app)
          .get(`/api/users/${otherUser.id}/profile`)
          .set('Authorization', `Bearer ${otherUserToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('email', 'other@example.com');
        expect(response.body).toHaveProperty('isPublic', false);
      });
    });

    describe('Admin Access', () => {
      it('should allow admin to view any profile with all fields', async () => {
        const response = await request(app)
          .get(`/api/users/${otherUser.id}/profile`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('email', 'other@example.com');
        expect(response.body).toHaveProperty('role', 'user');
        expect(response.body).toHaveProperty('isPublic', false);
        expect(response.body).toHaveProperty('preferences');
      });
    });

    describe('Error Cases', () => {
      it('should return 404 for non-existent user', async () => {
        await request(app)
          .get('/api/users/99999/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(404);
      });

      it('should return 401 for invalid token', async () => {
        await request(app)
          .get(`/api/users/${testUser.id}/profile`)
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);
      });
    });
  });

  describe('PUT /api/users/:id/profile', () => {
    describe('Profile Information Updates', () => {
      it('should update basic profile information', async () => {
        const updateData = {
          name: 'Updated Test User',
          bio: 'Updated bio with new information',
          isPublic: false
        };

        const response = await request(app)
          .put(`/api/users/${testUser.id}/profile`)
          .set('Authorization', `Bearer ${userToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body).toHaveProperty('name', 'Updated Test User');
        expect(response.body).toHaveProperty('bio', 'Updated bio with new information');
        expect(response.body).toHaveProperty('isPublic', false);
        expect(response.body).toHaveProperty('updatedAt');
      });

      it('should update social links', async () => {
        const updateData = {
          socialLinks: {
            twitter: 'https://twitter.com/updated',
            linkedin: 'https://linkedin.com/in/updated',
            github: 'https://github.com/updated',
            website: 'https://example.com'
          }
        };

        const response = await request(app)
          .put(`/api/users/${testUser.id}/profile`)
          .set('Authorization', `Bearer ${userToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body.socialLinks).toMatchObject(updateData.socialLinks);
      });

      it('should allow partial updates', async () => {
        const updateData = {
          bio: 'Only updating bio'
        };

        const response = await request(app)
          .put(`/api/users/${testUser.id}/profile`)
          .set('Authorization', `Bearer ${userToken}`)
          .send(updateData)
          .expect(200);

        expect(response.body).toHaveProperty('bio', 'Only updating bio');
        expect(response.body).toHaveProperty('name', 'Test User'); // Should remain unchanged
      });
    });

    describe('Avatar Upload and Management', () => {
      it('should update avatar with valid image upload', async () => {
        const mockImageUrl = 'https://cdn.example.com/avatar-new.jpg';
        mockUploadImage.mockResolvedValue({
          url: mockImageUrl,
          publicId: 'avatar-123',
          format: 'jpg',
          width: 300,
          height: 300
        });

        const response = await request(app)
          .put(`/api/users/${testUser.id}/profile`)
          .set('Authorization', `Bearer ${userToken}`)
          .attach('avatar', Buffer.from('fake-image-data'), 'avatar.jpg')
          .expect(200);

        expect(response.body).toHaveProperty('avatar', mockImageUrl);
        expect(mockUploadImage).toHaveBeenCalledWith(
          expect.any(Buffer),
          expect.objectContaining({
            folder: 'avatars',
            transformation: expect.any(Object)
          })
        );
      });

      it('should delete old avatar when uploading new one', async () => {
        const oldAvatar = 'https://cdn.example.com/old-avatar.jpg';
        await User.findByIdAndUpdate(testUser.id, { avatar: oldAvatar });

        mockUploadImage.mockResolvedValue({
          url: 'https://cdn.example.com/new-avatar.jpg',
          publicId: 'avatar-456'
        });

        await request(app)
          .put(`/api/users/${testUser.id}/profile`)
          .set('Authorization', `Bearer ${userToken}`)
          .attach('avatar', Buffer.from('fake-image-data'), 'new-avatar.jpg')
          .expect(200);

        expect(mockDeleteImage).toHaveBeenCalled();
      });

      it('should reject invalid image formats', async () => {
        await request(app)
          .put(`/api/users/${testUser.id}/profile`)
          .set('Authorization', `Bearer ${userToken}`)
          .attach('avatar', Buffer.from('not-an-image'), 'document.pdf')
          .expect(400);
      });

      it('should reject oversized images', async () => {
        const largeImageBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB

        await request(app)
          .put(`/api/users/${testUser.id}/profile`)
          .set('Authorization', `Bearer ${userToken}`)
          .attach('avatar', largeImageBuffer, 'large-image.jpg')
          .expect(400);
      });
    });

    describe('Validation Rules', () => {
      it('should validate name length requirements', async () => {
        const response = await request(app)
          .put(`/api/users/${testUser.id}/profile`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ name: 'a' }) // Too short
          .expect(400);

        expect(response.body).toHaveProperty('errors');
        expect(response.body.errors).toContain('Name must be at least 2 characters long');
      });

      it('should validate bio length limits', async () => {
        const longBio = 'a'.repeat(1001); // Assuming 1000 char limit

        const response = await request(app)
          .put(`/api/users/${testUser.id}/profile`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ bio: longBio })
          .expect(400);

        expect(response.body.errors).toContain('Bio must not exceed 1000 characters');
      });

      it('should validate social links URLs', async () => {
        const response = await request(app)
          .put(`/api/users/${testUser.id}/profile`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            socialLinks: {
              twitter: 'not-a-valid-url',
              linkedin: 'https://linkedin.com/valid'
            }
          })
          .expect(400);

        expect(response.body.errors).toContain('Twitter URL is invalid');
      });

      it('should validate specific social platform URL formats', async () => {
        const response = await request(app)
          .put(`/api/users/${testUser.id}/profile`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            socialLinks: {
              twitter: 'https://facebook.com/wrong-platform'
            }
          })
          .expect(400);

        expect(response.body.errors).toContain('Twitter URL must be from twitter.com domain');
      });

      it('should allow empty/null values for optional fields', async () => {
        await request(app)
          .put(`/api/users/${testUser.id}/profile`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            bio: '',
            avatar: null,
            socialLinks: {}
          })
          .expect(200);
      });
    });

    describe('Authorization and Permissions', () => {
      it('should prevent users from updating others profiles', async () => {
        await request(app)
          .put(`/api/users/${otherUser.id}/profile`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ name: 'Hacked Name' })
          .expect(403);
      });

      it('should allow admin to update any user profile', async () => {
        const response = await request(app)
          .put(`/api/users/${testUser.id}/profile`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: 'Admin Updated Name' })
          .expect(200);

        expect(response.body).toHaveProperty('name', 'Admin Updated Name');
      });

      it('should prevent updating protected fields by regular users', async () => {
        const response = await request(app)
          .put(`/api/users/${testUser.id}/profile`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            role: 'admin',
            email: 'hacked@example.com',
            isVerified: true
          })
          .expect(400);

        expect(response.body.errors).toContain('Cannot modify protected fields');
      });

      it('should allow admin to update protected fields', async () => {
        await request(app)
          .put(`/api/users/${testUser.id}/profile`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            role: 'moderator',
            isVerified: true
          })
          .expect(200);
      });
    });

    describe('Error Cases', () => {
      it('should return 404 for non-existent user', async () => {
        await request(app)
          .put('/api/users/99999/profile')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ name: 'Test' })
          .expect(404);
      });

      it('should return 401 for unauthenticated requests', async () => {
        await request(app)
          .put(`/api/users/${testUser.id}/profile`)
          .send({ name: 'Test' })
          .expect(401);
      });

      it('should handle database errors gracefully', async () => {
        // Mock database error
        jest.spyOn(User, 'findByIdAndUpdate').mockRejectedValue(new Error('Database error'));

        await request(app)
          .put(`/api/users/${testUser.id}/profile`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ name: 'Test' })
          .expect(500);
      });
    });
  });

  describe('Profile Privacy Settings', () => {
    it('should update privacy settings', async () => {
      const response = await request(app)
        .put(`/api/users/${testUser.id}/profile`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          isPublic: false,
          preferences: {
            showEmail: false,
            showSocialLinks: true,
            allowMessagesFromStrangers: false
          }
        })
        .expect(200);

      expect(response.body).toHaveProperty('isPublic', false);
      expect(response.body.preferences).toMatchObject({
        showEmail: false,
        showSocialLinks: true,
        allowMessagesFromStrangers: false
      });
    });

    it('should respect privacy settings in profile visibility', async () => {
      // Set profile to private
      await User.findByIdAndUpdate(testUser.id, {
        isPublic: false,
        preferences: { showEmail: false }
      });

      // Try to access as another user
      const response = await request(app)
        .get(`/api/users/${testUser.id}/profile`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(404); // Should not be visible
    });
  });

  describe('DELETE /api/users/:id', () => {
    describe('Account Deletion Flow', () => {
      it('should allow user to delete their own account', async () => {
        const response = await request(app)
          .delete(`/api/users/${testUser.id}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ confirmDeletion: true })
          .expect(200);

        expect(response.body).toHaveProperty('message', 'Account successfully deleted');

        // Verify user is actually deleted
        const deletedUser = await User.findById(testUser.id);
        expect(deletedUser).toBeNull();
      });

      it('should require confirmation for account deletion', async () => {
        await request(app)
          .delete(`/api/users/${testUser.id}`)
          .set('Authorization', `Bearer ${userToken}`)
          .expect(400);
      });

      it('should clean up associated data on account deletion', async () => {
        // Mock cleanup functions
        const mockCleanupUserData = jest.fn();
        const mockDeleteUserImages = jest.fn();

        await request(app)
          .delete(`/api/users/${testUser.id}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ confirmDeletion: true })
          .expect(200);

        // Verify avatar is deleted from cloud storage
        if (testUser.avatar) {
          expect(mockDeleteImage).toHaveBeenCalled();
        }
      });

      it('should prevent deletion of other users accounts', async () => {
        await request(app)
          .delete(`/api/users/${otherUser.id}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ confirmDeletion: true })
          .expect(403);
      });

      it('should allow admin to delete any account', async () => {
        const response = await request(app)
          .delete(`/api/users/${testUser.id}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ confirmDeletion: true })
          .expect(200);

        expect(response.body).toHaveProperty('message', 'Account successfully deleted');
      });

      it('should handle soft deletion if configured', async () => {
        // Assuming soft delete is enabled
        process.env.SOFT_DELETE_USERS = 'true';

        await request(app)
          .delete(`/api/users/${testUser.id}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ confirmDeletion: true })
          .expect(200);

        // User should still exist but marked as deleted
        const user = await User.findById(testUser.id);
        expect(user).toBeTruthy();
        expect(user.isDeleted).toBe(true);
        expect(user.deletedAt).toBeTruthy();
      });
    });
  });

  describe('Field-Level Permissions', () => {
    it('should apply field-level permissions based on relationship', async () => {
      // Create users with different relationships
      const friendUser = await createTestUser({
        email: 'friend@example.com',
        name: 'Friend User',
        friends: [testUser.id]
      });
      const friendToken = generateTestToken(friendUser);

      const response = await request(app)
        .get(`/api/users/${testUser.id}/profile`)
        .set('Authorization', `Bearer ${friendToken}`)
        .expect(200);

      // Friends might see more fields than strangers
      expect(response.body).toHaveProperty('name');
      // But still not private fields like email
      expect(response.body).not.toHaveProperty('email');
    });

    it('should respect field visibility preferences', async () => {
      // Update user preferences
      await User.findByIdAndUpdate(testUser.id, {
        preferences: {
          showEmail: true, // Show email to authenticated users
          showSocialLinks: false // Hide social links
        }
      });

      const response = await request(app)
        .get(`/api/users/${testUser.id}/profile`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('email');
      expect(response.body).not.toHaveProperty('socialLinks');
    });
  });

  describe('Rate Limiting and Security', () => {
    it('should rate limit profile update requests', async () => {
      // Attempt multiple rapid updates
      const updatePromises = Array(10).fill(null).map(() =>
        request(app)
          .put(`/api/users/${testUser.id}/profile`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ name: 'Rapid Update' })
      );

      const responses = await Promise.all(updatePromises);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should sanitize input to prevent XSS attacks', async () => {
      const maliciousInput = '<script>alert("xss")</script>';

      const response = await request(app)
        .put(`/api/users/${testUser.id}/profile`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: maliciousInput,
          bio: `<img src="x" onerror="alert('xss')">`
        })
        .expect(200);

      expect(response.body.name).not.toContain('<script>');
      expect(response.body.bio).not.toContain('onerror');
    });

    it('should validate CSRF tokens for state-changing operations', async () => {
      // This test assumes CSRF protection is implemented
      await request(app)
        .put(`/api/users/${testUser.id}/profile`)
        .set('Authorization', `Bearer ${userToken}`)
        // Missing CSRF token
        .send({ name: 'Test' })
        .expect(403);
    });
  });

  describe('Performance and Caching', () => {
    it('should cache frequently accessed public profiles', async () => {
      // First request
      await request(app)
        .get(`/api/users/${testUser.id}/profile`)
        .expect(200);

      // Second request should be faster (cached)
      const start = Date.now();
      await request(app)
        .get(`/api/users/${testUser.id}/profile`)
        .expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(50); // Should be much faster
    });

    it('should invalidate cache on profile updates', async () => {
      // Cache the profile
      await request(app)
        .get(`/api/users/${testUser.id}/profile`)
        .expect(200);

      // Update the profile
      await request(app)
        .put(`/api/users/${testUser.id}/profile`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      // Next request should reflect the update
      const response = await request(app)
        .get(`/api/users/${testUser.id}/profile`)
        .expect(200);

      expect(response.body).toHaveProperty('name', 'Updated Name');
    });
  });
});