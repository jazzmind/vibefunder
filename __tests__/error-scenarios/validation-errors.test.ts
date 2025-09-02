/**
 * Comprehensive Validation Error Tests
 * Tests all validation error paths to improve branch coverage
 */

import { z } from 'zod';

// Mock validation schemas for testing
const campaignSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  goal: z.number().positive('Goal must be positive').max(1000000, 'Goal too high'),
  email: z.string().email('Invalid email format'),
  tags: z.array(z.string()).max(5, 'Too many tags'),
  startDate: z.string().datetime('Invalid start date format'),
  endDate: z.string().datetime('Invalid end date format'),
  category: z.enum(['tech', 'art', 'music', 'film'], {
    errorMap: () => ({ message: 'Invalid category' })
  }),
  website: z.string().url('Invalid website URL').optional(),
  socialMedia: z.object({
    twitter: z.string().url('Invalid Twitter URL').optional(),
    facebook: z.string().url('Invalid Facebook URL').optional(),
  }).optional(),
});

const userSchema = z.object({
  name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
  email: z.string().email('Invalid email format'),
  age: z.number().int('Age must be integer').min(13, 'Must be at least 13').max(120, 'Invalid age'),
  password: z.string().min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain special character'),
  confirmPassword: z.string(),
  terms: z.boolean().refine((val) => val === true, 'Must accept terms'),
  phone: z.string().regex(/^\+?[\d\s-()]+$/, 'Invalid phone number').optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const pledgeSchema = z.object({
  amount: z.number().positive('Pledge amount must be positive').min(1, 'Minimum pledge is $1'),
  campaignId: z.string().uuid('Invalid campaign ID'),
  anonymous: z.boolean().optional(),
  message: z.string().max(500, 'Message too long').optional(),
  tier: z.string().optional(),
});

describe('Validation Error Scenarios', () => {
  describe('Invalid Input Data', () => {
    it('should handle empty string for required field', () => {
      const result = campaignSchema.safeParse({
        title: '',
        description: 'Valid description here',
        goal: 1000,
        email: 'test@example.com',
        tags: [],
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
        category: 'tech'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(1);
        expect(result.error.issues[0].path).toEqual(['title']);
        expect(result.error.issues[0].message).toBe('Title is required');
      }
    });

    it('should handle null values for required fields', () => {
      const result = campaignSchema.safeParse({
        title: null,
        description: null,
        goal: null,
        email: null,
        tags: null,
        startDate: null,
        endDate: null,
        category: null
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        const titleError = result.error.issues.find(issue => issue.path[0] === 'title');
        expect(titleError?.message).toContain('Expected string, received null');
      }
    });

    it('should handle undefined values', () => {
      const result = campaignSchema.safeParse({
        // All required fields missing (undefined)
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        const requiredFields = ['title', 'description', 'goal', 'email', 'tags', 'startDate', 'endDate', 'category'];
        requiredFields.forEach(field => {
          const fieldError = result.error.issues.find(issue => issue.path[0] === field);
          expect(fieldError).toBeDefined();
        });
      }
    });

    it('should handle array input when object expected', () => {
      const result = campaignSchema.safeParse([
        'invalid', 'input', 'as', 'array'
      ]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Expected object, received array');
      }
    });

    it('should handle primitive input when object expected', () => {
      const result = campaignSchema.safeParse('invalid-string-input');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Expected object, received string');
      }
    });
  });

  describe('Missing Required Fields', () => {
    it('should handle missing title field', () => {
      const result = campaignSchema.safeParse({
        description: 'Valid description here',
        goal: 1000,
        email: 'test@example.com',
        tags: [],
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
        category: 'tech'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const titleError = result.error.issues.find(issue => issue.path[0] === 'title');
        expect(titleError?.code).toBe('invalid_type');
        expect(titleError?.message).toBe('Required');
      }
    });

    it('should handle multiple missing required fields', () => {
      const result = campaignSchema.safeParse({
        goal: 1000,
        tags: []
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const missingFields = ['title', 'description', 'email', 'startDate', 'endDate', 'category'];
        missingFields.forEach(field => {
          const fieldError = result.error.issues.find(issue => issue.path[0] === field);
          expect(fieldError?.message).toBe('Required');
        });
      }
    });

    it('should handle missing nested required fields', () => {
      const userResult = userSchema.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
        // password missing
        confirmPassword: 'password123',
        terms: true
      });

      expect(userResult.success).toBe(false);
      if (!userResult.success) {
        const passwordError = userResult.error.issues.find(issue => issue.path[0] === 'password');
        expect(passwordError?.message).toBe('Required');
      }
    });
  });

  describe('Type Mismatches', () => {
    it('should handle string where number expected', () => {
      const result = campaignSchema.safeParse({
        title: 'Valid Title',
        description: 'Valid description here',
        goal: 'not-a-number', // Should be number
        email: 'test@example.com',
        tags: [],
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
        category: 'tech'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const goalError = result.error.issues.find(issue => issue.path[0] === 'goal');
        expect(goalError?.message).toBe('Expected number, received string');
      }
    });

    it('should handle number where string expected', () => {
      const result = campaignSchema.safeParse({
        title: 12345, // Should be string
        description: 'Valid description here',
        goal: 1000,
        email: 'test@example.com',
        tags: [],
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
        category: 'tech'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const titleError = result.error.issues.find(issue => issue.path[0] === 'title');
        expect(titleError?.message).toBe('Expected string, received number');
      }
    });

    it('should handle object where array expected', () => {
      const result = campaignSchema.safeParse({
        title: 'Valid Title',
        description: 'Valid description here',
        goal: 1000,
        email: 'test@example.com',
        tags: { invalid: 'object' }, // Should be array
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
        category: 'tech'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const tagsError = result.error.issues.find(issue => issue.path[0] === 'tags');
        expect(tagsError?.message).toBe('Expected array, received object');
      }
    });

    it('should handle boolean where string expected', () => {
      const result = campaignSchema.safeParse({
        title: true, // Should be string
        description: 'Valid description here',
        goal: 1000,
        email: 'test@example.com',
        tags: [],
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
        category: 'tech'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const titleError = result.error.issues.find(issue => issue.path[0] === 'title');
        expect(titleError?.message).toBe('Expected string, received boolean');
      }
    });
  });

  describe('Boundary Violations', () => {
    it('should handle string too long', () => {
      const longTitle = 'x'.repeat(101); // Exceeds max length of 100
      
      const result = campaignSchema.safeParse({
        title: longTitle,
        description: 'Valid description here',
        goal: 1000,
        email: 'test@example.com',
        tags: [],
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
        category: 'tech'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const titleError = result.error.issues.find(issue => issue.path[0] === 'title');
        expect(titleError?.message).toBe('Title too long');
      }
    });

    it('should handle string too short', () => {
      const shortDescription = 'short'; // Less than minimum 10 characters
      
      const result = campaignSchema.safeParse({
        title: 'Valid Title',
        description: shortDescription,
        goal: 1000,
        email: 'test@example.com',
        tags: [],
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
        category: 'tech'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const descError = result.error.issues.find(issue => issue.path[0] === 'description');
        expect(descError?.message).toBe('Description must be at least 10 characters');
      }
    });

    it('should handle number too small', () => {
      const result = campaignSchema.safeParse({
        title: 'Valid Title',
        description: 'Valid description here',
        goal: -100, // Negative number, should be positive
        email: 'test@example.com',
        tags: [],
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
        category: 'tech'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const goalError = result.error.issues.find(issue => issue.path[0] === 'goal');
        expect(goalError?.message).toBe('Goal must be positive');
      }
    });

    it('should handle number too large', () => {
      const result = campaignSchema.safeParse({
        title: 'Valid Title',
        description: 'Valid description here',
        goal: 2000000, // Exceeds maximum of 1,000,000
        email: 'test@example.com',
        tags: [],
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
        category: 'tech'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const goalError = result.error.issues.find(issue => issue.path[0] === 'goal');
        expect(goalError?.message).toBe('Goal too high');
      }
    });

    it('should handle array too long', () => {
      const tooManyTags = ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6']; // Exceeds max of 5
      
      const result = campaignSchema.safeParse({
        title: 'Valid Title',
        description: 'Valid description here',
        goal: 1000,
        email: 'test@example.com',
        tags: tooManyTags,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
        category: 'tech'
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const tagsError = result.error.issues.find(issue => issue.path[0] === 'tags');
        expect(tagsError?.message).toBe('Too many tags');
      }
    });

    it('should handle age boundary violations', () => {
      // Test too young
      const tooYoungResult = userSchema.safeParse({
        name: 'Young User',
        email: 'young@example.com',
        age: 12, // Under minimum age of 13
        password: 'ValidPass123!',
        confirmPassword: 'ValidPass123!',
        terms: true
      });

      expect(tooYoungResult.success).toBe(false);
      if (!tooYoungResult.success) {
        const ageError = tooYoungResult.error.issues.find(issue => issue.path[0] === 'age');
        expect(ageError?.message).toBe('Must be at least 13');
      }

      // Test too old
      const tooOldResult = userSchema.safeParse({
        name: 'Old User',
        email: 'old@example.com',
        age: 150, // Over maximum age of 120
        password: 'ValidPass123!',
        confirmPassword: 'ValidPass123!',
        terms: true
      });

      expect(tooOldResult.success).toBe(false);
      if (!tooOldResult.success) {
        const ageError = tooOldResult.error.issues.find(issue => issue.path[0] === 'age');
        expect(ageError?.message).toBe('Invalid age');
      }
    });
  });

  describe('Format Validation Errors', () => {
    it('should handle invalid email format', () => {
      const invalidEmails = [
        'not-an-email',
        '@domain.com',
        'user@',
        'user@domain',
        'user name@domain.com',
        'user..double.dot@domain.com'
      ];

      invalidEmails.forEach(email => {
        const result = campaignSchema.safeParse({
          title: 'Valid Title',
          description: 'Valid description here',
          goal: 1000,
          email,
          tags: [],
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-12-31T23:59:59Z',
          category: 'tech'
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          const emailError = result.error.issues.find(issue => issue.path[0] === 'email');
          expect(emailError?.message).toBe('Invalid email format');
        }
      });
    });

    it('should handle invalid datetime format', () => {
      const invalidDates = [
        'not-a-date',
        '2024-01-01',
        '2024-01-01 12:00:00',
        'January 1, 2024',
        '01/01/2024',
        '2024-13-01T00:00:00Z' // Invalid month
      ];

      invalidDates.forEach(date => {
        const result = campaignSchema.safeParse({
          title: 'Valid Title',
          description: 'Valid description here',
          goal: 1000,
          email: 'test@example.com',
          tags: [],
          startDate: date,
          endDate: '2024-12-31T23:59:59Z',
          category: 'tech'
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          const dateError = result.error.issues.find(issue => issue.path[0] === 'startDate');
          expect(dateError?.message).toBe('Invalid start date format');
        }
      });
    });

    it('should handle invalid URL format', () => {
      const invalidUrls = [
        'not-a-url',
        'http://',
        'ftp://invalid-protocol.com',
        'javascript:alert("xss")',
        'www.missing-protocol.com',
        'http://space in url.com'
      ];

      invalidUrls.forEach(url => {
        const result = campaignSchema.safeParse({
          title: 'Valid Title',
          description: 'Valid description here',
          goal: 1000,
          email: 'test@example.com',
          tags: [],
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-12-31T23:59:59Z',
          category: 'tech',
          website: url
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          const urlError = result.error.issues.find(issue => issue.path[0] === 'website');
          expect(urlError?.message).toBe('Invalid website URL');
        }
      });
    });

    it('should handle invalid enum values', () => {
      const invalidCategories = [
        'invalid-category',
        'TECH', // Case sensitive
        'art-and-craft',
        123,
        null,
        undefined
      ];

      invalidCategories.forEach(category => {
        const result = campaignSchema.safeParse({
          title: 'Valid Title',
          description: 'Valid description here',
          goal: 1000,
          email: 'test@example.com',
          tags: [],
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-12-31T23:59:59Z',
          category
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          const categoryError = result.error.issues.find(issue => issue.path[0] === 'category');
          expect(categoryError?.message).toBe('Invalid category');
        }
      });
    });

    it('should handle invalid UUID format', () => {
      const invalidUuids = [
        'not-a-uuid',
        '12345',
        'abcd-efgh-ijkl-mnop',
        '123e4567-e89b-12d3-a456-42661417400g', // Invalid character 'g'
        '123e4567-e89b-12d3-a456-426614174000', // Too many characters
        '123e4567-e89b-12d3-a456-42661417400' // Too few characters
      ];

      invalidUuids.forEach(uuid => {
        const result = pledgeSchema.safeParse({
          amount: 100,
          campaignId: uuid,
          anonymous: false
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          const uuidError = result.error.issues.find(issue => issue.path[0] === 'campaignId');
          expect(uuidError?.message).toBe('Invalid campaign ID');
        }
      });
    });
  });

  describe('Complex Validation Scenarios', () => {
    it('should handle password complexity validation failures', () => {
      const weakPasswords = [
        'short',           // Too short
        'alllowercase',    // Missing uppercase
        'ALLUPPERCASE',    // Missing lowercase
        'NoNumbers',       // Missing numbers
        'NoSpecial123',    // Missing special characters
        '12345678'         // Only numbers
      ];

      weakPasswords.forEach(password => {
        const result = userSchema.safeParse({
          name: 'John Doe',
          email: 'john@example.com',
          age: 25,
          password,
          confirmPassword: password,
          terms: true
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          const passwordErrors = result.error.issues.filter(issue => issue.path[0] === 'password');
          expect(passwordErrors.length).toBeGreaterThan(0);
        }
      });
    });

    it('should handle password confirmation mismatch', () => {
      const result = userSchema.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
        password: 'ValidPass123!',
        confirmPassword: 'DifferentPass456@',
        terms: true
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const confirmError = result.error.issues.find(issue => 
          issue.path[0] === 'confirmPassword' && issue.message === "Passwords don't match"
        );
        expect(confirmError).toBeDefined();
      }
    });

    it('should handle custom refinement validation failures', () => {
      const result = userSchema.safeParse({
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
        password: 'ValidPass123!',
        confirmPassword: 'ValidPass123!',
        terms: false // Must be true
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const termsError = result.error.issues.find(issue => issue.path[0] === 'terms');
        expect(termsError?.message).toBe('Must accept terms');
      }
    });

    it('should handle multiple validation errors simultaneously', () => {
      const result = userSchema.safeParse({
        name: '', // Too short
        email: 'invalid-email', // Invalid format
        age: 10, // Too young
        password: 'weak', // Too short and weak
        confirmPassword: 'different', // Doesn't match
        terms: false // Must be true
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(5);
        
        const fieldErrors = {
          name: result.error.issues.filter(issue => issue.path[0] === 'name'),
          email: result.error.issues.filter(issue => issue.path[0] === 'email'),
          age: result.error.issues.filter(issue => issue.path[0] === 'age'),
          password: result.error.issues.filter(issue => issue.path[0] === 'password'),
          terms: result.error.issues.filter(issue => issue.path[0] === 'terms')
        };

        Object.values(fieldErrors).forEach(errors => {
          expect(errors.length).toBeGreaterThan(0);
        });
      }
    });
  });

  describe('Nested Object Validation Errors', () => {
    it('should handle nested object validation failures', () => {
      const result = campaignSchema.safeParse({
        title: 'Valid Title',
        description: 'Valid description here',
        goal: 1000,
        email: 'test@example.com',
        tags: [],
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
        category: 'tech',
        socialMedia: {
          twitter: 'not-a-valid-url',
          facebook: 'also-not-valid'
        }
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const twitterError = result.error.issues.find(issue => 
          issue.path[0] === 'socialMedia' && issue.path[1] === 'twitter'
        );
        const facebookError = result.error.issues.find(issue => 
          issue.path[0] === 'socialMedia' && issue.path[1] === 'facebook'
        );

        expect(twitterError?.message).toBe('Invalid Twitter URL');
        expect(facebookError?.message).toBe('Invalid Facebook URL');
      }
    });

    it('should handle optional nested object with invalid values', () => {
      const result = campaignSchema.safeParse({
        title: 'Valid Title',
        description: 'Valid description here',
        goal: 1000,
        email: 'test@example.com',
        tags: [],
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
        category: 'tech',
        socialMedia: 'should-be-object-not-string' // Invalid type for optional nested object
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const socialMediaError = result.error.issues.find(issue => issue.path[0] === 'socialMedia');
        expect(socialMediaError?.message).toBe('Expected object, received string');
      }
    });
  });
});