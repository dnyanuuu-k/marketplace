const url = process.env.DATABASE_URL?.trim();

if (!url) {
  console.error(
    "\n[build] DATABASE_URL is not set.\n" +
      "Add it in Vercel → Project → Settings → Environment Variables\n" +
      "(Production + Preview). Use Railway's *public* MySQL URL, e.g.:\n" +
      "  mysql://USER:PASSWORD@HOST.proxy.rlwy.net:PORT/railway?connection_limit=1\n"
  );
  process.exit(1);
}

if (url.startsWith("file:")) {
  console.error(
    "\n[build] DATABASE_URL uses SQLite (file:...) but prisma/schema.prisma expects MySQL.\n" +
      "Set DATABASE_URL to your Railway *public* MySQL URL on Vercel (not mysql.railway.internal).\n"
  );
  process.exit(1);
}

if (!url.startsWith("mysql://")) {
  console.error(
    "\n[build] DATABASE_URL must start with mysql:// for this project.\n" +
      `Current value starts with: ${url.slice(0, 12)}...\n`
  );
  process.exit(1);
}

if (url.includes("railway.internal")) {
  console.error(
    "\n[build] DATABASE_URL uses mysql.railway.internal — that host only works inside Railway.\n" +
      "In Railway → MySQL → Connect, copy MYSQL_PUBLIC_URL (TCP proxy) and use that on Vercel.\n"
  );
  process.exit(1);
}

console.log("[build] DATABASE_URL looks valid for MySQL (host hidden).");
