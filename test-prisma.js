const { prisma } = require('./lib/db.ts');

async function test() {
  try {
    console.log('Testing prisma client...');
    console.log('Available models:', Object.keys(prisma));
    
    // Test if campaignAnalysis is available
    console.log('campaignAnalysis available:', !!prisma.campaignAnalysis);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

test();
