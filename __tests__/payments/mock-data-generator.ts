/**
 * Mock Data Generator - CommonJS Compatible Alternative to Faker.js
 * 
 * This provides a lightweight alternative to Faker.js that works reliably
 * in both CommonJS and ESM environments without module import issues.
 */

// Utility functions for generating test data
class MockDataGenerator {
  private static counter = 0;

  /**
   * Generate random string with given length
   */
  static randomString(length: number, charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return result;
  }

  /**
   * Generate random alphanumeric string
   */
  static alphanumeric(length: number): string {
    return this.randomString(length, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789');
  }

  /**
   * Generate random UUID-like string
   */
  static uuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Generate random integer between min and max (inclusive)
   */
  static integer(min: number = 0, max: number = 100): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generate random email address
   */
  static email(): string {
    const domains = ['example.com', 'test.com', 'demo.org', 'sample.net'];
    const names = ['john', 'jane', 'bob', 'alice', 'charlie', 'diana', 'eve', 'frank'];
    const name = names[Math.floor(Math.random() * names.length)];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    const number = Math.floor(Math.random() * 1000);
    return `${name}${number}@${domain}`;
  }

  /**
   * Generate random full name
   */
  static fullName(): string {
    const firstNames = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    return `${firstName} ${lastName}`;
  }

  /**
   * Generate random words
   */
  static words(count: number = 3): string {
    const wordList = [
      'lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit',
      'sed', 'do', 'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore',
      'magna', 'aliqua', 'enim', 'ad', 'minim', 'veniam', 'quis', 'nostrud',
      'exercitation', 'ullamco', 'laboris', 'nisi', 'aliquip', 'ex', 'ea', 'commodo',
      'consequat', 'duis', 'aute', 'irure', 'in', 'reprehenderit', 'voluptate',
      'velit', 'esse', 'cillum', 'fugiat', 'nulla', 'pariatur', 'excepteur', 'sint'
    ];
    
    const words: string[] = [];
    for (let i = 0; i < count; i++) {
      words.push(wordList[Math.floor(Math.random() * wordList.length)]);
    }
    return words.join(' ');
  }

  /**
   * Generate random paragraph
   */
  static paragraph(): string {
    const sentenceCount = this.integer(3, 6);
    const sentences: string[] = [];
    
    for (let i = 0; i < sentenceCount; i++) {
      const wordCount = this.integer(5, 12);
      const words = this.words(wordCount);
      sentences.push(words.charAt(0).toUpperCase() + words.slice(1) + '.');
    }
    
    return sentences.join(' ');
  }

  /**
   * Generate random IP address
   */
  static ip(): string {
    return `${this.integer(1, 255)}.${this.integer(0, 255)}.${this.integer(0, 255)}.${this.integer(1, 255)}`;
  }

  /**
   * Generate random URL
   */
  static url(): string {
    const protocols = ['http', 'https'];
    const domains = ['example.com', 'test.org', 'demo.net', 'sample.co'];
    const paths = ['', '/page', '/about', '/contact', '/products', '/services'];
    
    const protocol = protocols[Math.floor(Math.random() * protocols.length)];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    const path = paths[Math.floor(Math.random() * paths.length)];
    
    return `${protocol}://${domain}${path}`;
  }

  /**
   * Get unique counter value
   */
  static getCounter(): number {
    return ++this.counter;
  }
}

// Export compatible faker-like interface
export const mockFaker = {
  string: {
    alphanumeric: (length: number) => MockDataGenerator.alphanumeric(length),
    uuid: () => MockDataGenerator.uuid()
  },
  number: {
    int: (options: { min?: number; max?: number } = {}) => 
      MockDataGenerator.integer(options.min ?? 0, options.max ?? 100)
  },
  internet: {
    email: () => MockDataGenerator.email(),
    ip: () => MockDataGenerator.ip(),
    url: () => MockDataGenerator.url()
  },
  person: {
    fullName: () => MockDataGenerator.fullName()
  },
  lorem: {
    words: (count: number = 3) => MockDataGenerator.words(count),
    paragraph: () => MockDataGenerator.paragraph()
  }
};

// CommonJS compatibility
module.exports = { mockFaker, MockDataGenerator };

export { MockDataGenerator };