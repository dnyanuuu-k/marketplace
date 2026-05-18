import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ALBOSTECH_AUTHOR_EMAIL = "author@albostech.com";

const ALBOSTECH_PROJECTS = [
  {
    title: "HRMS — Human Resource Management System",
    shortDescription:
      "Full-stack HR portal for SMEs: attendance, leave, payroll, salary slips, and notice board.",
    description: `Human Resource Management System (HRMS) by Albos Technology — a production-ready platform that digitises core HR operations for small and medium enterprises.

**Dual-portal experience**
- HR / Admin portal: employee CRUD, attendance import (Excel), leave approvals, holiday master, payroll generation, and notice broadcast
- Employee portal: monthly attendance calendar, leave applications, digital salary slips, and profile management

**Technology stack**
- Frontend: Next.js 14 (App Router), Tailwind CSS, React Hook Form
- Backend: Node.js, Express.js, MongoDB (Mongoose)
- Auth: JWT with HTTP-only cookies, bcrypt password hashing

**Key modules**
- Employee management with soft-delete and role-based access (HR / Employee)
- Attendance: bulk Excel import, manual punch entry, late-mark detection (10:10 AM threshold)
- Leave workflow: full-day / half-day requests with balance validation and HR approval
- Payroll: automated gross-to-net calculation with absent, late, and leave deductions
- Notice board: global announcements and individual notices with read tracking
- Holiday master: national and company holidays on the employee calendar

**Business rules included**
- Office hours 10:00 AM – 7:00 PM, Saturday working, Sunday off
- Every 3 late marks = 1 day salary deduction (carry-forward supported)
- Digital salary slip with PDF download

Founder: Chandra Prakash Singh | Albos Technology | Version 1.0`,
    category: "DEVELOPMENT" as const,
    price: 2499,
    currency: "INR",
    tags: JSON.stringify([
      "HRMS",
      "HR",
      "Payroll",
      "Attendance",
      "Next.js",
      "MongoDB",
      "SME",
    ]),
    features: JSON.stringify([
      "HR & Employee dual portals",
      "Excel attendance bulk import",
      "Leave approval workflow",
      "Automated monthly payroll",
      "Digital salary slips (PDF)",
      "Notice board & holidays",
      "JWT authentication",
      "Role-based access control",
    ]),
    thumbnailUrl: "/projects/hrms-login.png",
    images: JSON.stringify([
      "/projects/hrms-login.png",
      "/projects/hrms-dashboard.png",
      "/projects/hrms-employees.png",
      "/projects/hrms-attendance.png",
      "/projects/hrms-leaves.png",
      "/projects/hrms-payroll.png",
      "/projects/hrms-holidays.png",
      "/projects/hrms-profile.png",
    ]),
    demoUrl: "https://hrms.albostech.com",
    featured: true,
  },
  {
    title: "Garage Management System (GMS)",
    shortDescription:
      "Android workshop app with job cards, inventory, GST invoicing, payroll exports, and admin console.",
    description: `Garage Management System (GMS) by Albos Technologies Pvt. Ltd. — a comprehensive mobile-first solution for automobile garages, workshops, and service centres.

**What you get**
- Android APK (v1.0) for shop-floor operations
- Web admin console for franchises, garages, users, and platform approvals
- Secure REST API backend with cloud sync and offline resilience

**Core modules**
- **Services:** repair orders (job cards), counter sales, GST invoices, payment tracking
- **Parts & inventory:** catalogue, purchase orders, stock-in, reorder alerts
- **Accounts:** payment history, accounts payable, daily/monthly/GST reports, Tally export
- **Customers:** profiles, vehicles, order & invoice history, service reminders
- **Bookings:** built-in appointment calendar with slot management
- **More:** garage users, feedback, WhatsApp automation hooks, franchise plans (Basic / Franchise / Premium)

**Role-based access**
- CEO / Owner: full module access, reports, staff, settings
- Member (Technician): assigned orders, checklists, inventory view
- Customer & Vendor portals for status and purchase orders

**Highlights**
- Real-time job card workflow (Received → In Progress → Ready → Delivered)
- GST-compliant invoicing with partial payments
- Multi-garage franchise support with inventory transfer options
- Tally ERP export for accounting reconciliation

CEO: Chandra Prakash Singh | Pune, Maharashtra, India`,
    category: "DEVELOPMENT" as const,
    price: 3499,
    currency: "INR",
    tags: JSON.stringify([
      "Garage",
      "GMS",
      "Android",
      "Inventory",
      "Invoicing",
      "GST",
      "Workshop",
    ]),
    features: JSON.stringify([
      "Repair orders & job cards",
      "Parts inventory & purchase orders",
      "GST invoicing & payments",
      "Customer & vehicle management",
      "Built-in booking calendar",
      "Tally export",
      "Franchise admin console",
      "Multi-role access (CEO, Member, Vendor)",
    ]),
    thumbnailUrl: "/projects/garage-admin-login.png",
    images: JSON.stringify([
      "/projects/garage-admin-login.png",
      "/projects/garage-admin-franchises.png",
      "/projects/garage-dashboard.png",
      "/projects/garage-mobile-home.png",
    ]),
    demoUrl: null,
    featured: true,
  },
];

