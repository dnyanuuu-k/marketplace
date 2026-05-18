import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const COMMISSION_RATE = 0.20; // 20%

// ─── Helper Functions ───────────────────────────────────────────────

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals = 2): number {
  const val = Math.random() * (max - min) + min;
  return parseFloat(val.toFixed(decimals));
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function hoursAgo(hours: number): Date {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  return d;
}

// ─── Data Templates ─── //

const FIRST_NAMES = [
  'James', 'Olivia', 'Ethan', 'Sophia', 'Liam', 'Emma', 'Noah', 'Ava',
  'Mason', 'Isabella', 'Lucas', 'Mia', 'Alexander', 'Charlotte', 'Daniel',
  'Amelia', 'Henry', 'Harper', 'Sebastian', 'Evelyn', 'Jack', 'Abigail',
  'Owen', 'Emily', 'Ryan', 'Elizabeth', 'Leo', 'Chloe', 'Max', 'Grace',
  'Benjamin', 'Lily', 'William', 'Zoe', 'Elijah', 'Hannah', 'Aiden', 'Nora',
  'Caleb', 'Riley',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
  'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
  'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark',
  'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King',
  'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
];

const LOCATIONS = [
  'San Francisco, CA', 'New York, NY', 'Austin, TX', 'Seattle, WA',
  'Denver, CO', 'Portland, OR', 'Chicago, IL', 'Miami, FL',
  'Boston, MA', 'Los Angeles, CA', 'Nashville, TN', 'Atlanta, GA',
  'Minneapolis, MN', 'San Diego, CA', 'Phoenix, AZ',
];

const SKILL_SETS = [
  '["UI/UX Design", "Figma", "Adobe XD", "Prototyping"]',
  '["React", "Next.js", "TypeScript", "Tailwind CSS"]',
  '["Python", "Django", "Flask", "Machine Learning"]',
  '["Node.js", "Express", "MongoDB", "REST APIs"]',
  '["iOS Development", "Swift", "SwiftUI", "Xcode"]',
  '["Android Development", "Kotlin", "Jetpack Compose", "Firebase"]',
  '["Full-Stack Development", "React", "Node.js", "PostgreSQL"]',
  '["Data Science", "Python", "R", "TensorFlow", "SQL"]',
  '["DevOps", "AWS", "Docker", "Kubernetes", "CI/CD"]',
  '["Graphic Design", "Photoshop", "Illustrator", "Branding"]',
];

const BIO_TEMPLATES = [
  'Passionate {skill} specialist with over 5 years of experience delivering high-quality solutions for clients worldwide. I focus on clean, maintainable code and pixel-perfect designs.',
  'Award-winning {skill} professional. I love turning complex problems into elegant solutions. Available for both short-term projects and long-term collaborations.',
  'With 7+ years in {skill}, I bring deep expertise and a collaborative approach to every project. My clients appreciate my attention to detail and commitment to deadlines.',
  'Creative {skill} expert who believes great design solves real problems. I combine technical skills with a strong design sensibility to deliver outstanding results.',
  'Seasoned {skill} consultant helping startups and enterprises build products that users love. Fast turnaround, clear communication, and reliable delivery.',
  'Freelance {skill} developer focused on building scalable, performant applications. I write tests, document my code, and never miss a deadline.',
  '{skill} is my craft and my passion. I have worked with Fortune 500 companies and early-stage startups alike, always delivering beyond expectations.',
  'Top-rated {skill} specialist with a 98% satisfaction rate. I believe in transparent communication and iterative development to ensure project success.',
  'I transform ideas into reality through {skill}. My approach combines user-centered design with robust engineering to create products that stand out.',
  'Dedicated {skill} professional with a track record of successful projects across e-commerce, SaaS, and fintech industries. Let\'s build something great together.',
];

const AVATAR_URLS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=',
  'https://api.dicebear.com/7.x/fun-emoji/svg?seed=',
  'https://api.dicebear.com/7.x/notionists/svg?seed=',
  'https://api.dicebear.com/7.x/bottts/svg?seed=',
  'https://api.dicebear.com/7.x/personas/svg?seed=',
];

