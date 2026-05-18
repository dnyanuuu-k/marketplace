import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PROJECT_TEMPLATES = [
  {
    title: "Modern Dashboard UI Kit",
    description: "A comprehensive dashboard UI kit built with React and Tailwind CSS. Includes 50+ components, dark mode support, responsive layouts, and detailed documentation. Perfect for SaaS applications, admin panels, and data visualization tools.",
    shortDescription: "50+ React dashboard components with dark mode",
    category: "DESIGN" as const,
    price: 79,
    tags: '["React", "Dashboard", "UI Kit", "Tailwind CSS"]',
    features: '["50+ Components", "Dark Mode", "Responsive", "TypeScript", "Documentation"]',
    thumbnailUrl: "https://picsum.photos/seed/proj1/600/400",
    images: '["https://picsum.photos/seed/proj1a/800/600", "https://picsum.photos/seed/proj1b/800/600", "https://picsum.photos/seed/proj1c/800/600"]',
    demoUrl: "https://dashboard-demo.example.com",
  },
  {
    title: "E-Commerce Starter Template",
    description: "Full-stack e-commerce template with Next.js 14, Stripe integration, and Prisma. Features product catalog, shopping cart, checkout flow, user authentication, and admin dashboard. Production-ready with SEO optimization.",
    shortDescription: "Full-stack Next.js e-commerce with Stripe",
    category: "DEVELOPMENT" as const,
    price: 149,
    tags: '["Next.js", "E-Commerce", "Stripe", "Prisma"]',
    features: '["Product Catalog", "Shopping Cart", "Stripe Checkout", "Auth System", "Admin Dashboard"]',
    thumbnailUrl: "https://picsum.photos/seed/proj2/600/400",
    images: '["https://picsum.photos/seed/proj2a/800/600", "https://picsum.photos/seed/proj2b/800/600"]',
    demoUrl: "https://ecommerce-demo.example.com",
  },
  {
    title: "AI Content Writer Pro",
    description: "AI-powered content writing tool with GPT integration. Generate blog posts, social media captions, email templates, and marketing copy. Includes tone adjustment, SEO optimization, and bulk generation features.",
    shortDescription: "AI writing tool with GPT integration",
    category: "WRITING" as const,
    price: 59,
    tags: '["AI", "Content Writing", "GPT", "SEO"]',
    features: '["GPT Integration", "Tone Adjustment", "SEO Optimization", "Bulk Generation", "Templates"]',
    thumbnailUrl: "https://picsum.photos/seed/proj3/600/400",
    images: '["https://picsum.photos/seed/proj3a/800/600", "https://picsum.photos/seed/proj3b/800/600"]',
  },
  {
    title: "Social Media Marketing Toolkit",
    description: "Complete social media marketing toolkit with analytics dashboard, post scheduler, engagement tracker, and competitor analysis. Supports Instagram, Twitter, LinkedIn, and Facebook.",
    shortDescription: "Social media management & analytics toolkit",
    category: "MARKETING" as const,
    price: 99,
    tags: '["Social Media", "Analytics", "Scheduling", "Marketing"]',
    features: '["Post Scheduler", "Analytics Dashboard", "Competitor Analysis", "Multi-Platform", "Engagement Tracker"]',
    thumbnailUrl: "https://picsum.photos/seed/proj4/600/400",
    images: '["https://picsum.photos/seed/proj4a/800/600", "https://picsum.photos/seed/proj4b/800/600"]',
  },
  {
    title: "Video Editing Preset Pack",
    description: "Professional video editing presets for DaVinci Resolve and Premiere Pro. 200+ color grading presets, transition effects, and motion graphics templates. Perfect for YouTube creators and filmmakers.",
    shortDescription: "200+ video editing presets & effects",
    category: "VIDEO" as const,
    price: 39,
    tags: '["Video Editing", "Presets", "DaVinci Resolve", "Premiere Pro"]',
    features: '["200+ Presets", "Color Grading", "Transitions", "Motion Graphics", "4K Support"]',
    thumbnailUrl: "https://picsum.photos/seed/proj5/600/400",
    images: '["https://picsum.photos/seed/proj5a/800/600", "https://picsum.photos/seed/proj5b/800/600"]',
  },
  {
    title: "Lo-Fi Beat Collection",
    description: "Royalty-free lo-fi beat collection with 50 tracks perfect for podcasts, YouTube videos, and streaming. Includes stems, MIDI files, and commercial license. WAV and MP3 formats included.",
    shortDescription: "50 royalty-free lo-fi beats with stems",
    category: "MUSIC" as const,
    price: 49,
    tags: '["Lo-Fi", "Beats", "Royalty-Free", "Podcast"]',
    features: '["50 Tracks", "Stems Included", "MIDI Files", "Commercial License", "WAV & MP3"]',
    thumbnailUrl: "https://picsum.photos/seed/proj6/600/400",
    images: '["https://picsum.photos/seed/proj6a/800/600"]',
  },
  {
    title: "Data Analytics Dashboard",
    description: "Interactive data analytics dashboard built with React, D3.js, and Python backend. Features real-time data visualization, custom report builder, data export, and team collaboration tools.",
    shortDescription: "Interactive analytics with real-time visualization",
    category: "ANALYTICS" as const,
    price: 129,
    tags: '["Analytics", "D3.js", "React", "Python"]',
    features: '["Real-time Charts", "Report Builder", "Data Export", "Team Collaboration", "Custom Widgets"]',
    thumbnailUrl: "https://picsum.photos/seed/proj7/600/400",
    images: '["https://picsum.photos/seed/proj7a/800/600", "https://picsum.photos/seed/proj7b/800/600"]',
  },
  {
    title: "Figma Design System",
    description: "Complete design system for Figma with 100+ components, auto-layout, variants, and design tokens. Includes mobile and desktop layouts, icons, illustrations, and a comprehensive style guide.",
    shortDescription: "100+ Figma components with design tokens",
    category: "DESIGN" as const,
    price: 69,
    tags: '["Figma", "Design System", "UI Components", "Tokens"]',
    features: '["100+ Components", "Auto Layout", "Variants", "Design Tokens", "Style Guide"]',
    thumbnailUrl: "https://picsum.photos/seed/proj8/600/400",
    images: '["https://picsum.photos/seed/proj8a/800/600", "https://picsum.photos/seed/proj8b/800/600", "https://picsum.photos/seed/proj8c/800/600"]',
    featured: true,
  },
  {
    title: "SaaS Boilerplate",
    description: "Production-ready SaaS boilerplate with authentication, billing, teams, notifications, and admin panel. Built with Next.js 14, TypeScript, Prisma, and Stripe. Save weeks of development time.",
    shortDescription: "Production-ready Next.js SaaS starter",
    category: "DEVELOPMENT" as const,
    price: 199,
    tags: '["SaaS", "Boilerplate", "Next.js", "TypeScript"]',
    features: '["Auth System", "Stripe Billing", "Team Management", "Notifications", "Admin Panel"]',
    thumbnailUrl: "https://picsum.photos/seed/proj9/600/400",
    images: '["https://picsum.photos/seed/proj9a/800/600", "https://picsum.photos/seed/proj9b/800/600"]',
    demoUrl: "https://saas-demo.example.com",
    featured: true,
  },
  {
    title: "SEO Audit Tool",
    description: "Automated SEO audit tool that analyzes websites for technical SEO issues, content quality, backlinks, and keyword rankings. Generates detailed reports with actionable recommendations.",
    shortDescription: "Automated SEO audit with actionable insights",
    category: "MARKETING" as const,
    price: 89,
    tags: '["SEO", "Audit", "Analytics", "Reports"]',
    features: '["Technical SEO", "Content Analysis", "Backlink Checker", "Keyword Tracking", "PDF Reports"]',
    thumbnailUrl: "https://picsum.photos/seed/proj10/600/400",
    images: '["https://picsum.photos/seed/proj10a/800/600"]',
  },
  {
    title: "React Native Mobile Kit",
    description: "React Native mobile app starter kit with 30+ screens, navigation, state management, and push notifications. Works for iOS and Android with Expo. Includes authentication and payment flows.",
    shortDescription: "30+ React Native screens for iOS & Android",
    category: "DEVELOPMENT" as const,
    price: 119,
    tags: '["React Native", "Mobile", "Expo", "iOS", "Android"]',
    features: '["30+ Screens", "Navigation", "Push Notifications", "Auth Flow", "Payment Integration"]',
    thumbnailUrl: "https://picsum.photos/seed/proj11/600/400",
    images: '["https://picsum.photos/seed/proj11a/800/600", "https://picsum.photos/seed/proj11b/800/600"]',
    demoUrl: "https://mobile-demo.example.com",
  },
  {
    title: "Brand Identity Template Pack",
    description: "Complete brand identity template pack with logo variations, color palettes, typography guides, business card designs, social media templates, and brand guidelines document. Fully editable in Adobe Illustrator.",
    shortDescription: "Complete brand identity with templates",
    category: "DESIGN" as const,
    price: 59,
    tags: '["Branding", "Logo", "Templates", "Illustrator"]',
    features: '["Logo Variations", "Color Palettes", "Typography Guide", "Business Cards", "Social Media Kit"]',
    thumbnailUrl: "https://picsum.photos/seed/proj12/600/400",
    images: '["https://picsum.photos/seed/proj12a/800/600", "https://picsum.photos/seed/proj12b/800/600"]',
  },
  {
    title: "Copywriting Formula Generator",
    description: "Smart copywriting tool with 20+ proven formulas (AIDA, PAS, BAB, etc.). Generate high-converting sales copy, email sequences, and landing page content. Includes A/B testing templates.",
    shortDescription: "20+ proven copywriting formulas & templates",
    category: "WRITING" as const,
    price: 45,
    tags: '["Copywriting", "Formulas", "Sales Copy", "Email"]',
    features: '["20+ Formulas", "A/B Templates", "Sales Copy", "Email Sequences", "Landing Pages"]',
    thumbnailUrl: "https://picsum.photos/seed/proj13/600/400",
    images: '["https://picsum.photos/seed/proj13a/800/600"]',
  },
  {
    title: "Real-Time Chat Component",
    description: "Production-ready real-time chat component built with Socket.io, React, and Node.js. Supports direct messages, group chats, file sharing, typing indicators, and read receipts. Fully customizable.",
    shortDescription: "Real-time chat with Socket.io & React",
    category: "DEVELOPMENT" as const,
    price: 69,
    tags: '["Chat", "Socket.io", "Real-time", "React"]',
    features: '["Direct Messages", "Group Chats", "File Sharing", "Typing Indicators", "Read Receipts"]',
    thumbnailUrl: "https://picsum.photos/seed/proj14/600/400",
    images: '["https://picsum.photos/seed/proj14a/800/600", "https://picsum.photos/seed/proj14b/800/600"]',
    demoUrl: "https://chat-demo.example.com",
  },
  {
    title: "Motion Graphics Template Pack",
    description: "Professional motion graphics templates for After Effects. 100+ animated elements including titles, lower thirds, transitions, and social media overlays. Easy customization with control panels.",
    shortDescription: "100+ After Effects motion graphics templates",
    category: "VIDEO" as const,
    price: 79,
    tags: '["Motion Graphics", "After Effects", "Templates", "Animation"]',
    features: '["100+ Elements", "Titles & Lower Thirds", "Transitions", "Social Overlays", "Control Panel"]',
    thumbnailUrl: "https://picsum.photos/seed/proj15/600/400",
    images: '["https://picsum.photos/seed/proj15a/800/600"]',
  },
  {
    title: "Podcast Production Toolkit",
    description: "Complete podcast production toolkit with intro/outro templates, sound effects library, audio processing presets for Audacity and Adobe Audition, and show notes template generator.",
    shortDescription: "Complete podcast production with templates",
    category: "MUSIC" as const,
    price: 55,
    tags: '["Podcast", "Audio", "Production", "Sound Effects"]',
    features: '["Intro/Outro Templates", "Sound Effects", "Audio Presets", "Show Notes Generator", "Episode Planner"]',
    thumbnailUrl: "https://picsum.photos/seed/proj16/600/400",
    images: '["https://picsum.photos/seed/proj16a/800/600"]',
  },
  {
    title: "Business Intelligence Dashboard",
    description: "Enterprise-grade BI dashboard with drag-and-drop report builder, SQL query editor, scheduled reports, and role-based access control. Connects to PostgreSQL, MySQL, and BigQuery.",
    shortDescription: "Enterprise BI dashboard with SQL editor",
    category: "ANALYTICS" as const,
    price: 179,
    tags: '["BI", "Dashboard", "SQL", "Reports"]',
    features: '["Drag-and-Drop Builder", "SQL Editor", "Scheduled Reports", "RBAC", "Multi-DB Support"]',
    thumbnailUrl: "https://picsum.photos/seed/proj17/600/400",
    images: '["https://picsum.photos/seed/proj17a/800/600", "https://picsum.photos/seed/proj17b/800/600"]',
    featured: true,
  },
  {
    title: "Landing Page Builder Kit",
    description: "Drag-and-drop landing page builder with 25+ section templates, A/B testing integration, analytics tracking, and form builders. Built with Next.js and includes a visual editor.",
    shortDescription: "Visual landing page builder with 25+ templates",
    category: "DESIGN" as const,
    price: 89,
    tags: '["Landing Page", "Builder", "Next.js", "A/B Testing"]',
    features: '["25+ Sections", "Visual Editor", "A/B Testing", "Analytics", "Form Builder"]',
    thumbnailUrl: "https://picsum.photos/seed/proj18/600/400",
    images: '["https://picsum.photos/seed/proj18a/800/600", "https://picsum.photos/seed/proj18b/800/600"]',
    demoUrl: "https://landing-demo.example.com",
  },
  {
    title: "API Development Toolkit",
    description: "Complete API development toolkit with Express.js starter, authentication middleware, rate limiting, API documentation generator, testing utilities, and deployment scripts for AWS and Docker.",
    shortDescription: "Express.js API starter with docs & testing",
    category: "DEVELOPMENT" as const,
    price: 59,
    tags: '["API", "Express.js", "REST", "Documentation"]',
    features: '["Express Starter", "Auth Middleware", "Rate Limiting", "API Docs", "Docker Setup"]',
    thumbnailUrl: "https://picsum.photos/seed/proj19/600/400",
    images: '["https://picsum.photos/seed/proj19a/800/600"]',
  },
  {
    title: "Email Marketing Automation",
    description: "Email marketing automation tool with visual workflow builder, template editor, audience segmentation, A/B testing, and detailed analytics. Supports Mailchimp and SendGrid integration.",
    shortDescription: "Visual email marketing automation tool",
    category: "MARKETING" as const,
    price: 109,
    tags: '["Email Marketing", "Automation", "Templates", "Analytics"]',
    features: '["Workflow Builder", "Template Editor", "Segmentation", "A/B Testing", "Analytics"]',
    thumbnailUrl: "https://picsum.photos/seed/proj20/600/400",
    images: '["https://picsum.photos/seed/proj20a/800/600", "https://picsum.photos/seed/proj20b/800/600"]',
  },
];