async function main() {
  console.log("🌱 Seeding Albostech Market projects...");

  const author = await prisma.user.findUnique({
    where: { email: ALBOSTECH_AUTHOR_EMAIL },
    include: { profile: true },
  });

  if (!author) {
    console.error(
      `❌ Author not found (${ALBOSTECH_AUTHOR_EMAIL}). Run npm run db:seed first.`
    );
    process.exit(1);
  }

  const buyers = await prisma.user.findMany({
    where: { role: "BUYER", status: "ACTIVE" },
  });

  await prisma.projectReview.deleteMany();
  await prisma.$executeRawUnsafe(
    "UPDATE `Transaction` SET projectId = NULL WHERE projectId IS NOT NULL"
  );
  await prisma.project.deleteMany();
  console.log("🧹 Cleared existing projects");

  const projects = [];
  for (const template of ALBOSTECH_PROJECTS) {
    const project = await prisma.project.create({
      data: {
        authorId: author.id,
        title: template.title,
        description: template.description,
        shortDescription: template.shortDescription,
        category: template.category,
        status: "PUBLISHED",
        price: template.price,
        currency: template.currency,
        thumbnailUrl: template.thumbnailUrl,
        images: template.images,
        tags: template.tags,
        features: template.features,
        demoUrl: template.demoUrl,
        featured: template.featured,
        totalSales: template.title.includes("HRMS") ? 12 : 8,
        totalViews: template.title.includes("HRMS") ? 340 : 210,
        averageRating: 4.8,
        reviewCount: 5,
        createdAt: new Date(Date.now() - 14 * 86400000),
      },
    });
    projects.push(project);
  }

  console.log(`✅ Created ${projects.length} Albostech projects`);

  const COMMISSION_RATE = 0.1;
  let purchaseCount = 0;
  for (const project of projects) {
    const shuffledBuyers = [...buyers].sort(() => Math.random() - 0.5).slice(0, 2);
    for (const buyer of shuffledBuyers) {
      const amount = project.price;
      const commissionAmount = parseFloat(
        (amount * COMMISSION_RATE).toFixed(2)
      );
      const netAmount = parseFloat((amount - commissionAmount).toFixed(2));
      await prisma.transaction.create({
        data: {
          buyerId: buyer.id,
          sellerId: author.id,
          amount,
          commissionAmount,
          netAmount,
          status: "COMPLETED",
          stripePaymentIntentId: `pi_albos_${purchaseCount}`,
          description: `Purchase: ${project.title}`,
          projectId: project.id,
          createdAt: new Date(Date.now() - 7 * 86400000),
        },
      });
      purchaseCount++;
    }
  }

  const reviewComments = [
    "Enterprise-grade HRMS — attendance import and payroll saved our team weeks of manual work.",
    "Clean Next.js codebase with clear module separation. Documentation matches the delivered product.",
    "GMS covers our full workshop flow from job card to GST invoice. Tally export is a huge plus.",
    "Albos Technology delivered exactly what was described. Verified seller — highly recommended.",
  ];

  let reviewCount = 0;
  for (const project of projects) {
    const txs = await prisma.transaction.findMany({
      where: { projectId: project.id, status: "COMPLETED" },
      take: 2,
    });
    for (const tx of txs) {
      await prisma.projectReview.create({
        data: {
          projectId: project.id,
          userId: tx.buyerId,
          rating: 5,
          comment: reviewComments[reviewCount % reviewComments.length],
          createdAt: new Date(Date.now() - 5 * 86400000),
        },
      });
      reviewCount++;
    }
  }

  console.log(`✅ ${purchaseCount} purchases, ${reviewCount} reviews`);
  console.log("✅ Albostech project seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