const PORTFOLIO_IMAGES_TEMPLATES = [
  '["https://picsum.photos/seed/port1/800/600", "https://picsum.photos/seed/port2/800/600", "https://picsum.photos/seed/port3/800/600"]',
  '["https://picsum.photos/seed/port4/800/600", "https://picsum.photos/seed/port5/800/600"]',
  '["https://picsum.photos/seed/port6/800/600", "https://picsum.photos/seed/port7/800/600", "https://picsum.photos/seed/port8/800/600", "https://picsum.photos/seed/port9/800/600"]',
  '["https://picsum.photos/seed/port10/800/600"]',
  '["https://picsum.photos/seed/port11/800/600", "https://picsum.photos/seed/port12/800/600"]',
];

const SOCIAL_LINKS_TEMPLATES = [
  '{"twitter":"https://twitter.com/","github":"https://github.com/","linkedin":"https://linkedin.com/in/"}',
  '{"twitter":"https://twitter.com/","dribbble":"https://dribbble.com/"}',
  '{"github":"https://github.com/","website":"https://example.com"}',
  '{"twitter":"https://twitter.com/","linkedin":"https://linkedin.com/in/","website":"https://example.com"}',
  '{"behance":"https://behance.net/","dribbble":"https://dribbble.com/"}',
];

const TRANSACTION_DESCRIPTIONS = [
  'Website redesign for landing page',
  'Mobile app UI/UX design',
  'Backend API development',
  'E-commerce store setup',
  'Logo and brand identity package',
  'React component library',
  'Database schema design and optimization',
  'DevOps pipeline setup',
  'iOS app prototype',
  'Data visualization dashboard',
  'WordPress theme customization',
  'Chatbot integration',
  'Payment system integration',
  'SEO audit and optimization',
  'Content management system',
  'Real-time notification system',
  'Admin dashboard development',
  'Cross-platform mobile app',
  'Machine learning model training',
  'Performance optimization consultation',
  'AWS infrastructure setup',
  'Figma design to React code',
  'REST API documentation',
  'User authentication system',
  'Automated testing suite',
  'Cloud migration strategy',
  'Custom CMS development',
  'Social media integration',
  'Analytics tracking implementation',
  'Security audit and hardening',
];

const REVIEW_COMMENTS: Record<number, string[]> = {
  5: [
    'Absolutely outstanding work! Exceeded all expectations. Will definitely hire again.',
    'Incredible talent and professionalism. Delivered ahead of schedule with superb quality.',
    'One of the best freelancers I\'ve worked with. Perfect communication and results.',
    'Exceptional quality. The final product was better than I imagined. Highly recommended!',
    'Phenomenal work. Every detail was polished. A true professional.',
  ],
  4: [
    'Great work overall. Very professional and delivered on time. Minor tweaks needed but overall excellent.',
    'Really solid delivery. Good communication throughout. Would recommend.',
    'High-quality work with attention to detail. A few small revisions needed but nothing major.',
    'Delivered exactly what was asked. Good communicator and reliable. Would work with again.',
    'Strong technical skills and clean code. Slight delay but the quality made up for it.',
  ],
  3: [
    'Decent work but could have been better. Some miscommunication along the way.',
    'Average quality. Got the job done but took longer than expected.',
    'The deliverable met basic requirements but lacked polish. Room for improvement.',
    'Okay experience. The work was functional but not impressive. Communication was fair.',
    'Average. Expected more attention to detail for the price paid.',
  ],
  2: [
    'Below expectations. The work needed significant revisions and missed some requirements.',
    'Disappointing delivery. Had to request multiple redos. Would not hire again.',
    'Poor communication and the final product was not up to standard.',
  ],
  1: [
    'Very poor experience. Did not meet any of the agreed requirements. Would not recommend.',
    'Extremely disappointing. Waste of time and money.',
  ],
};

const AUTHOR_REPLIES = [
  'Thank you so much for the kind words! It was a pleasure working with you.',
  'I appreciate the feedback! Always striving to deliver the best.',
  'Thanks for the review! Looking forward to working together again.',
  'Thank you! Your clear requirements made the project a joy to work on.',
  'I\'m glad you\'re happy with the results! Let me know if you need anything else.',
  'I appreciate the honest feedback and will work on improving those areas.',
  'Thank you for the constructive review. I\'ll take this on board for future projects.',
];

