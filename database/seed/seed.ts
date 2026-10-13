/**
 * Database seed script
 * Creates demo data for the Second-Hand Student Marketplace.
 *
 * Usage: npx tsx database/seed/seed.ts
 *
 * Demo accounts created:
 *   student@example.com  / student123
 *   admin@example.com    / admin123
 *   + 20 additional student accounts
 *
 * WARNING: This script CLEARS existing data before seeding.
 * Use only in development/demo environments.
 */

import { Pool } from "pg";
import { hashSync } from "bcryptjs";
import { join } from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: join(process.cwd(), ".env.local") });
dotenv.config({ path: join(process.cwd(), ".env") });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL not set.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

// ---------------------------------------------------------------------------
// Seed categories
// ---------------------------------------------------------------------------
const CATEGORIES = [
  { name: "Books",             slug: "books",            icon: "BookOpen",     parent: null },
  { name: "Calculators",       slug: "calculators",      icon: "Calculator",   parent: null },
  { name: "Electronics",       slug: "electronics",      icon: "Cpu",          parent: null },
  { name: "Laptops",           slug: "laptops",          icon: "Laptop",       parent: "Electronics" },
  { name: "Mobile Phones",     slug: "mobile-phones",    icon: "Smartphone",   parent: "Electronics" },
  { name: "Lab Equipment",     slug: "lab-equipment",    icon: "FlaskConical", parent: null },
  { name: "Hostel Items",      slug: "hostel-items",     icon: "Home",         parent: null },
  { name: "Furniture",         slug: "furniture",        icon: "Armchair",     parent: "Hostel Items" },
  { name: "Cycles",            slug: "cycles",           icon: "Bike",         parent: null },
  { name: "Clothing",          slug: "clothing",         icon: "Shirt",        parent: null },
  { name: "Academic Supplies", slug: "academic-supplies",icon: "GraduationCap",parent: null },
  { name: "Other",             slug: "other",            icon: "Package",      parent: null },
];

// ---------------------------------------------------------------------------
// Seed users
// ---------------------------------------------------------------------------
const STUDENT_USERS = [
  { name: "Arjun Sharma",    email: "student@example.com",  college: "IIT Bombay",         dept: "Computer Science",     year: 3 },
  { name: "Priya Patel",     email: "priya@example.com",    college: "IIT Delhi",           dept: "Electronics",          year: 2 },
  { name: "Rahul Verma",     email: "rahul@example.com",    college: "NIT Trichy",          dept: "Mechanical Engineering",year: 4 },
  { name: "Sneha Nair",      email: "sneha@example.com",    college: "BITS Pilani",         dept: "Computer Science",     year: 1 },
  { name: "Karan Mehta",     email: "karan@example.com",    college: "VIT Vellore",         dept: "Information Technology",year: 3 },
  { name: "Ananya Singh",    email: "ananya@example.com",   college: "Manipal Institute",   dept: "Electrical Engineering",year: 2 },
  { name: "Vikram Reddy",    email: "vikram@example.com",   college: "SRM Chennai",         dept: "Civil Engineering",    year: 4 },
  { name: "Neha Gupta",      email: "neha@example.com",     college: "Anna University",     dept: "Chemical Engineering", year: 3 },
  { name: "Aditya Kumar",    email: "aditya@example.com",   college: "IIT Bombay",          dept: "Mechanical Engineering",year: 2 },
  { name: "Divya Iyer",      email: "divya@example.com",    college: "NIT Trichy",          dept: "Computer Science",     year: 3 },
  { name: "Rohan Joshi",     email: "rohan@example.com",    college: "BITS Pilani",         dept: "Electronics",          year: 4 },
  { name: "Meera Krishnan",  email: "meera@example.com",    college: "VIT Vellore",         dept: "Biotechnology",        year: 1 },
  { name: "Akash Tiwari",    email: "akash@example.com",    college: "IIT Delhi",           dept: "Computer Science",     year: 2 },
  { name: "Pooja Sharma",    email: "pooja@example.com",    college: "SRM Chennai",         dept: "Information Technology",year: 3 },
  { name: "Siddharth Rao",   email: "sid@example.com",      college: "Anna University",     dept: "Electronics",          year: 4 },
  { name: "Tanvi Desai",     email: "tanvi@example.com",    college: "Manipal Institute",   dept: "Computer Science",     year: 2 },
  { name: "Gaurav Mishra",   email: "gaurav@example.com",   college: "NIT Trichy",          dept: "Mechanical Engineering",year: 3 },
  { name: "Riya Kapoor",     email: "riya@example.com",     college: "IIT Bombay",          dept: "Chemical Engineering", year: 1 },
  { name: "Amit Pandey",     email: "amit@example.com",     college: "BITS Pilani",         dept: "Civil Engineering",    year: 4 },
  { name: "Kavya Nair",      email: "kavya@example.com",    college: "VIT Vellore",         dept: "Computer Science",     year: 2 },
  { name: "Harsh Agarwal",   email: "harsh@example.com",    college: "IIT Delhi",           dept: "Electronics",          year: 3 },
];

