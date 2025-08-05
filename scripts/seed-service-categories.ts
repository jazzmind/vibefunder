import { prisma } from '../lib/db';

const serviceCategories = [
  {
    name: 'Cybersecurity Testing',
    slug: 'cybersecurity-testing',
    description: 'Penetration testing, vulnerability assessments, and security audits',
    icon: '🛡️',
    order: 1
  },
  {
    name: 'Cybersecurity Hardening',
    slug: 'cybersecurity-hardening',
    description: 'Security implementation, configuration, and infrastructure hardening',
    icon: '🔒',
    order: 2
  },
  {
    name: 'Privacy & Data Handling',
    slug: 'privacy-data-handling',
    description: 'Data privacy compliance, GDPR implementation, and data governance',
    icon: '🔐',
    order: 3
  },
  {
    name: 'Compliance',
    slug: 'compliance',
    description: 'SOC 2, HIPAA, PCI-DSS, and other regulatory compliance services',
    icon: '📋',
    order: 4
  },
  {
    name: 'DevOps',
    slug: 'devops',
    description: 'CI/CD pipelines, infrastructure automation, and deployment optimization',
    icon: '⚙️',
    order: 5
  },
  {
    name: 'Performance',
    slug: 'performance',
    description: 'Performance optimization, load testing, and scalability improvements',
    icon: '⚡',
    order: 6
  },
  {
    name: 'QA',
    slug: 'qa',
    description: 'Quality assurance, automated testing, and test strategy development',
    icon: '✅',
    order: 7
  },
  {
    name: 'UX/UI',
    slug: 'ux-ui',
    description: 'User experience design, interface design, and usability testing',
    icon: '🎨',
    order: 8
  },
  {
    name: 'AI',
    slug: 'ai',
    description: 'RAG implementation, fine-tuning, custom LLMs, and AI integration',
    icon: '🤖',
    order: 9
  }
];

async function seedServiceCategories() {
  console.log('🌱 Seeding service categories...');
  
  for (const category of serviceCategories) {
    await prisma.serviceCategory.upsert({
      where: { slug: category.slug },
      update: category,
      create: category
    });
    console.log(`✅ Created/Updated category: ${category.name}`);
  }
  
  console.log('🎉 Service categories seeded successfully!');
}

seedServiceCategories()
  .catch((e) => {
    console.error('❌ Error seeding service categories:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });