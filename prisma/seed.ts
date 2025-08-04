import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Create or update admin users from environment variable
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim()) || [];
  
  for (const email of adminEmails) {
    if (email) {
      await prisma.user.upsert({
        where: { email },
        update: { roles: ["admin"] },
        create: { 
          email, 
          name: `Admin ${email.split('@')[0]}`, 
          roles: ["admin"] 
        }
      });
      console.log(`✓ Admin user created/updated: ${email}`);
    }
  }

  // Create demo founder user
  const user = await prisma.user.upsert({ 
    where: { email: "founder@demo.dev" }, 
    update: {}, 
    create: { 
      email: "founder@demo.dev", 
      name: "Demo Founder", 
      roles: ["maker"] 
    } 
  });
  await prisma.campaign.create({
    data: {
      makerId: user.id,
      title: "ApplicationAI",
      summary: "URL→Application with enrichment and go/no-go summary",
      description: "Transform any URL into a structured application with AI-powered enrichment. Get instant go/no-go summaries, risk assessments, and compliance checks. Perfect for grant applications, RFP responses, and business development workflows.",
      budgetDollars: 100000,
      fundingGoalDollars: 50000,
      raisedDollars: 12500,
      deployModes: ["saas","vpc","onprem"],
      status: "live",
      endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      milestones: { create: [
        { name: "M1 Security & Identity", pct: 30, acceptance: { checklist: ["SSO","RBAC","Audit Log"] } },
        { name: "M2 Reliability & Data", pct: 40, acceptance: { checklist: ["SLOs","Backups","Exports"] } },
        { name: "M3 Compliance & Fit", pct: 30, acceptance: { checklist: ["Questionnaire","DPA","Badges"] } },
      ]},
      stretchGoals: { create: [
        { title: "Advanced AI Features", description: "Enhanced AI models for better application analysis and risk assessment", targetDollars: 60000, order: 1 },
        { title: "Multi-language Support", description: "Support for processing applications in multiple languages", targetDollars: 75000, order: 2 },
        { title: "Mobile App", description: "Native mobile applications for iOS and Android", targetDollars: 100000, order: 3 }
      ]}
    }
  });
}
main().finally(()=>prisma.$disconnect());