const CONVERSATION_MESSAGES = [
  // Buyer asking about services
  { from: 'buyer', content: 'Hi! I saw your portfolio and I\'m interested in working with you on a project.' },
  { from: 'author', content: 'Hey! Thanks for reaching out. I\'d love to hear more about what you have in mind.' },
  { from: 'buyer', content: 'I need a complete redesign of my company\'s website. It\'s currently very outdated.' },
  { from: 'author', content: 'I can definitely help with that! Could you share the current URL and any specific requirements?' },
  { from: 'buyer', content: 'Sure, it\'s at example.com. We want a modern, clean look with better mobile responsiveness.' },
  { from: 'author', content: 'Got it. I\'ve taken a look and I have some ideas already. What\'s your timeline?' },
  { from: 'buyer', content: 'We\'re hoping to launch in about 4 weeks. Is that feasible?' },
  { from: 'author', content: 'That\'s a tight timeline but definitely doable. Let me put together a proposal for you.' },
  { from: 'buyer', content: 'Sounds great! Looking forward to it.' },
  { from: 'author', content: 'I\'ve sent over the proposal. Let me know if you have any questions!' },
  { from: 'buyer', content: 'The proposal looks good. Let\'s get started!' },
  { from: 'author', content: 'Awesome! I\'ll set up the project board and we can kick off tomorrow.' },
  { from: 'buyer', content: 'Perfect. Do you need any assets from our side?' },
  { from: 'author', content: 'Yes, I\'ll need your brand guidelines, logo files, and any content you want included.' },
  { from: 'buyer', content: 'I\'ll gather everything and send it over by end of day.' },

  // Another conversation pattern
  { from: 'buyer', content: 'Hello, I need help with a React component library. Are you available?' },
  { from: 'author', content: 'Hi! Yes, I\'m currently taking on new projects. What kind of components do you need?' },
  { from: 'buyer', content: 'We need about 20 reusable components for our design system.' },
  { from: 'author', content: 'That\'s right up my alley. Do you have a design file or style guide?' },
  { from: 'buyer', content: 'Yes, we have Figma files. I can share them with you.' },
  { from: 'author', content: 'Perfect. Share the Figma link and I\'ll review the scope.' },
  { from: 'buyer', content: 'Just shared it to your email. Let me know what you think.' },
  { from: 'author', content: 'Reviewed the designs. This is a solid scope. I estimate 3 weeks for all 20 components with full TypeScript support and tests.' },
  { from: 'buyer', content: 'That timeline works. What about the budget?' },
  { from: 'author', content: 'I\'d propose $3,500 for the complete library. That includes Storybook documentation.' },
  { from: 'buyer', content: 'Can we do $3,000?' },
  { from: 'author', content: 'I can do $3,200 if we can skip the Storybook docs and I\'ll provide basic README docs instead.' },
  { from: 'buyer', content: 'Deal! Let\'s do it.' },
];

const NOTIFICATION_TYPES = [
  { type: 'new_sale', title: 'New Sale!', message: 'You have a new sale for ${amount}' },
  { type: 'new_message', title: 'New Message', message: 'You have a new message from {name}' },
  { type: 'review_received', title: 'New Review', message: 'You received a {rating}-star review from {name}' },
  { type: 'transaction_update', title: 'Transaction Update', message: 'Your transaction #{id} has been updated' },
  { type: 'payout_processed', title: 'Payout Processed', message: 'Your payout of ${amount} has been processed' },
  { type: 'account_update', title: 'Account Update', message: 'Your account settings have been updated' },
  { type: 'dispute_update', title: 'Dispute Update', message: 'Dispute #{id} status has been updated' },
];

// ─── Main Seed Function ─────────────────────────────────────────────