async function main() {
  console.log('🌱 Seeding projects...');

  const authors = await prisma.user.findMany({
    where: { role: 'AUTHOR', status: 'ACTIVE' },
    include: { profile: true },
  });

  if (authors.length === 0) {
    console.error('❌ No active authors found. Run the main seed first.');
    process.exit(1);
  }

  const buyers = await prisma.user.findMany({
    where: { role: 'BUYER', status: 'ACTIVE' },
  });

  // Clear existing projects
  await prisma.projectReview.deleteMany();
  await prisma.$executeRawUnsafe('UPDATE `Transaction` SET projectId = NULL WHERE projectId IS NOT NULL');
  await prisma.project.deleteMany();
  console.log('🧹 Cleared existing projects');

  const projects = [];
  for (let i = 0; i < PROJECT_TEMPLATES.length; i++) {
    const template = PROJECT_TEMPLATES[i];
    const author = authors[i % authors.length];
    const daysAgo = Math.floor(Math.random() * 60) + 1;
    const totalSales = Math.floor(Math.random() * 30);
    const totalViews = totalSales * 15 + Math.floor(Math.random() * 500);
    const avgRating = 3.5 + Math.random() * 1.5;
    const reviewCount = Math.floor(totalSales * 0.4);

    const project = await prisma.project.create({
      data: {
        authorId: author.id,
        title: template.title,
        description: template.description,
        shortDescription: template.shortDescription,
        category: template.category,
        status: i < 2 ? 'DRAFT' : 'PUBLISHED',
        price: template.price,
        thumbnailUrl: template.thumbnailUrl,
        images: template.images,
        tags: template.tags,
        features: template.features,
        demoUrl: template.demoUrl || null,
        totalSales,
        totalViews,
        averageRating: parseFloat(avgRating.toFixed(1)),
        reviewCount,
        featured: template.featured || false,
        createdAt: new Date(Date.now() - daysAgo * 86400000),
      },
    });
    projects.push(project);
  }

  console.log(`✅ Created ${projects.length} projects`);

  const publishedProjects = projects.filter(p => p.status === 'PUBLISHED');
  const COMMISSION_RATE = 0.10;
  let purchaseCount = 0;

  for (const project of publishedProjects.slice(0, 8)) {
    const numPurchases = Math.floor(Math.random() * 3) + 1;
    const shuffledBuyers = [...buyers].sort(() => Math.random() - 0.5);

    for (let j = 0; j < Math.min(numPurchases, shuffledBuyers.length); j++) {
      const buyer = shuffledBuyers[j];
      const amount = project.price;
      const commissionAmount = parseFloat((amount * COMMISSION_RATE).toFixed(2));
      const netAmount = parseFloat((amount - commissionAmount).toFixed(2));

      await prisma.transaction.create({
        data: {
          buyerId: buyer.id,
          sellerId: project.authorId,
          amount,
          commissionAmount,
          netAmount,
          status: 'COMPLETED',
          stripePaymentIntentId: `pi_proj_${purchaseCount}`,
          description: `Purchase: ${project.title}`,
          projectId: project.id,
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 30) * 86400000),
        },
      });
      purchaseCount++;
    }
  }

  console.log(`✅ Created ${purchaseCount} project purchases`);

  let reviewCount = 0;
  for (const project of publishedProjects.slice(0, 5)) {
    const projectTransactions = await prisma.transaction.findMany({
      where: { projectId: project.id, status: 'COMPLETED' },
      take: 3,
    });

    for (const tx of projectTransactions) {
      const rating = Math.floor(Math.random() * 2) + 4;
      const comments = [
        "Excellent quality! Exactly what I needed. Very well documented.",
        "Great project, saved me a lot of time. The code is clean and well-organized.",
        "Worth every penny. Easy to customize and the support was helpful.",
        "Very professional work. The documentation is thorough and clear.",
        "Impressive quality and attention to detail. Highly recommended!",
      ];

      await prisma.projectReview.create({
        data: {
          projectId: project.id,
          userId: tx.buyerId,
          rating,
          comment: comments[reviewCount % comments.length],
          createdAt: new Date(Date.now() - Math.floor(Math.random() * 20) * 86400000),
        },
      });
      reviewCount++;
    }
  }

  console.log(`✅ Created ${reviewCount} project reviews`);

  const projectCount = await prisma.project.count();
  const publishedCount = await prisma.project.count({ where: { status: 'PUBLISHED' } });
  const featuredCount = await prisma.project.count({ where: { featured: true } });

  console.log('\n📊 Project Seed Summary:');
  console.log('─'.repeat(40));
  console.log(`  Total projects: ${projectCount}`);
  console.log(`  Published: ${publishedCount}`);
  console.log(`  Featured: ${featuredCount}`);
  console.log(`  Project purchases: ${purchaseCount}`);
  console.log(`  Project reviews: ${reviewCount}`);
  console.log('─'.repeat(40));
  console.log('✅ Project seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
