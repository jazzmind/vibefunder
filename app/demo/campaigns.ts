
// Demo campaigns data (should match the ones in campaigns/page.tsx)
export const DEMO_CAMPAIGNS = [
    {
      id: 'demo-1',
      title: 'TaskBuddy - AI-Powered Project Manager',
      summary: 'Revolutionary AI tool that helps teams organize and prioritize tasks automatically',
      image: '/images/demo/demo-1.jpg',
      leadVideoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Demo video
      description: `<h1>TaskBuddy - AI-Powered Project Manager</h1>
  
  <p>TaskBuddy is a <strong>cutting-edge AI-powered project management tool</strong> designed to revolutionize how teams organize, prioritize, and execute their work. Built with advanced machine learning algorithms, TaskBuddy automatically analyzes project requirements, team capacity, and deadlines to suggest optimal task allocation and scheduling.</p>
  
  <h2>🚀 Key Features</h2>
  
  <ul>
    <li><strong>AI-driven task prioritization</strong> based on impact and urgency</li>
    <li><strong>Automated resource allocation</strong> and workload balancing</li>
    <li><strong>Smart deadline prediction</strong> with risk assessment</li>
    <li><strong>Intelligent notification system</strong> that adapts to team preferences</li>
    <li><strong>Real-time collaboration tools</strong> with AI-assisted communication</li>
    <li><strong>Advanced analytics</strong> and project insights</li>
  </ul>
  
  <h2>💡 Our Mission</h2>
  
  <p>Our mission is to eliminate the overhead of project management, allowing teams to focus on what they do best - creating amazing products.</p>
  
  <blockquote>
    <p>"TaskBuddy has transformed how our team works. We're 40% more efficient and stress levels are way down!" - Sarah K., Product Manager</p>
  </blockquote>`,
      raisedDollars: 4500,
      fundingGoalDollars: 10000,
  
      status: 'live',
      deployModes: ['cloud', 'saas'],
      sectors: ['technology', 'productivity'],
      maker: { name: 'Sarah Chen', email: 'sarah@example.com', id: 'demo-maker-1' },
      pledges: [],
      milestones: [
        { id: 'demo-milestone-1', name: 'MVP Development', pct: 30, acceptance: { checklist: ['Core AI engine', 'Basic UI', 'User authentication'] }, status: 'completed' },
        { id: 'demo-milestone-2', name: 'Beta Release', pct: 60, acceptance: { checklist: ['Public beta launch', '100 test users', 'User feedback collection'] }, status: 'in_progress' },
        { id: 'demo-milestone-3', name: 'Production Launch', pct: 100, acceptance: { checklist: ['Full feature set', 'Enterprise support', 'Payment processing'] }, status: 'pending' }
      ],
      stretchGoals: [
        { title: 'Mobile App', targetDollars: 12000, description: 'Native iOS and Android applications' },
        { title: 'Enterprise Features', targetDollars: 15000, description: 'Advanced security and compliance features' }
      ],
      pledgeTiers: [
        { title: 'Early Bird', amount: 29, description: '6 months free access + beta features', maxBackers: 50, currentBackers: 8 },
        { title: 'Professional', amount: 99, description: '1 year access + priority support', maxBackers: 100, currentBackers: 4 },
        { title: 'Enterprise', amount: 299, description: 'Lifetime access + custom integrations', maxBackers: 20, currentBackers: 0 }
      ],
      teamMembers: [
        { user: { name: 'Sarah Chen', email: 'sarah@example.com' }, role: 'Founder & CEO' },
        { user: { name: 'Mike Johnson', email: 'mike@example.com' }, role: 'Lead Developer' }
      ],
      comments: [],
      _count: { pledges: 12, comments: 7 },
      createdAt: new Date('2024-12-01'),
      endsAt: new Date('2025-01-15')
    },
    {
      id: 'demo-2', 
      title: 'CodeFlow - Developer Workflow Optimizer',
      summary: 'Streamline your development process with intelligent code review and deployment automation',
      image: '/images/demo/demo-2.jpg',
      description: `<p>CodeFlow is an intelligent developer workflow optimizer that transforms how development teams write, review, and deploy code. Using advanced AI and machine learning, CodeFlow provides real-time code analysis, automated review suggestions, and intelligent deployment orchestration.</p>

<h2>Key Features:</h2>
<ul>
  <li>AI-powered code review with security and performance insights</li>
  <li>Automated testing pipeline generation</li>
  <li>Intelligent merge conflict resolution</li>
  <li>Smart deployment strategies based on risk assessment</li>
  <li>Team productivity analytics and optimization suggestions</li>
  <li>Integration with all major version control and CI/CD platforms</li>
</ul>

<p>CodeFlow reduces development cycle time by up to 40% while improving code quality and reducing bugs in production.</p>`,
      raisedDollars: 7800,
      fundingGoalDollars: 12000,
  
      status: 'live',
      deployModes: ['on-premise', 'cloud'],
      sectors: ['technology', 'software development'],
      maker: { name: 'Alex Rivera', email: 'alex@example.com', id: 'demo-maker-2' },
      pledges: [],
      milestones: [
        { id: 'demo-milestone-4', name: 'Core Engine', pct: 33, acceptance: { checklist: ['AI code analysis', 'Pattern detection', 'Performance optimization'] }, status: 'completed' },
        { id: 'demo-milestone-5', name: 'Platform Integrations', pct: 67, acceptance: { checklist: ['GitHub integration', 'GitLab support', 'Bitbucket connectivity'] }, status: 'in_progress' },
        { id: 'demo-milestone-6', name: 'Enterprise Features', pct: 100, acceptance: { checklist: ['Security compliance', 'SSO integration', 'Audit logging'] }, status: 'pending' }
      ],
      stretchGoals: [
        { title: 'VS Code Extension', targetDollars: 15000, description: 'Native IDE integration' },
        { title: 'Mobile Dashboard', targetDollars: 18000, description: 'Monitor deployments on mobile' }
      ],
      pledgeTiers: [
        { title: 'Developer', amount: 49, description: '1 year license for individual developers', maxBackers: 200, currentBackers: 15 },
        { title: 'Team', amount: 199, description: 'Team license for up to 10 developers', maxBackers: 50, currentBackers: 3 },
        { title: 'Enterprise', amount: 999, description: 'Unlimited license + priority support', maxBackers: 10, currentBackers: 0 }
      ],
      teamMembers: [
        { user: { name: 'Alex Rivera', email: 'alex@example.com' }, role: 'Founder & CTO' },
        { user: { name: 'Lisa Wong', email: 'lisa@example.com' }, role: 'AI Engineer' },
        { user: { name: 'David Kim', email: 'david@example.com' }, role: 'DevOps Lead' }
      ],
      comments: [],
      _count: { pledges: 18, comments: 12 },
      createdAt: new Date('2024-11-20'),
      endsAt: new Date('2025-01-20')
    },
    {
      id: 'demo-3',
      title: 'DataViz Pro - Interactive Analytics Dashboard',
      summary: 'Transform complex data into beautiful, interactive visualizations with no coding required',
      image: '/images/demo/demo-3.jpg',
      description: `<p>DataViz Pro is a revolutionary no-code data visualization platform that empowers anyone to create stunning, interactive dashboards and reports. Using advanced AI and intuitive drag-and-drop interfaces, DataViz Pro automatically detects data patterns and suggests optimal visualization strategies.</p>

<h2>Key Features:</h2>
<ul>
  <li>AI-powered visualization recommendations</li>
  <li>Drag-and-drop dashboard builder</li>
  <li>Real-time data connectivity to 100+ sources</li>
  <li>Interactive charts and dynamic filtering</li>
  <li>Collaborative sharing and commenting</li>
  <li>White-label embedding for client reports</li>
  <li>Advanced analytics with predictive insights</li>
</ul>

<p>DataViz Pro has already helped over 500 businesses transform their data into actionable insights, leading to an average 25% improvement in decision-making speed.</p>`,
      raisedDollars: 8200,
      fundingGoalDollars: 8000,
  
      status: 'funded',
      deployModes: ['saas', 'self-hosted'],
      sectors: ['technology', 'analytics', 'business intelligence'],
      maker: { name: 'Jamie Park', email: 'jamie@example.com', id: 'demo-maker-3' },
      pledges: [],
      milestones: [
        { id: 'demo-milestone-7', name: 'Core Platform', pct: 38, acceptance: { checklist: ['Basic charts', 'Data connectors', 'Dashboard builder'] }, status: 'completed' },
        { id: 'demo-milestone-8', name: 'Advanced Features', pct: 75, acceptance: { checklist: ['AI recommendations', 'Real-time data', 'Interactive filters'] }, status: 'completed' },
        { id: 'demo-milestone-9', name: 'Enterprise Launch', pct: 100, acceptance: { checklist: ['White-label features', 'Enterprise security', 'Custom branding'] }, status: 'completed' }
      ],
      stretchGoals: [
        { title: 'Mobile App', targetDollars: 10000, description: 'Native mobile dashboard viewing' },
        { title: 'Advanced AI', targetDollars: 12000, description: 'Predictive analytics and forecasting' }
      ],
      pledgeTiers: [
        { title: 'Starter', amount: 19, description: '6 months access + 5 dashboards', maxBackers: 100, currentBackers: 8 },
        { title: 'Professional', amount: 79, description: '1 year access + unlimited dashboards', maxBackers: 50, currentBackers: 5 },
        { title: 'Enterprise', amount: 299, description: 'Lifetime access + white-label features', maxBackers: 20, currentBackers: 2 }
      ],
      teamMembers: [
        { user: { name: 'Jamie Park', email: 'jamie@example.com' }, role: 'Founder & CEO' },
        { user: { name: 'Sam Taylor', email: 'sam@example.com' }, role: 'Data Scientist' },
        { user: { name: 'Chris Lee', email: 'chris@example.com' }, role: 'Frontend Lead' }
      ],
      comments: [],
      _count: { pledges: 15, comments: 9 },
      createdAt: new Date('2024-11-01'),
      endsAt: new Date('2024-12-15')
    }
  ];