async function main() {
  console.log('🌱 Starting database seed...');

  // Clean all tables (respect FK order)
  console.log('🧹 Cleaning existing data...');
  const tables = [
    'NotificationPref',
    'Notification',
    'AuditLog',
    'CommissionLog',
    'Dispute',
    'Review',
    'Message',
    'ConversationParticipant',
    'Conversation',
    'Transaction',
    'SavedAuthor',
    'Profile',
    'EmailVerification',
    'PasswordReset',
    'PlatformSetting',
    'User',
  ];
  for (const table of tables) {
    await prisma.$executeRawUnsafe(`DELETE FROM "${table}"`);
  }
  console.log('✅ All tables cleaned.');

  // Hash password
  const passwordHash = await bcrypt.hash('Admin1234!', 10);
  const defaultPasswordHash = await bcrypt.hash('Password123!', 10);

  // ─── 1. Create Super Admin ──────────────────────────────────────
  console.log('👤 Creating Super Admin...');
  const superAdmin = await prisma.user.create({
    data: {
      name: 'Platform Admin',
      email: 'admin@platform.dev',
      passwordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      avatarUrl: `${randomFrom(AVATAR_URLS)}admin`,
      emailVerified: new Date(),
    },
  });

  // ─── 2. Create Moderators ───────────────────────────────────────
  console.log('🛡️ Creating Moderators...');
  const moderators = [];
  const modData = [
    { name: 'Sarah Mitchell', email: 'sarah.mod@platform.dev', avatar: 'sarah' },
    { name: 'David Chen', email: 'david.mod@platform.dev', avatar: 'david' },
  ];
  for (const m of modData) {
    const mod = await prisma.user.create({
      data: {
        name: m.name,
        email: m.email,
        passwordHash: defaultPasswordHash,
        role: 'MODERATOR',
        status: 'ACTIVE',
        avatarUrl: `${randomFrom(AVATAR_URLS)}${m.avatar}`,
        emailVerified: new Date(),
      },
    });
    moderators.push(mod);
  }

  // ─── 3. Create Authors ──────────────────────────────────────────
  console.log('✍️ Creating Authors...');
  const authors = [];
  const authorNames = [
    { first: 'Alex', last: 'Rivera' },
    { first: 'Maya', last: 'Patel' },
    { first: 'Jordan', last: 'Kim' },
    { first: 'Taylor', last: 'Brooks' },
    { first: 'Casey', last: 'Morgan' },
    { first: 'Riley', last: 'Cooper' },
    { first: 'Avery', last: 'Foster' },
    { first: 'Quinn', last: 'Hayes' },
    { first: 'Reese', last: 'Nelson' },
    { first: 'Sage', last: 'Wallace' },
  ];

  for (let i = 0; i < 10; i++) {
    const skillSet = SKILL_SETS[i % SKILL_SETS.length];
    const primarySkill = JSON.parse(skillSet)[0];
    const bio = BIO_TEMPLATES[i].replace('{skill}', primarySkill);
    const location = LOCATIONS[i % LOCATIONS.length];
    const totalSales = randomBetween(5, 120);
    const avgRating = randomFloat(3.5, 5.0);

    const author = await prisma.user.create({
      data: {
        name: `${authorNames[i].first} ${authorNames[i].last}`,
        email: `${authorNames[i].first.toLowerCase()}.${authorNames[i].last.toLowerCase()}@author.dev`,
        passwordHash: defaultPasswordHash,
        role: 'AUTHOR',
        status: i === 8 ? 'PENDING' : 'ACTIVE', // One pending for testing
        avatarUrl: `${randomFrom(AVATAR_URLS)}author${i}`,
        emailVerified: i === 8 ? null : daysAgo(randomBetween(30, 365)),
        commissionRate: i < 3 ? 0.15 : null, // Some with custom rates
        profile: {
          create: {
            bio,
            skills: skillSet,
            portfolioImages: PORTFOLIO_IMAGES_TEMPLATES[i % PORTFOLIO_IMAGES_TEMPLATES.length],
            socialLinks: SOCIAL_LINKS_TEMPLATES[i % SOCIAL_LINKS_TEMPLATES.length],
            location,
            coverImageUrl: `https://picsum.photos/seed/cover${i}/1200/400`,
            isVerified: i < 5, // First 5 verified
            totalSales,
            averageRating: avgRating,
          },
        },
      },
    });
    authors.push(author);
  }

  // ─── 4. Create Buyers ───────────────────────────────────────────
  console.log('🛒 Creating Buyers...');
  const buyers = [];
  for (let i = 0; i < 20; i++) {
    const firstName = FIRST_NAMES[i + 10]; // offset to avoid overlap with author names
    const lastName = LAST_NAMES[i + 10];
    const buyer = await prisma.user.create({
      data: {
        name: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@buyer.dev`,
        passwordHash: defaultPasswordHash,
        role: 'BUYER',
        status: i === 15 ? 'SUSPENDED' : (i === 18 ? 'BANNED' : 'ACTIVE'), // Some non-active for testing
        avatarUrl: `${randomFrom(AVATAR_URLS)}buyer${i}`,
        emailVerified: i < 17 ? daysAgo(randomBetween(10, 200)) : null,
      },
    });
    buyers.push(buyer);
  }

  // ─── 5. Create Saved Authors ────────────────────────────────────
  console.log('💾 Creating Saved Authors...');
  for (let i = 0; i < buyers.length; i++) {
    // Each buyer saves 1-3 authors (except suspended/banned)
    if (buyers[i].status !== 'ACTIVE') continue;
    const numSaved = randomBetween(1, 3);
    const savedAuthorIndices = new Set<number>();
    while (savedAuthorIndices.size < numSaved) {
      savedAuthorIndices.add(randomBetween(0, authors.length - 1));
    }
    for (const authorIdx of savedAuthorIndices) {
      if (authors[authorIdx].status !== 'ACTIVE') continue;
      await prisma.savedAuthor.create({
        data: {
          buyerId: buyers[i].id,
          authorId: authors[authorIdx].id,
          createdAt: daysAgo(randomBetween(1, 60)),
        },
      });
    }
  }

  // ─── 6. Create Transactions ─────────────────────────────────────
  console.log('💰 Creating Transactions...');
  const transactions = [];
  const activeAuthors = authors.filter(a => a.status === 'ACTIVE');
  const activeBuyers = buyers.filter(b => b.status === 'ACTIVE');

  for (let i = 0; i < 50; i++) {
    const amount = randomFloat(20, 500);
    const commissionAmount = parseFloat((amount * COMMISSION_RATE).toFixed(2));
    const netAmount = parseFloat((amount - commissionAmount).toFixed(2));
    const seller = randomFrom(activeAuthors);
    const buyer = randomFrom(activeBuyers);
    const isDisputed = i < 5; // First 5 will be disputed
    const status = isDisputed ? 'DISPUTED' : 'COMPLETED';

    const transaction = await prisma.transaction.create({
      data: {
        buyerId: buyer.id,
        sellerId: seller.id,
        amount,
        commissionAmount,
        netAmount,
        status,
        stripePaymentIntentId: `pi_mock_${i.toString().padStart(4, '0')}`,
        description: TRANSACTION_DESCRIPTIONS[i % TRANSACTION_DESCRIPTIONS.length],
        createdAt: daysAgo(randomBetween(1, 90)),
      },
    });

    // Create commission log for each transaction
    await prisma.commissionLog.create({
      data: {
        transactionId: transaction.id,
        rate: COMMISSION_RATE,
        commissionAmount,
        createdAt: transaction.createdAt,
      },
    });

    transactions.push(transaction);
  }

  // ─── 7. Create Reviews ──────────────────────────────────────────
  console.log('⭐ Creating Reviews...');
  const reviewedTransactionIds = new Set<string>();

  for (let i = 0; i < 30; i++) {
    // Pick a random transaction that hasn't been reviewed yet
    const availableTransactions = transactions.filter(t => !reviewedTransactionIds.has(t.id) && t.status === 'COMPLETED');
    if (availableTransactions.length === 0) break;

    const transaction = randomFrom(availableTransactions);
    reviewedTransactionIds.add(transaction.id);

    const rating = randomBetween(1, 5);
    const comments = REVIEW_COMMENTS[rating];
    const comment = randomFrom(comments);

    // Determine if this review gets a reply (more likely for positive reviews)
    const hasReply = rating >= 3 ? Math.random() < 0.5 : Math.random() < 0.2;
    const shouldFlag = rating <= 2 && Math.random() < 0.4;

    await prisma.review.create({
      data: {
        transactionId: transaction.id,
        reviewerId: transaction.buyerId,
        authorId: transaction.sellerId,
        rating,
        comment,
        reply: hasReply ? randomFrom(AUTHOR_REPLIES) : null,
        repliedAt: hasReply ? daysAgo(randomBetween(1, 15)) : null,
        flagged: shouldFlag,
        createdAt: daysAgo(randomBetween(5, 60)),
      },
    });
  }

  // ─── 8. Create Disputes ─────────────────────────────────────────
  console.log('⚖️ Creating Disputes...');
  const disputedTransactions = transactions.filter(t => t.status === 'DISPUTED');

  const disputeReasons = [
    'Deliverable did not match the agreed scope. Missing key features that were discussed.',
    'Work was submitted past the deadline and the quality was significantly below expectations.',
    'Seller stopped responding after receiving payment. No deliverables received.',
    'The code delivered had multiple critical bugs and was not production-ready as promised.',
    'Seller used copyrighted material in the deliverable without disclosure or permission.',
  ];

  for (let i = 0; i < 5; i++) {
    if (i >= disputedTransactions.length) break;
    const transaction = disputedTransactions[i];
    const evidenceUrls = JSON.stringify([
      `https://evidence.platform.dev/dispute${i + 1}/screenshot1.png`,
      `https://evidence.platform.dev/dispute${i + 1}/screenshot2.png`,
      `https://evidence.platform.dev/dispute${i + 1}/contract.pdf`,
    ]);

    await prisma.dispute.create({
      data: {
        transactionId: transaction.id,
        openedById: transaction.buyerId,
        reason: disputeReasons[i],
        evidenceUrls,
        status: i < 3 ? 'OPEN' : 'UNDER_REVIEW',
        createdAt: daysAgo(randomBetween(1, 20)),
      },
    });
  }

  // ─── 9. Create Conversations & Messages ─────────────────────────
  console.log('💬 Creating Conversations...');
  for (let i = 0; i < 10; i++) {
    const buyer = randomFrom(activeBuyers);
    const author = randomFrom(activeAuthors);
    // Ensure buyer and author are different people
    if (buyer.id === author.id) continue;

    const conversation = await prisma.conversation.create({
      data: {
        createdAt: daysAgo(randomBetween(5, 40)),
      },
    });

    // Add participants
    await prisma.conversationParticipant.createMany({
      data: [
        { conversationId: conversation.id, userId: buyer.id },
        { conversationId: conversation.id, userId: author.id },
      ],
    });

    // Create 5-15 messages
    const numMessages = randomBetween(5, 15);
    let msgDate = daysAgo(randomBetween(5, 30));

    for (let j = 0; j < numMessages; j++) {
      const msgTemplate = CONVERSATION_MESSAGES[j % CONVERSATION_MESSAGES.length];
      const senderId = msgTemplate.from === 'buyer' ? buyer.id : author.id;
      const isRead = j < numMessages - 2 ? true : Math.random() < 0.5; // Last 2 messages may be unread

      msgDate = new Date(msgDate.getTime() + randomBetween(1, 120) * 60000); // 1-120 min apart

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId,
          content: msgTemplate.content,
          readAt: isRead ? new Date(msgDate.getTime() + randomBetween(1, 30) * 60000) : null,
          createdAt: msgDate,
        },
      });
    }

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: msgDate },
    });
  }

  // ─── 10. Create Platform Settings ───────────────────────────────
  console.log('⚙️ Creating Platform Settings...');
  const settings = [
    { key: 'commission_rate', value: '20' },
    { key: 'payout_schedule', value: 'weekly' },
    { key: 'min_payout', value: '50' },
    { key: 'platform_name', value: 'MarketPro' },
    { key: 'max_dispute_days', value: '30' },
    { key: 'auto_payout', value: 'true' },
    { key: 'require_verification', value: 'true' },
    { key: 'support_email', value: 'support@marketpro.dev' },
  ];

  for (const setting of settings) {
    await prisma.platformSetting.create({
      data: {
        key: setting.key,
        value: setting.value,
      },
    });
  }

  // ─── 11. Create Notifications ───────────────────────────────────
  console.log('🔔 Creating Notifications...');
  const allUsers = [superAdmin, ...moderators, ...authors, ...buyers];
  const activeUsers = allUsers.filter(u => u.status === 'ACTIVE');

  for (let i = 0; i < 80; i++) {
    const user = randomFrom(activeUsers);
    const notifTemplate = randomFrom(NOTIFICATION_TYPES);
    let message = notifTemplate.message;
    let title = notifTemplate.title;

    // Customize message based on type
    if (notifTemplate.type === 'new_sale') {
      message = message.replace('{amount}', `$${randomBetween(20, 300)}`);
    } else if (notifTemplate.type === 'new_message') {
      const otherUser = randomFrom(activeUsers.filter(u => u.id !== user.id));
      message = message.replace('{name}', otherUser.name);
    } else if (notifTemplate.type === 'review_received') {
      message = message.replace('{rating}', String(randomBetween(3, 5)));
      const otherUser = randomFrom(activeBuyers);
      message = message.replace('{name}', otherUser.name);
    } else if (notifTemplate.type === 'transaction_update') {
      message = message.replace('{id}', randomBetween(1000, 9999).toString());
    } else if (notifTemplate.type === 'payout_processed') {
      message = message.replace('{amount}', `$${randomBetween(50, 500)}`);
    } else if (notifTemplate.type === 'dispute_update') {
      message = message.replace('{id}', randomBetween(1000, 9999).toString());
    }

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: notifTemplate.type,
        title,
        message,
        isRead: Math.random() < 0.6,
        link: Math.random() < 0.4 ? `/dashboard/${notifTemplate.type.replace('_', '-')}` : null,
        createdAt: daysAgo(randomBetween(0, 30)),
      },
    });
  }

  // ─── 12. Create Notification Preferences ────────────────────────
  console.log('📋 Creating Notification Preferences...');
  for (const user of allUsers) {
    await prisma.notificationPref.create({
      data: {
        userId: user.id,
        newSale: true,
        newMessage: true,
        reviewReceived: true,
        transactionUpdate: true,
        accountUpdate: true,
        payoutProcessed: user.role === 'AUTHOR' || user.role === 'SUPER_ADMIN',
        disputeUpdate: true,
      },
    });
  }

  // ─── 13. Create Audit Logs ──────────────────────────────────────
  console.log('📝 Creating Audit Logs...');
  const auditActions = [
    { action: 'user.login', target: 'User', metadata: '{"ip":"192.168.1.100"}' },
    { action: 'user.register', target: 'User', metadata: '{"source":"web"}' },
    { action: 'transaction.create', target: 'Transaction', metadata: '{"amount":150}' },
    { action: 'review.flag', target: 'Review', metadata: '{"reason":"inappropriate"}' },
    { action: 'dispute.open', target: 'Dispute', metadata: '{"transactionId":"mock"}' },
    { action: 'user.suspend', target: 'User', metadata: '{"reason":"policy_violation"}' },
    { action: 'payout.process', target: 'Payout', metadata: '{"amount":250}' },
    { action: 'setting.update', target: 'PlatformSetting', metadata: '{"key":"commission_rate","oldValue":"15","newValue":"20"}' },
  ];

  for (let i = 0; i < 30; i++) {
    const auditTemplate = randomFrom(auditActions);
    const actor = randomFrom([superAdmin, ...moderators]);
    const targetId = randomFrom(activeUsers).id;

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: auditTemplate.action,
        targetId,
        targetType: auditTemplate.target,
        metadata: auditTemplate.metadata,
        createdAt: daysAgo(randomBetween(1, 60)),
      },
    });
  }

  // ─── Summary ─────────────────────────────────────────────────────
  const counts = {
    users: await prisma.user.count(),
    profiles: await prisma.profile.count(),
    transactions: await prisma.transaction.count(),
    reviews: await prisma.review.count(),
    disputes: await prisma.dispute.count(),
    conversations: await prisma.conversation.count(),
    messages: await prisma.message.count(),
    savedAuthors: await prisma.savedAuthor.count(),
    notifications: await prisma.notification.count(),
    notificationPrefs: await prisma.notificationPref.count(),
    platformSettings: await prisma.platformSetting.count(),
    commissionLogs: await prisma.commissionLog.count(),
    auditLogs: await prisma.auditLog.count(),
  };

  console.log('\n📊 Seed Summary:');
  console.log('─'.repeat(40));
  for (const [key, value] of Object.entries(counts)) {
    console.log(`  ${key}: ${value}`);
  }
  console.log('─'.repeat(40));
  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
