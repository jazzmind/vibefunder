/**
 * Webhook Performance and Benchmark Tests
 * 
 * This test suite focuses on performance testing webhook processing
 * including throughput, latency, memory usage, and scalability tests.
 * 
 * @author Webhook Performance Specialist
 * @version 1.0.0
 */

import { 
  prismaMock, 
  stripeMock, 
  resetAllMocks, 
  setupDefaultMocks,
  emailMock
} from '../../payments/setup-payment-mocks';
import { createTestRequest, createAuthenticatedRequest } from '../../utils/api-test-helpers';

jest.mock('@/lib/stripe', () => ({
  stripe: require('../../payments/setup-payment-mocks').stripeMock,
}));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/payments/stripe/webhook/route';
import { 
  PaymentTestData, 
  StripeObjectFactory 
} from '../../payments/payment-test-helpers';

// Mock environment variable
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_webhook_secret';

describe('Webhook Performance and Benchmark Tests', () => {
  beforeEach(() => {
    resetAllMocks();
    setupDefaultMocks();
  });

  describe('⚡ Latency and Response Time Tests', () => {
    it('should process single webhook under 100ms', async () => {
      const checkoutSession = StripeObjectFactory.createCheckoutSession({
        metadata: {
          campaignId: 'latency-test-campaign',
          backerId: 'latency-test-user'
        }
      });

      const webhookEvent = StripeObjectFactory.createWebhookEvent(
        'checkout.session.completed',
        checkoutSession
      );

      stripeMock.webhooks.constructEvent.mockReturnValue(webhookEvent);
      
      const mockPledge = {
        ...PaymentTestData.generatePledge(),
        backer: PaymentTestData.generateUser(),
        campaign: PaymentTestData.generateCampaign()
      };
      
      prismaMock.pledge.create.mockResolvedValue(mockPledge as any);
      prismaMock.campaign.update.mockResolvedValue(PaymentTestData.generateCampaign() as any);

      const request = new NextRequest('http://localhost:3000/api/payments/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'valid_signature' },
        body: JSON.stringify(webhookEvent)
      });

      // Measure execution time
      const startTime = performance.now();
      const response = await POST(request);
      const executionTime = performance.now() - startTime;

      expect(response.status).toBe(200);
      expect(executionTime).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should maintain consistent performance across multiple webhooks', async () => {
      const numberOfTests = 10;
      const executionTimes: number[] = [];

      for (let i = 0; i < numberOfTests; i++) {
        resetAllMocks();
        setupDefaultMocks();

        const checkoutSession = StripeObjectFactory.createCheckoutSession({
          id: `cs_consistency_test_${i}`,
          metadata: {
            campaignId: `consistency-campaign-${i}`,
            backerId: `consistency-user-${i}`
          }
        });

        const webhookEvent = StripeObjectFactory.createWebhookEvent(
          'checkout.session.completed',
          checkoutSession
        );

        stripeMock.webhooks.constructEvent.mockReturnValue(webhookEvent);
        
        const mockPledge = {
          ...PaymentTestData.generatePledge(),
          backer: PaymentTestData.generateUser(),
          campaign: PaymentTestData.generateCampaign()
        };
        
        prismaMock.pledge.create.mockResolvedValue(mockPledge as any);
        prismaMock.campaign.update.mockResolvedValue(PaymentTestData.generateCampaign() as any);

        const request = new NextRequest('http://localhost:3000/api/payments/stripe/webhook', {
          method: 'POST',
          headers: { 'stripe-signature': 'valid_signature' },
          body: JSON.stringify(webhookEvent)
        });

        const startTime = performance.now();
        const response = await POST(request);
        const executionTime = performance.now() - startTime;

        expect(response.status).toBe(200);
        executionTimes.push(executionTime);
      }

      // Calculate performance statistics
      const avgTime = executionTimes.reduce((a, b) => a + b, 0) / executionTimes.length;
      const maxTime = Math.max(...executionTimes);
      const minTime = Math.min(...executionTimes);
      const variance = executionTimes.reduce((acc, time) => acc + Math.pow(time - avgTime, 2), 0) / executionTimes.length;
      const stdDev = Math.sqrt(variance);

      console.log(`Performance Stats:
        - Average: ${avgTime.toFixed(2)}ms
        - Min: ${minTime.toFixed(2)}ms
        - Max: ${maxTime.toFixed(2)}ms
        - Std Dev: ${stdDev.toFixed(2)}ms
      `);

      // Performance assertions
      expect(avgTime).toBeLessThan(150); // Average under 150ms
      expect(maxTime).toBeLessThan(300); // Max under 300ms
      expect(stdDev).toBeLessThan(50); // Low variance (consistent performance)
    });

    it('should measure P95 and P99 latency percentiles', async () => {
      const numberOfRequests = 100;
      const executionTimes: number[] = [];

      // Simulate varied load conditions
      for (let i = 0; i < numberOfRequests; i++) {
        resetAllMocks();
        setupDefaultMocks();

        const checkoutSession = StripeObjectFactory.createCheckoutSession({
          metadata: {
            campaignId: `percentile-campaign-${i}`,
            backerId: `percentile-user-${i}`
          }
        });

        const webhookEvent = StripeObjectFactory.createWebhookEvent(
          'checkout.session.completed',
          checkoutSession
        );

        stripeMock.webhooks.constructEvent.mockReturnValue(webhookEvent);
        
        // Add some variability to mock response times
        const mockDelay = Math.random() * 50; // 0-50ms random delay
        const mockPledge = {
          ...PaymentTestData.generatePledge(),
          backer: PaymentTestData.generateUser(),
          campaign: PaymentTestData.generateCampaign()
        };
        
        prismaMock.pledge.create.mockImplementation(() => 
          new Promise(resolve => 
            setTimeout(() => resolve(mockPledge as any), mockDelay)
          )
        );

        prismaMock.campaign.update.mockResolvedValue(PaymentTestData.generateCampaign() as any);

        const request = new NextRequest('http://localhost:3000/api/payments/stripe/webhook', {
          method: 'POST',
          headers: { 'stripe-signature': 'valid_signature' },
          body: JSON.stringify(webhookEvent)
        });

        const startTime = performance.now();
        const response = await POST(request);
        const executionTime = performance.now() - startTime;

        expect(response.status).toBe(200);
        executionTimes.push(executionTime);
      }

      // Sort execution times for percentile calculation
      executionTimes.sort((a, b) => a - b);

      const p50Index = Math.floor(0.5 * numberOfRequests);
      const p95Index = Math.floor(0.95 * numberOfRequests);
      const p99Index = Math.floor(0.99 * numberOfRequests);

      const p50 = executionTimes[p50Index];
      const p95 = executionTimes[p95Index];
      const p99 = executionTimes[p99Index];

      console.log(`Latency Percentiles:
        - P50 (median): ${p50.toFixed(2)}ms
        - P95: ${p95.toFixed(2)}ms
        - P99: ${p99.toFixed(2)}ms
      `);

      // Performance assertions
      expect(p50).toBeLessThan(100); // Median under 100ms
      expect(p95).toBeLessThan(200); // 95th percentile under 200ms
      expect(p99).toBeLessThan(400); // 99th percentile under 400ms
    });
  });

  describe('🚀 Throughput and Concurrency Tests', () => {
    it('should handle high concurrent webhook load', async () => {
      const concurrentRequests = 50;
      const webhookEvents: any[] = [];

      // Create unique webhook events
      for (let i = 0; i < concurrentRequests; i++) {
        webhookEvents.push(StripeObjectFactory.createWebhookEvent(
          'payment_intent.succeeded',
          StripeObjectFactory.createPaymentIntent({
            id: `pi_concurrent_${i}`,
            metadata: {
              campaignId: `concurrent-campaign-${i}`,
              backerId: `concurrent-user-${i}`
            }
          })
        ));
      }

      stripeMock.webhooks.constructEvent.mockImplementation((body) => {
        return JSON.parse(body);
      });

      prismaMock.pledge.updateMany.mockResolvedValue({ count: 1 });
      
      const updatedPledge = {
        ...PaymentTestData.generatePledge(),
        backer: PaymentTestData.generateUser(),
        campaign: PaymentTestData.generateCampaign()
      };

      prismaMock.pledge.findFirst.mockResolvedValue(updatedPledge as any);

      const startTime = performance.now();

      // Execute all requests concurrently
      const promises = webhookEvents.map(async (event, index) => {
        const request = new NextRequest('http://localhost:3000/api/payments/stripe/webhook', {
          method: 'POST',
          headers: { 'stripe-signature': 'valid_signature' },
          body: JSON.stringify(event)
        });

        const requestStart = performance.now();
        const response = await POST(request);
        const requestTime = performance.now() - requestStart;

        return {
          index,
          status: response.status,
          responseTime: requestTime
        };
      });

      const results = await Promise.all(promises);
      const totalTime = performance.now() - startTime;

      // Calculate throughput
      const throughput = concurrentRequests / (totalTime / 1000); // requests per second
      const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

      console.log(`Concurrency Test Results:
        - Total time: ${totalTime.toFixed(2)}ms
        - Throughput: ${throughput.toFixed(2)} req/sec
        - Average response time: ${avgResponseTime.toFixed(2)}ms
        - Successful requests: ${results.filter(r => r.status === 200).length}/${concurrentRequests}
      `);

      // All requests should succeed
      results.forEach(result => {
        expect(result.status).toBe(200);
      });

      // Throughput should be reasonable
      expect(throughput).toBeGreaterThan(10); // At least 10 req/sec
      expect(avgResponseTime).toBeLessThan(500); // Average under 500ms
    });

    it('should scale linearly with request volume', async () => {
      const testSizes = [10, 25, 50];
      const results: { size: number, throughput: number, avgLatency: number }[] = [];

      for (const size of testSizes) {
        resetAllMocks();
        setupDefaultMocks();

        const webhookEvents = Array(size).fill(null).map((_, i) => 
          StripeObjectFactory.createWebhookEvent(
            'checkout.session.completed',
            StripeObjectFactory.createCheckoutSession({
              id: `cs_scale_${size}_${i}`,
              metadata: {
                campaignId: `scale-campaign-${size}-${i}`,
                backerId: `scale-user-${size}-${i}`
              }
            })
          )
        );

        stripeMock.webhooks.constructEvent.mockImplementation((body) => {
          return JSON.parse(body);
        });

        const mockPledge = {
          ...PaymentTestData.generatePledge(),
          backer: PaymentTestData.generateUser(),
          campaign: PaymentTestData.generateCampaign()
        };

        prismaMock.pledge.create.mockResolvedValue(mockPledge as any);
        prismaMock.campaign.update.mockResolvedValue(PaymentTestData.generateCampaign() as any);

        const startTime = performance.now();

        const promises = webhookEvents.map(event => {
          const request = new NextRequest('http://localhost:3000/api/payments/stripe/webhook', {
            method: 'POST',
            headers: { 'stripe-signature': 'valid_signature' },
            body: JSON.stringify(event)
          });

          const requestStart = performance.now();
          return POST(request).then(response => ({
            status: response.status,
            latency: performance.now() - requestStart
          }));
        });

        const responses = await Promise.all(promises);
        const totalTime = performance.now() - startTime;

        const throughput = size / (totalTime / 1000);
        const avgLatency = responses.reduce((sum, r) => sum + r.latency, 0) / responses.length;

        results.push({ size, throughput, avgLatency });

        // All should succeed
        responses.forEach(response => {
          expect(response.status).toBe(200);
        });

        console.log(`Scale test ${size} requests: ${throughput.toFixed(2)} req/sec, ${avgLatency.toFixed(2)}ms avg`);
      }

      // Throughput should not degrade significantly with scale
      expect(results[1].throughput).toBeGreaterThan(results[0].throughput * 0.8); // Within 20%
      expect(results[2].throughput).toBeGreaterThan(results[0].throughput * 0.6); // Within 40%

      // Latency should remain reasonable
      results.forEach(result => {
        expect(result.avgLatency).toBeLessThan(300);
      });
    });
  });

  describe('💾 Memory Usage and Resource Tests', () => {
    it('should maintain reasonable memory usage under load', async () => {
      const initialMemory = process.memoryUsage();
      const numberOfWebhooks = 100;

      // Create webhooks with moderate payload sizes
      const webhookEvents = Array(numberOfWebhooks).fill(null).map((_, i) => 
        StripeObjectFactory.createWebhookEvent(
          'checkout.session.completed',
          StripeObjectFactory.createCheckoutSession({
            id: `cs_memory_${i}`,
            metadata: {
              campaignId: `memory-campaign-${i}`,
              backerId: `memory-user-${i}`,
              // Add some metadata to simulate real-world usage
              sessionData: JSON.stringify({ page: 'checkout', step: 'complete' }),
              analytics: JSON.stringify({ source: 'web', campaign: 'holiday2024' })
            }
          })
        )
      );

      stripeMock.webhooks.constructEvent.mockImplementation((body) => {
        return JSON.parse(body);
      });

      const mockPledge = {
        ...PaymentTestData.generatePledge(),
        backer: PaymentTestData.generateUser(),
        campaign: PaymentTestData.generateCampaign()
      };

      prismaMock.pledge.create.mockResolvedValue(mockPledge as any);
      prismaMock.campaign.update.mockResolvedValue(PaymentTestData.generateCampaign() as any);

      // Process in batches to simulate realistic load
      const batchSize = 20;
      for (let i = 0; i < numberOfWebhooks; i += batchSize) {
        const batch = webhookEvents.slice(i, i + batchSize);
        
        const promises = batch.map(event => {
          const request = new NextRequest('http://localhost:3000/api/payments/stripe/webhook', {
            method: 'POST',
            headers: { 'stripe-signature': 'valid_signature' },
            body: JSON.stringify(event)
          });

          return POST(request);
        });

        const responses = await Promise.all(promises);
        
        // All should succeed
        responses.forEach(response => {
          expect(response.status).toBe(200);
        });

        // Small delay to allow garbage collection
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryDiff = {
        heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
        heapTotal: finalMemory.heapTotal - initialMemory.heapTotal,
        external: finalMemory.external - initialMemory.external,
        rss: finalMemory.rss - initialMemory.rss
      };

      console.log(`Memory Usage After ${numberOfWebhooks} Webhooks:
        - Heap Used: ${(memoryDiff.heapUsed / 1024 / 1024).toFixed(2)} MB
        - Heap Total: ${(memoryDiff.heapTotal / 1024 / 1024).toFixed(2)} MB
        - External: ${(memoryDiff.external / 1024 / 1024).toFixed(2)} MB
        - RSS: ${(memoryDiff.rss / 1024 / 1024).toFixed(2)} MB
      `);

      // Memory increase should be reasonable (under 50MB for heap)
      expect(memoryDiff.heapUsed).toBeLessThan(50 * 1024 * 1024); // 50MB
    });

    it('should handle garbage collection efficiently', async () => {
      const gcBefore = process.memoryUsage();
      const numberOfIterations = 10;

      for (let iteration = 0; iteration < numberOfIterations; iteration++) {
        // Create and process many webhooks to generate garbage
        const webhookEvents = Array(50).fill(null).map((_, i) => 
          StripeObjectFactory.createWebhookEvent(
            'payment_intent.succeeded',
            StripeObjectFactory.createPaymentIntent({
              id: `pi_gc_${iteration}_${i}`,
              metadata: {
                iteration: iteration.toString(),
                index: i.toString(),
                largeData: 'x'.repeat(5000) // 5KB of data
              }
            })
          )
        );

        stripeMock.webhooks.constructEvent.mockImplementation((body) => {
          return JSON.parse(body);
        });

        prismaMock.pledge.updateMany.mockResolvedValue({ count: 1 });

        const promises = webhookEvents.map(event => {
          const request = new NextRequest('http://localhost:3000/api/payments/stripe/webhook', {
            method: 'POST',
            headers: { 'stripe-signature': 'valid_signature' },
            body: JSON.stringify(event)
          });

          return POST(request);
        });

        const responses = await Promise.all(promises);
        
        // All should succeed
        responses.forEach(response => {
          expect(response.status).toBe(200);
        });

        // Force garbage collection
        if (global.gc) {
          global.gc();
        }

        // Small delay
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      const gcAfter = process.memoryUsage();
      const memoryGrowth = gcAfter.heapUsed - gcBefore.heapUsed;

      console.log(`Memory Growth After GC Test: ${(memoryGrowth / 1024 / 1024).toFixed(2)} MB`);

      // Memory growth should be minimal after GC
      expect(memoryGrowth).toBeLessThan(30 * 1024 * 1024); // 30MB
    });
  });

  describe('🎯 Real-World Performance Scenarios', () => {
    it('should handle Black Friday traffic simulation', async () => {
      // Simulate Black Friday traffic pattern: 5x normal load for 1 hour
      const normalRPS = 10; // 10 requests per second normally
      const peakRPS = 50; // 50 requests per second during peak
      const testDuration = 5000; // 5 seconds (scaled down from 1 hour)
      
      const totalRequests = Math.floor((peakRPS * testDuration) / 1000);
      console.log(`Simulating ${totalRequests} webhook requests in ${testDuration}ms`);

      const webhookEvents = Array(totalRequests).fill(null).map((_, i) => 
        StripeObjectFactory.createWebhookEvent(
          Math.random() > 0.7 ? 'payment_intent.succeeded' : 'checkout.session.completed',
          Math.random() > 0.7 
            ? StripeObjectFactory.createPaymentIntent({ id: `pi_blackfriday_${i}` })
            : StripeObjectFactory.createCheckoutSession({ 
                id: `cs_blackfriday_${i}`,
                metadata: {
                  campaignId: `blackfriday-campaign-${i}`,
                  backerId: `blackfriday-user-${i}`
                }
              })
        )
      );

      stripeMock.webhooks.constructEvent.mockImplementation((body) => {
        return JSON.parse(body);
      });

      const mockPledge = {
        ...PaymentTestData.generatePledge(),
        backer: PaymentTestData.generateUser(),
        campaign: PaymentTestData.generateCampaign()
      };

      prismaMock.pledge.create.mockResolvedValue(mockPledge as any);
      prismaMock.pledge.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.pledge.findFirst.mockResolvedValue({
        ...mockPledge,
        backer: PaymentTestData.generateUser(),
        campaign: PaymentTestData.generateCampaign()
      } as any);

      const startTime = performance.now();
      const intervalMs = 1000 / peakRPS; // Time between requests
      let processedRequests = 0;
      const errors: string[] = [];

      // Process requests at controlled rate
      const promises = webhookEvents.map((event, index) => {
        return new Promise((resolve) => {
          setTimeout(async () => {
            try {
              const request = new NextRequest('http://localhost:3000/api/payments/stripe/webhook', {
                method: 'POST',
                headers: { 'stripe-signature': 'valid_signature' },
                body: JSON.stringify(event)
              });

              const response = await POST(request);
              processedRequests++;
              
              resolve({
                index,
                status: response.status,
                timestamp: performance.now()
              });
            } catch (error) {
              errors.push(`Request ${index}: ${error}`);
              resolve({
                index,
                status: 500,
                timestamp: performance.now()
              });
            }
          }, index * intervalMs);
        });
      });

      const results = await Promise.all(promises);
      const totalTime = performance.now() - startTime;
      const actualThroughput = processedRequests / (totalTime / 1000);

      console.log(`Black Friday Simulation Results:
        - Processed: ${processedRequests}/${totalRequests} requests
        - Duration: ${totalTime.toFixed(2)}ms
        - Throughput: ${actualThroughput.toFixed(2)} req/sec
        - Errors: ${errors.length}
        - Success Rate: ${((processedRequests - errors.length) / processedRequests * 100).toFixed(2)}%
      `);

      // Should handle at least 80% of peak load successfully
      expect(processedRequests).toBeGreaterThan(totalRequests * 0.8);
      expect(errors.length).toBeLessThan(totalRequests * 0.2);
      expect(actualThroughput).toBeGreaterThan(peakRPS * 0.6);
    });

    it('should handle international webhook latency simulation', async () => {
      // Simulate webhooks coming from different regions with varying latencies
      const regions = [
        { name: 'US East', latency: 10 },
        { name: 'US West', latency: 25 },
        { name: 'Europe', latency: 150 },
        { name: 'Asia Pacific', latency: 200 },
        { name: 'South America', latency: 180 }
      ];

      const results: Array<{
        region: string;
        avgProcessingTime: number;
        successRate: number;
        throughput: number;
      }> = [];

      for (const region of regions) {
        resetAllMocks();
        setupDefaultMocks();

        const numberOfRequests = 20;
        const webhookEvents = Array(numberOfRequests).fill(null).map((_, i) => 
          StripeObjectFactory.createWebhookEvent(
            'checkout.session.completed',
            StripeObjectFactory.createCheckoutSession({
              id: `cs_${region.name.toLowerCase().replace(/\s+/g, '_')}_${i}`,
              metadata: {
                campaignId: `${region.name}-campaign-${i}`,
                backerId: `${region.name}-user-${i}`,
                region: region.name
              }
            })
          )
        );

        stripeMock.webhooks.constructEvent.mockImplementation((body) => {
          return JSON.parse(body);
        });

        // Add simulated network latency
        const mockPledge = {
          ...PaymentTestData.generatePledge(),
          backer: PaymentTestData.generateUser(),
          campaign: PaymentTestData.generateCampaign()
        };

        prismaMock.pledge.create.mockImplementation(() => 
          new Promise(resolve => 
            setTimeout(() => resolve(mockPledge as any), region.latency)
          )
        );

        const startTime = performance.now();

        const promises = webhookEvents.map(async (event) => {
          const request = new NextRequest('http://localhost:3000/api/payments/stripe/webhook', {
            method: 'POST',
            headers: { 'stripe-signature': 'valid_signature' },
            body: JSON.stringify(event)
          });

          const requestStart = performance.now();
          const response = await POST(request);
          const processingTime = performance.now() - requestStart;

          return {
            status: response.status,
            processingTime
          };
        });

        const responses = await Promise.all(promises);
        const totalTime = performance.now() - startTime;

        const successfulResponses = responses.filter(r => r.status === 200);
        const avgProcessingTime = responses.reduce((sum, r) => sum + r.processingTime, 0) / responses.length;
        const successRate = (successfulResponses.length / responses.length) * 100;
        const throughput = numberOfRequests / (totalTime / 1000);

        results.push({
          region: region.name,
          avgProcessingTime,
          successRate,
          throughput
        });

        console.log(`Region ${region.name}:
          - Avg Processing Time: ${avgProcessingTime.toFixed(2)}ms
          - Success Rate: ${successRate.toFixed(1)}%
          - Throughput: ${throughput.toFixed(2)} req/sec
        `);

        // All requests should succeed despite latency
        expect(successRate).toBe(100);
        // Processing time should include simulated latency
        expect(avgProcessingTime).toBeGreaterThan(region.latency);
      }

      // Results should be consistent across regions (high success rate)
      results.forEach(result => {
        expect(result.successRate).toBeGreaterThan(95);
        expect(result.throughput).toBeGreaterThan(2); // At least 2 req/sec even with high latency
      });
    });
  });
});