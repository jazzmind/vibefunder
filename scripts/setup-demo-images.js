const fs = require('fs');
const path = require('path');

// For now, we'll use Unsplash placeholder images that are appropriate for tech campaigns
const placeholderImages = [
  {
    id: 'demo-1',
    title: 'TaskBuddy - AI-Powered Project Manager',
    url: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=1024&h=1024&fit=crop&crop=entropy&auto=format&q=80', // Task management/productivity
    filename: 'demo-1.jpg'
  },
  {
    id: 'demo-2',
    title: 'CodeFlow - Developer Workflow Optimizer', 
    url: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=1024&h=1024&fit=crop&crop=entropy&auto=format&q=80', // Code/development
    filename: 'demo-2.jpg'
  },
  {
    id: 'demo-3',
    title: 'DataViz Pro - Interactive Analytics Dashboard',
    url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1024&h=1024&fit=crop&crop=entropy&auto=format&q=80', // Data/analytics
    filename: 'demo-3.jpg'
  }
];

async function downloadImage(campaign) {
  try {
    console.log(`📥 Downloading placeholder image for ${campaign.title}...`);
    
    const response = await fetch(campaign.url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const imagePath = path.join(__dirname, '..', 'public', 'images', 'demo', campaign.filename);
    fs.writeFileSync(imagePath, buffer);
    
    console.log(`✅ Saved placeholder image for ${campaign.title}`);
    return `/images/demo/${campaign.filename}`;
  } catch (error) {
    console.error(`❌ Error downloading image for ${campaign.title}:`, error.message);
    return null;
  }
}

async function setupDemoImages() {
  console.log('🚀 Setting up demo campaign images...');
  
  // Create directory if it doesn't exist
  const demoDir = path.join(__dirname, '..', 'public', 'images', 'demo');
  if (!fs.existsSync(demoDir)) {
    fs.mkdirSync(demoDir, { recursive: true });
  }
  
  const results = [];
  
  for (const campaign of placeholderImages) {
    const imagePath = await downloadImage(campaign);
    results.push({
      id: campaign.id,
      title: campaign.title,
      imagePath
    });
    
    // Small delay between downloads
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('\n🎉 Demo images setup complete!');
  console.log('\nImage paths to add to demo campaigns:');
  results.forEach(result => {
    if (result.imagePath) {
      console.log(`  ${result.id}: image: '${result.imagePath}',`);
    }
  });
  
  console.log('\n💡 To generate AI images instead, add OPENAI_API_KEY to your .env file and run:');
  console.log('   node scripts/generate-demo-images.js');
}

setupDemoImages().catch(console.error);