// ---------------------------------------------------------------------------
// Seed listings (40+)
// ---------------------------------------------------------------------------
interface ListingData {
  seller_email: string;
  category_slug: string;
  title: string;
  description: string;
  price: number;
  condition: "New" | "Like New" | "Good" | "Fair" | "Poor";
  location: string;
  status: "Available" | "Sold" | "Reserved";
}

const LISTINGS: ListingData[] = [
  // Books
  {
    seller_email: "arjun@example.com", category_slug: "books",
    title: "Data Structures and Algorithms by Cormen (CLRS)",
    description: "Introduction to Algorithms by Thomas Cormen, 3rd edition. Minimal highlighting in first 3 chapters. Perfect for CS students preparing for placements. Essential reference book.",
    price: 450, condition: "Good", location: "Hostel Block A", status: "Available"
  },
  {
    seller_email: "priya@example.com", category_slug: "books",
    title: "Engineering Mathematics by B.S. Grewal",
    description: "43rd edition. Covers all engineering maths topics — calculus, differential equations, matrices, statistics. A few solved problems marked with pencil, easily erasable.",
    price: 300, condition: "Good", location: "Library", status: "Available"
  },
  {
    seller_email: "rahul@example.com", category_slug: "books",
    title: "Mechanics of Materials by Beer Johnston",
    description: "6th edition. Used for one semester only. Excellent condition with no writing inside. Great for mechanical and civil engineering students.",
    price: 600, condition: "Like New", location: "Engineering Block", status: "Available"
  },
  {
    seller_email: "sneha@example.com", category_slug: "books",
    title: "Operating Systems by Silberschatz (Dinosaur Book)",
    description: "9th edition, OS concepts book. Minor wear on cover, all pages intact. Good for exam preparation. Covers processes, memory management, file systems.",
    price: 350, condition: "Fair", location: "Main Campus", status: "Available"
  },
  {
    seller_email: "karan@example.com", category_slug: "books",
    title: "Computer Networks by Tanenbaum — 5th Edition",
    description: "Complete CN textbook, 5th edition. Well-maintained, no annotations. Covers OSI model, TCP/IP, network security thoroughly.",
    price: 400, condition: "Good", location: "Hostel Block B", status: "Sold"
  },
  {
    seller_email: "ananya@example.com", category_slug: "books",
    title: "Signals and Systems by Oppenheim — 2nd Edition",
    description: "Classic signals and systems textbook. Used for one year only. Cover slightly worn but all content intact. Ideal for EE and ECE students.",
    price: 280, condition: "Fair", location: "Science Block", status: "Available"
  },
  {
    seller_email: "vikram@example.com", category_slug: "books",
    title: "Database System Concepts by Silberschatz (DBMS)",
    description: "6th edition. The standard DBMS textbook. Comprehensive coverage of SQL, normalization, transactions, recovery. Lightly used.",
    price: 500, condition: "Like New", location: "Main Campus", status: "Available"
  },
  {
    seller_email: "neha@example.com", category_slug: "books",
    title: "Chemical Engineering Thermodynamics — Smith, Van Ness",
    description: "7th edition. Barely used, gifted from a senior. Covers all thermodynamics topics needed for chemical engineering students.",
    price: 550, condition: "Like New", location: "Engineering Block", status: "Available"
  },

  // Calculators
  {
    seller_email: "rohan@example.com", category_slug: "calculators",
    title: "Casio FX-991ES Plus Scientific Calculator",
    description: "Casio FX-991ES Plus, the most popular scientific calculator for engineering exams. Supports 417 functions including integration, differentiation, matrices, equation solving. Batteries good, no scratches. Perfect for GATE, university exams.",
    price: 650, condition: "Good", location: "Hostel Block A", status: "Available"
  },
  {
    seller_email: "divya@example.com", category_slug: "calculators",
    title: "Casio FX-82MS Scientific Calculator",
    description: "Basic scientific calculator suitable for first year students. Works perfectly. Minor scratches on back. Comes with original cover and manual.",
    price: 250, condition: "Good", location: "Library", status: "Available"
  },
  {
    seller_email: "akash@example.com", category_slug: "calculators",
    title: "Texas Instruments TI-84 Plus Graphing Calculator",
    description: "TI-84 Plus graphing calculator. Excellent for mathematics and statistics. Comes with USB cable and manual. Barely used, bought for one course.",
    price: 2800, condition: "Like New", location: "Main Campus", status: "Available"
  },
  {
    seller_email: "pooja@example.com", category_slug: "calculators",
    title: "Casio FX-991EX ClassWiz Calculator",
    description: "Latest Casio ClassWiz model with spreadsheet functionality and QR code display. 552 functions. Better than FX-991ES. Selling because graduating.",
    price: 900, condition: "Like New", location: "Engineering Block", status: "Available"
  },

  // Laptops
  {
    seller_email: "sid@example.com", category_slug: "laptops",
    title: "Dell Inspiron 15 3000 — i5 10th Gen, 8GB RAM",
    description: "Dell Inspiron 15.6 inch. Core i5-1035G1, 8GB DDR4 RAM, 512GB SSD. Windows 11 Home. Good for coding, assignments, daily use. Minor scuffs on lid but screen is perfect. Battery backup ~4 hours. Selling due to upgrade.",
    price: 28000, condition: "Good", location: "Hostel Block B", status: "Available"
  },
  {
    seller_email: "tanvi@example.com", category_slug: "laptops",
    title: "Lenovo IdeaPad Slim 3 — Ryzen 5, 8GB, 512GB SSD",
    description: "Lenovo IdeaPad Slim 3, Ryzen 5 5500U, 8GB RAM, 512GB SSD. Perfect for programming, web development. Running Ubuntu 22.04. Charger included. 2 years old, works flawlessly.",
    price: 32000, condition: "Good", location: "Main Campus", status: "Available"
  },
  {
    seller_email: "gaurav@example.com", category_slug: "laptops",
    title: "HP Pavilion 15 — i7 11th Gen, 16GB RAM, 512GB SSD",
    description: "HP Pavilion 15-eg0xxx. Core i7-1165G7, 16GB DDR4, 512GB NVMe SSD, Intel Iris Xe Graphics. Great for machine learning, data science, heavy coding. Original box and charger included.",
    price: 45000, condition: "Like New", location: "Science Block", status: "Reserved"
  },
  {
    seller_email: "riya@example.com", category_slug: "laptops",
    title: "MacBook Air M1 — 8GB, 256GB",
    description: "MacBook Air 2020, Apple M1 chip, 8GB unified memory, 256GB SSD. Perfect battery life (10+ hours). No scratches, original charger. Used for 1.5 years. Selling because bought M2.",
    price: 62000, condition: "Good", location: "Hostel Block A", status: "Available"
  },
  {
    seller_email: "amit@example.com", category_slug: "laptops",
    title: "Asus VivoBook 15 — i3 11th Gen, 8GB, 256GB",
    description: "Asus VivoBook 15 F512 series. Core i3-1115G4, 8GB RAM, 256GB SSD. Good for everyday tasks, documents, presentations. Light and portable. Minor scratches on palm rest.",
    price: 20000, condition: "Fair", location: "Near Canteen", status: "Available"
  },

  // Mobile Phones
  {
    seller_email: "kavya@example.com", category_slug: "mobile-phones",
    title: "Redmi Note 11 Pro — 6GB/128GB, Stealth Black",
    description: "Redmi Note 11 Pro, 6GB RAM, 128GB storage, 108MP camera. AMOLED display. Good battery life. Minor scratch on back panel, screen is perfect. Comes with original charger box.",
    price: 12000, condition: "Good", location: "Hostel Block B", status: "Available"
  },
  {
    seller_email: "harsh@example.com", category_slug: "mobile-phones",
    title: "Samsung Galaxy M32 — 6GB/128GB",
    description: "Samsung Galaxy M32, 6000mAh battery, Super AMOLED display. No scratches, screen protector applied from day 1. Full kit: original box, charger, earphones.",
    price: 9500, condition: "Like New", location: "Main Campus", status: "Available"
  },
  {
    seller_email: "arjun@example.com", category_slug: "mobile-phones",
    title: "OnePlus Nord CE 2 Lite — 6GB/128GB",
    description: "OnePlus Nord CE 2 Lite, 64MP camera, 33W fast charging. Used for 1 year. Screen in perfect condition, back has hairline scratch. Selling because switching to iPhone.",
    price: 14500, condition: "Good", location: "Engineering Block", status: "Sold"
  },

  // Lab Equipment
  {
    seller_email: "priya@example.com", category_slug: "lab-equipment",
    title: "Digital Multimeter — Mastech MS8268",
    description: "Professional digital multimeter with auto-range. Measures voltage, current, resistance, capacitance, frequency. Perfect for electronics lab. Comes with probes and manual.",
    price: 800, condition: "Good", location: "Engineering Block", status: "Available"
  },
  {
    seller_email: "rahul@example.com", category_slug: "lab-equipment",
    title: "Breadboard + Jumper Wires + Component Kit",
    description: "Full breadboard kit for electronics experiments. Includes: 1x full-size breadboard, 100x jumper wires, resistors (20 values), capacitors, LEDs, transistors (BC547, BC557), 555 timer ICs. Perfect for first year ECE/EEE students.",
    price: 600, condition: "Good", location: "Science Block", status: "Available"
  },
  {
    seller_email: "ananya@example.com", category_slug: "lab-equipment",
    title: "Oscilloscope — Hantek DSO5102P (100MHz)",
    description: "Hantek DSO5102P 100MHz digital storage oscilloscope. Excellent for electronics and embedded systems lab. Good condition, all probes included. Selling because lab has new equipment.",
    price: 7500, condition: "Good", location: "Engineering Block", status: "Available"
  },
  {
    seller_email: "vikram@example.com", category_slug: "lab-equipment",
    title: "Arduino Uno + Starter Kit (Sensors, Motors)",
    description: "Arduino Uno R3 genuine board with starter kit: breadboard, jumper wires, LCD display, temperature sensor, ultrasonic sensor, servo motor, DC motor, relay module. Great for IoT and robotics projects.",
    price: 1200, condition: "Like New", location: "Main Campus", status: "Available"
  },

  // Hostel Items
  {
    seller_email: "neha@example.com", category_slug: "hostel-items",
    title: "Electric Kettle — Prestige 1.5L",
    description: "Prestige 1.5 litre electric kettle. Works perfectly. Minor stain inside (normal for kettles). Good for making tea, coffee, noodles in hostel. Selling because going home for semester.",
    price: 400, condition: "Good", location: "Hostel Block A", status: "Available"
  },
  {
    seller_email: "rohan@example.com", category_slug: "hostel-items",
    title: "Table Fan — Bajaj Ultima 400mm",
    description: "Bajaj Ultima table fan, 400mm. 3 speed settings. All original parts intact. Works perfectly. Very useful for hostel rooms. Selling because got AC room allotted.",
    price: 700, condition: "Good", location: "Hostel Block B", status: "Available"
  },
  {
    seller_email: "divya@example.com", category_slug: "hostel-items",
    title: "Study Table with Bookshelf (Wooden)",
    description: "Compact wooden study table with attached bookshelf. Fits well in hostel rooms. 2 drawers, 3 shelf slots. Minor scratch on surface. Height 75cm, Width 90cm, Depth 45cm. You arrange pickup.",
    price: 1800, condition: "Fair", location: "Hostel Block A", status: "Available"
  },
  {
    seller_email: "akash@example.com", category_slug: "hostel-items",
    title: "Clothes Drying Stand — Steel Foldable",
    description: "Steel foldable clothes drying stand. 2 tier. Compact, easy to store when not in use. Used for 2 years, all joints strong. Selling because shifting to different hostel.",
    price: 250, condition: "Fair", location: "Hostel Block B", status: "Available"
  },
  {
    seller_email: "pooja@example.com", category_slug: "hostel-items",
    title: "Mattress — 3 inch Memory Foam Single Bed",
    description: "Memory foam mattress, 3 inch, single bed size (72x30 inches). Waterproof cover. Used for 1 year. Freshly cleaned. Great for hostel beds which have thin mattresses.",
    price: 1500, condition: "Good", location: "Hostel Block A", status: "Available"
  },

  // Furniture
  {
    seller_email: "sid@example.com", category_slug: "furniture",
    title: "Plastic Monobloc Chair — Set of 2",
    description: "2 white plastic chairs in good condition. Sturdy, no broken legs. Good for hostel study room or balcony. Pickup only from Hostel Block B.",
    price: 300, condition: "Good", location: "Hostel Block B", status: "Available"
  },
  {
    seller_email: "tanvi@example.com", category_slug: "furniture",
    title: "Folding Study Table (Laptop Table)",
    description: "Adjustable height laptop/study table for use while sitting on bed or floor. Foldable, portable, lightweight. Very convenient for hostel students. Good condition.",
    price: 450, condition: "Good", location: "Main Campus", status: "Sold"
  },

  // Cycles
  {
    seller_email: "gaurav@example.com", category_slug: "cycles",
    title: "Hero Sprint Pro 26T — Mountain Bike",
    description: "Hero Sprint Pro 26 inch mountain bike. 21 speed Shimano gears. Front suspension fork. Air filled tyres recently replaced. Chain oiled. Good brakes. 4 years old but very well maintained. Used only on campus.",
    price: 3500, condition: "Good", location: "Sports Complex", status: "Available"
  },
  {
    seller_email: "riya@example.com", category_slug: "cycles",
    title: "Atlas Cycle — Single Speed, 26 inch",
    description: "Basic Atlas single-speed cycle. Perfect for getting around campus. Tyres inflated, brakes work fine. Some rust on chain (can be oiled). Selling because switching to electric scooter.",
    price: 1200, condition: "Fair", location: "Sports Complex", status: "Available"
  },
  {
    seller_email: "amit@example.com", category_slug: "cycles",
    title: "Firefox Bikes Road Runner 700C — Lightweight",
    description: "Firefox Bikes Road Runner, 700C wheels, 7-speed Shimano gears, lightweight frame. Great for longer campus distances. Less than 2 years old. Minor scuffs, mechanically sound.",
    price: 5500, condition: "Good", location: "Main Campus", status: "Available"
  },

  // Electronics
  {
    seller_email: "kavya@example.com", category_slug: "electronics",
    title: "Sony WH-1000XM3 Wireless Headphones",
    description: "Sony WH-1000XM3 noise cancelling wireless headphones. Industry-leading ANC. 30 hour battery. All original accessories in box. Used carefully. Perfect for studying in noisy hostel environment.",
    price: 9000, condition: "Good", location: "Hostel Block A", status: "Available"
  },
  {
    seller_email: "harsh@example.com", category_slug: "electronics",
    title: "JBL Clip 3 Portable Bluetooth Speaker",
    description: "JBL Clip 3 portable speaker. Waterproof (IPX7). Very loud for its size. 10 hour battery. Clip for attaching to bags. 1.5 years old, works perfectly.",
    price: 1800, condition: "Good", location: "Engineering Block", status: "Available"
  },
  {
    seller_email: "arjun@example.com", category_slug: "electronics",
    title: "Mechanical Keyboard — Zebronics MAX PRO (Brown Switches)",
    description: "Zebronics MAX PRO gaming mechanical keyboard. Brown tactile switches (great for typing and coding). Full size, RGB backlight. USB wired. Used for 1 year. All keys working.",
    price: 2200, condition: "Good", location: "Hostel Block A", status: "Available"
  },
  {
    seller_email: "priya@example.com", category_slug: "electronics",
    title: "Logitech M235 Wireless Mouse",
    description: "Logitech M235 wireless mouse. 2.4GHz, USB receiver. Batteries good. Smooth tracking. 1.5 year old. Good for laptop users who dislike trackpad.",
    price: 500, condition: "Good", location: "Library", status: "Available"
  },

  // Academic Supplies
  {
    seller_email: "rahul@example.com", category_slug: "academic-supplies",
    title: "Drawing Instruments Set — Staedtler",
    description: "Staedtler drawing instruments set. Includes compasses, divider, set squares, protractor, ruler, mini drafter. Essential for first year engineering drawing. Complete set, no missing pieces.",
    price: 400, condition: "Good", location: "Engineering Block", status: "Available"
  },
  {
    seller_email: "sneha@example.com", category_slug: "academic-supplies",
    title: "Graph Papers Bundle + Drawing Sheets A1 (50 sheets)",
    description: "Bundle of 50 A1 size drawing sheets + 100 graph papers. All unused. Bought extra at semester start. Useful for Engineering Drawing, Fluid Mechanics, Math practicals.",
    price: 150, condition: "New", location: "Main Campus", status: "Available"
  },
  {
    seller_email: "karan@example.com", category_slug: "academic-supplies",
    title: "Scientific Drawing Pens Set — Faber-Castell",
    description: "Faber-Castell technical drawing pens. 0.1mm, 0.3mm, 0.5mm, 0.7mm, 1.0mm nib sizes. 3 pens almost full ink. Great for engineering drawing, circuit diagrams.",
    price: 350, condition: "Good", location: "Near Canteen", status: "Available"
  },

  // Other
  {
    seller_email: "ananya@example.com", category_slug: "other",
    title: "Mini Fridge — 20L, Suitable for Hostel",
    description: "20 litre mini refrigerator, single door. Perfect for hostel rooms to keep milk, fruits, medicines. Works perfectly. Recently serviced. Dimensions: 45x35x45 cm. Buyer must arrange transport.",
    price: 2500, condition: "Good", location: "Hostel Block B", status: "Available"
  },
  {
    seller_email: "vikram@example.com", category_slug: "other",
    title: "Iron Box — Philips Dry Iron 1000W",
    description: "Philips dry iron, 1000W. Works perfectly. Moves smoothly on all fabric. Good for quick hostel ironing. Selling because shifting off-campus.",
    price: 350, condition: "Good", location: "Hostel Block A", status: "Available"
  },
  {
    seller_email: "neha@example.com", category_slug: "other",
    title: "Badminton Racket Pair + Shuttlecocks",
    description: "2 Yonex carbonex badminton rackets with covers. 1 tube of Yonex Mavis 350 nylon shuttlecocks (6 pieces). Good for casual sports complex games. Rackets in good condition.",
    price: 800, condition: "Good", location: "Sports Complex", status: "Available"
  },
];

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------
async function seed() {
  console.log("🌱  Starting database seed...\n");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // ---- 1. Clean existing data (in FK-safe order) ----
    console.log("  Clearing existing data...");
    await client.query(`
      TRUNCATE TABLE notifications, listing_status_history, reports,
                     transactions, offers, wishlist_items, wishlists,
                     listing_images, listings, users, categories
      RESTART IDENTITY CASCADE
    `);

    // ---- 2. Categories ----
    console.log("  Seeding categories...");
    const categoryIds: Record<string, number> = {};

    // First pass: top-level categories
    for (const cat of CATEGORIES.filter(c => !c.parent)) {
      const { rows } = await client.query(
        `INSERT INTO categories (name, slug, icon)
         VALUES ($1, $2, $3)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [cat.name, cat.slug, cat.icon]
      );
      categoryIds[cat.slug] = rows[0].id;
    }

    // Second pass: subcategories
    for (const cat of CATEGORIES.filter(c => c.parent)) {
      const parentSlug = CATEGORIES.find(c => c.name === cat.parent)?.slug;
      const parentId = parentSlug ? categoryIds[parentSlug] : null;
      const { rows } = await client.query(
        `INSERT INTO categories (name, slug, icon, parent_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [cat.name, cat.slug, cat.icon, parentId]
      );
      categoryIds[cat.slug] = rows[0].id;
    }
    console.log(`    ✓ ${CATEGORIES.length} categories`);

    // ---- 3. Roles (already seeded by migration, but ensure they exist) ----
    const { rows: roles } = await client.query(`SELECT id, name FROM roles`);
    const roleIds: Record<string, number> = {};
    for (const r of roles) roleIds[r.name] = r.id;

    // ---- 4. Admin users ----
    console.log("  Seeding admin users...");
    const adminHash = hashSync("admin123", 10);
    await client.query(
      `INSERT INTO users (role_id, name, email, password_hash, college, department, year, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [roleIds.admin, "Admin User", "admin@example.com", adminHash, "StudentMart", "Administration", null, "active"]
    );
    await client.query(
      `INSERT INTO users (role_id, name, email, password_hash, college, department, year, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [roleIds.admin, "Suresh Admin", "admin2@example.com", adminHash, "StudentMart", "Moderation", null, "active"]
    );
    console.log(`    ✓ 2 admin accounts (admin@example.com / admin123)`);

    // ---- 5. Student users ----
    console.log("  Seeding student users...");
    const studentHash = hashSync("student123", 10);
    const userIds: Record<string, string> = {};

    for (const u of STUDENT_USERS) {
      const { rows } = await client.query(
        `INSERT INTO users (role_id, name, email, password_hash, college, department, year, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [roleIds.student, u.name, u.email, studentHash, u.college, u.dept, u.year, "active"]
      );
      userIds[u.email] = rows[0].id;
    }
    // Add one suspended user for demo
    await client.query(
      `INSERT INTO users (role_id, name, email, password_hash, college, department, year, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [roleIds.student, "Suspended Student", "suspended@example.com", studentHash,
       "Example College", "CS", 2, "suspended"]
    );
    console.log(`    ✓ ${STUDENT_USERS.length + 1} student accounts (student@example.com / student123)`);

    // ---- 6. Listings ----
    console.log("  Seeding listings...");
    const listingIds: Record<number, string> = {};

    for (let i = 0; i < LISTINGS.length; i++) {
      const l = LISTINGS[i];
      const sellerId = userIds[l.seller_email];
      const catId = categoryIds[l.category_slug];

      if (!sellerId || !catId) {
        console.warn(`    ⚠ Skipping listing "${l.title}" — seller or category not found`);
        continue;
      }

      // Random created_at within last 60 days for realistic data
      const daysAgo = Math.floor(Math.random() * 60);
      const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      const { rows } = await client.query(
        `INSERT INTO listings (seller_id, category_id, title, description, price, condition, location, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [sellerId, catId, l.title, l.description, l.price, l.condition, l.location, l.status, createdAt]
      );
      listingIds[i] = rows[0].id;
    }
    console.log(`    ✓ ${LISTINGS.length} listings`);

    // ---- 7. Listing images (placeholder URLs) ----
    console.log("  Seeding listing images...");
    // Using Unsplash source images for realistic display
    const imageMap: Record<string, string[]> = {
      "books":            ["/uploads/placeholder-book.jpg"],
      "calculators":      ["/uploads/placeholder-calculator.jpg"],
      "laptops":          ["/uploads/placeholder-laptop.jpg"],
      "mobile-phones":    ["/uploads/placeholder-phone.jpg"],
      "lab-equipment":    ["/uploads/placeholder-lab.jpg"],
      "hostel-items":     ["/uploads/placeholder-hostel.jpg"],
      "furniture":        ["/uploads/placeholder-furniture.jpg"],
      "cycles":           ["/uploads/placeholder-cycle.jpg"],
      "electronics":      ["/uploads/placeholder-electronics.jpg"],
      "academic-supplies":["/uploads/placeholder-supplies.jpg"],
      "other":            ["/uploads/placeholder-other.jpg"],
    };

    for (let i = 0; i < LISTINGS.length; i++) {
      const lid = listingIds[i];
      if (!lid) continue;
      const slug = LISTINGS[i].category_slug;
      const parentSlug = (["laptops","mobile-phones"].includes(slug)) ? "electronics" : slug;
      const imgs = imageMap[slug] ?? imageMap[parentSlug] ?? ["/uploads/placeholder-other.jpg"];

      for (let order = 0; order < imgs.length; order++) {
        await client.query(
          `INSERT INTO listing_images (listing_id, image_url, display_order) VALUES ($1, $2, $3)`,
          [lid, imgs[order], order]
        );
      }
    }
    console.log(`    ✓ Images assigned`);

    // ---- 8. Offers ----
    console.log("  Seeding offers...");

    // Offer on CLRS book
    const clrsId = listingIds[0];
    const casioId = listingIds[8];
    const dellId = listingIds[12];
    const heroId = listingIds[32];

    if (clrsId) {
      await client.query(
        `INSERT INTO offers (listing_id, buyer_id, amount, message, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [clrsId, userIds["sneha@example.com"], 400, "Can you do 400?", "Pending"]
      );
      await client.query(
        `INSERT INTO offers (listing_id, buyer_id, amount, message, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [clrsId, userIds["karan@example.com"], 420, "I can pay 420 and pick up today.", "Pending"]
      );
    }

    if (casioId) {
      await client.query(
        `INSERT INTO offers (listing_id, buyer_id, amount, message, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [casioId, userIds["student@example.com"], 600, "Can you do ₹600? Need it for exams next week.", "Pending"]
      );
      await client.query(
        `INSERT INTO offers (listing_id, buyer_id, amount, message, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [casioId, userIds["ananya@example.com"], 620, "Offering 620, can pick up immediately.", "Pending"]
      );
    }

    if (dellId) {
      await client.query(
        `INSERT INTO offers (listing_id, buyer_id, amount, message, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [dellId, userIds["rahul@example.com"], 25000, "Will you take 25000?", "Rejected"]
      );
      await client.query(
        `INSERT INTO offers (listing_id, buyer_id, amount, message, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [dellId, userIds["akash@example.com"], 27000, "27000 final, I can pick up tomorrow.", "Pending"]
      );
    }

    if (heroId) {
      await client.query(
        `INSERT INTO offers (listing_id, buyer_id, amount, message, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [heroId, userIds["divya@example.com"], 3200, "Can you take 3200?", "Pending"]
      );
    }
    console.log(`    ✓ Offers created`);

    // ---- 9. Completed transactions (for sold listings) ----
    console.log("  Seeding transactions...");

    // Listing index 4 = "Computer Networks by Tanenbaum" — Sold
    const cnBookId = listingIds[4];
    if (cnBookId) {
      // Create accepted offer
      const { rows: offerRow } = await client.query(
        `INSERT INTO offers (listing_id, buyer_id, amount, message, status)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [cnBookId, userIds["divya@example.com"], 400, "Paying full price", "Accepted"]
      );
      await client.query(
        `INSERT INTO transactions (listing_id, buyer_id, seller_id, offer_id, final_price, transaction_status, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [cnBookId, userIds["divya@example.com"], userIds["karan@example.com"],
         offerRow[0].id, 400, "Completed", new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)]
      );
    }

    // Listing index 20 = OnePlus Nord — Sold
    const oneplusId = listingIds[20];
    if (oneplusId) {
      const { rows: offerRow } = await client.query(
        `INSERT INTO offers (listing_id, buyer_id, amount, message, status)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [oneplusId, userIds["rohan@example.com"], 14500, "Full price, quick deal", "Accepted"]
      );
      await client.query(
        `INSERT INTO transactions (listing_id, buyer_id, seller_id, offer_id, final_price, transaction_status, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [oneplusId, userIds["rohan@example.com"], userIds["arjun@example.com"],
         offerRow[0].id, 14500, "Completed", new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)]
      );
    }

    // Listing index 30 = Folding Study Table — Sold
    const tableId = listingIds[30];
    if (tableId) {
      const { rows: offerRow } = await client.query(
        `INSERT INTO offers (listing_id, buyer_id, amount, message, status)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [tableId, userIds["pooja@example.com"], 450, "Need it urgently", "Accepted"]
      );
      await client.query(
        `INSERT INTO transactions (listing_id, buyer_id, seller_id, offer_id, final_price, transaction_status, completed_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [tableId, userIds["pooja@example.com"], userIds["tanvi@example.com"],
         offerRow[0].id, 450, "Completed", new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)]
      );
    }
    console.log(`    ✓ Transactions created`);

    // ---- 10. Wishlists ----
    console.log("  Seeding wishlist items...");
    // Wishlists were auto-created by T7 trigger. Add some items.
    const wishlistTargets = [
      { user: "student@example.com", listing_i: 8 },  // Casio FX-991ES
      { user: "student@example.com", listing_i: 12 },  // Dell Inspiron
      { user: "student@example.com", listing_i: 32 },  // Hero Sprint cycle
      { user: "priya@example.com",   listing_i: 13 },  // Lenovo IdeaPad
      { user: "rahul@example.com",   listing_i: 15 },  // MacBook Air
      { user: "sneha@example.com",   listing_i: 8 },   // Casio
      { user: "karan@example.com",   listing_i: 0 },   // CLRS book
    ];

    for (const w of wishlistTargets) {
      const listingId = listingIds[w.listing_i];
      if (!listingId || !userIds[w.user]) continue;
      const { rows: wl } = await client.query(
        `SELECT id FROM wishlists WHERE user_id = $1`,
        [userIds[w.user]]
      );
      if (wl.length > 0) {
        await client.query(
          `INSERT INTO wishlist_items (wishlist_id, listing_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [wl[0].id, listingId]
        );
      }
    }
    console.log(`    ✓ Wishlist items created`);

    // ---- 11. Reports ----
    console.log("  Seeding reports...");
    const spamListingId = listingIds[41]; // Badminton Racket listing
    if (spamListingId) {
      await client.query(
        `INSERT INTO reports (reporter_id, listing_id, reason, description, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [userIds["kavya@example.com"], spamListingId,
         "Misleading listing", "The racket described as Yonex doesn't look genuine.", "Pending"]
      );
    }

    const mobileId = listingIds[17]; // Samsung Galaxy
    if (mobileId) {
      await client.query(
        `INSERT INTO reports (reporter_id, listing_id, reason, description, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [userIds["arjun@example.com"], mobileId,
         "Fraud", "Seller is asking for advance payment outside the platform.", "Reviewing"]
      );
    }

    await client.query(
      `INSERT INTO reports (reporter_id, listing_id, reason, description, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [userIds["rahul@example.com"], listingIds[9] ?? listingIds[10],
       "Spam", "Same listing posted multiple times by different accounts.", "Resolved"]
    );
    console.log(`    ✓ Reports created`);

    await client.query("COMMIT");

    // Final count
    const { rows: counts } = await client.query(`
      SELECT
        (SELECT COUNT(*) FROM users)        AS users,
        (SELECT COUNT(*) FROM categories)   AS categories,
        (SELECT COUNT(*) FROM listings)     AS listings,
        (SELECT COUNT(*) FROM offers)       AS offers,
        (SELECT COUNT(*) FROM transactions) AS transactions,
        (SELECT COUNT(*) FROM reports)      AS reports
    `);
    const c = counts[0];
    console.log(`\n✅  Seed complete!`);
    console.log(`    Users: ${c.users}  |  Categories: ${c.categories}  |  Listings: ${c.listings}`);
    console.log(`    Offers: ${c.offers}  |  Transactions: ${c.transactions}  |  Reports: ${c.reports}`);
    console.log(`\n🔑  Demo accounts:`);
    console.log(`    student@example.com  /  student123`);
    console.log(`    admin@example.com    /  admin123`);

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\n❌  Seed failed:", (err as Error).message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
