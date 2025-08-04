const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const campaigns = [
  {
    id: 'demo-1',
    title: 'TaskBuddy - AI-Powered Project Manager',
    description: 'Revolutionary AI tool that helps teams organize and prioritize tasks automatically',
    prompt: 'A sleek, modern dashboard interface showing AI-powered task management with colorful task cards, priority indicators, and team collaboration features. Clean UI design with gradients and modern typography. Professional tech startup aesthetic.'
  },
  {
    id: 'demo-2',
    title: 'CodeFlow - Developer Workflow Optimizer',
    description: 'Streamline your development process with intelligent code review and deployment automation',
    prompt: 'A sophisticated code editor interface with AI analysis overlays, showing intelligent code suggestions, deployment pipelines, and developer workflow optimization. Dark theme with neon accents, modern tech aesthetic.'
  },
  {
    id: 'demo-3',
    title: 'DataViz Pro - Interactive Analytics Dashboard',
    description: 'Transform complex data into beautiful, interactive visualizations with no coding required',
    prompt: 'A beautiful data visualization dashboard with colorful charts, graphs, and interactive analytics. Modern business intelligence interface with clean design, showing various chart types and real-time data. Professional and vibrant.'
  }
];

async function generateImage(campaign) {
  try {
    console.log(`🎨 Generating image for ${campaign.title}...`);
    
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: campaign.prompt,
      size: "1024x1024",
      quality: "standard",
      n: 1,
    });

    const imageUrl = response.data[0].url;
    
    // Download the image
    const imageResponse = await fetch(imageUrl);
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Save the image
    const imagePath = path.join(__dirname, '..', 'public', 'images', 'demo', `${campaign.id}.png`);
    
    // Create directory if it doesn't exist
    const dir = path.dirname(imagePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(imagePath, buffer);
    
    console.log(`✅ Saved image for ${campaign.title} to ${imagePath}`);
    
    return `/images/demo/${campaign.id}.png`;
  } catch (error) {
    console.error(`❌ Error generating image for ${campaign.title}:`, error.message);
    return null;
  }
}

async function generateAllImages() {
  console.log('🚀 Starting image generation for demo campaigns...');
  
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY environment variable is required');
    process.exit(1);
  }
  
  const results = [];
  
  for (const campaign of campaigns) {
    const imagePath = await generateImage(campaign);
    results.push({
      id: campaign.id,
      title: campaign.title,
      imagePath
    });
    
    // Add a small delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n🎉 Image generation complete!');
  console.log('\nResults:');
  results.forEach(result => {
    console.log(`  ${result.title}: ${result.imagePath || 'Failed'}`);
  });
  
  // Output code snippet to add to demo campaigns
  console.log('\n📋 Add these image paths to your demo campaigns:');
  results.forEach(result => {
    if (result.imagePath) {
      console.log(`  ${result.id}: image: '${result.imagePath}',`);
    }
  });
}

generateAllImages().catch(console.error);