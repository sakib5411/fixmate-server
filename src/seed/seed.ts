import { ObjectId } from "mongodb";
import { closeDatabase, connectToDatabase, getDb } from "../config/db.js";
import {
  bookingsCollection,
  ensureIndexes,
  paymentsCollection,
  servicesCollection,
  usersCollection,
} from "../db/collections.js";
import type {
  BookingDoc,
  BookingStatus,
  PaymentDoc,
  ServiceDoc,
  UserDoc,
  UserRole,
} from "../types/models.js";

const PASSWORD = "Fixmate1234";

interface SeedPerson {
  name: string;
  email: string;
  role: UserRole;
  phone: string;
  area: string;
  bio: string;
  image: string;
}

const PEOPLE: SeedPerson[] = [
  {
    name: "FixMate Admin",
    email: "admin@fixmate.dev",
    role: "admin",
    phone: "01700000001",
    area: "Gulshan, Dhaka",
    bio: "Platform administrator for FixMate.",
    image: "https://ui-avatars.com/api/?name=FixMate+Admin&background=0f172a&color=ffffff&size=200",
  },
  {
    name: "Rafiq Hasan",
    email: "rafiq@fixmate.dev",
    role: "technician",
    phone: "01711111111",
    area: "Mirpur, Dhaka",
    bio: "Certified smartphone and laptop repair specialist with 8 years of experience.",
    image: "https://ui-avatars.com/api/?name=Rafiq+Hasan&background=ea580c&color=ffffff&size=200",
  },
  {
    name: "Karim Uddin",
    email: "karim@fixmate.dev",
    role: "technician",
    phone: "01722222222",
    area: "Dhanmondi, Dhaka",
    bio: "Home appliance expert for AC, refrigerator and washing machine servicing.",
    image: "https://ui-avatars.com/api/?name=Karim+Uddin&background=0d9488&color=ffffff&size=200",
  },
  {
    name: "Sakib Hossen",
    email: "customer@fixmate.dev",
    role: "customer",
    phone: "01733333333",
    area: "Mirpur, Dhaka",
    bio: "Busy professional who relies on FixMate for home repairs.",
    image: "https://ui-avatars.com/api/?name=Sakib+Hossen&background=2563eb&color=ffffff&size=200",
  },
  {
    name: "Ayesha Rahman",
    email: "ayesha@fixmate.dev",
    role: "customer",
    phone: "01744444444",
    area: "Uttara, Dhaka",
    bio: "Homeowner and long-time FixMate customer.",
    image: "https://ui-avatars.com/api/?name=Ayesha+Rahman&background=db2777&color=ffffff&size=200",
  },
];

const IMG = {
  phone1: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=80",
  phone2: "https://images.unsplash.com/photo-1556656793-08538906a9f8?auto=format&fit=crop&w=800&q=80",
  laptop1: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?auto=format&fit=crop&w=800&q=80",
  laptop2: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80",
  ac: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=800&q=80",
  electrical: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80",
  fridge: "https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?auto=format&fit=crop&w=800&q=80",
  washer: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80",
  tv: "https://images.unsplash.com/photo-1593784991095-a205069470b6?auto=format&fit=crop&w=800&q=80",
  ac2: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80",
  tools: "https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?auto=format&fit=crop&w=800&q=80",
  tech1: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=800&q=80",
  tech2: "https://images.unsplash.com/photo-1581092335397-9583eb92d232?auto=format&fit=crop&w=800&q=80",
  tech3: "https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=800&q=80",
};

interface SeedService {
  title: string;
  category: ServiceDoc["category"];
  description: string;
  image: string;
  basePrice: number;
  estimatedDuration: string;
  serviceMode: ServiceDoc["serviceMode"];
  technicianEmail: string;
  approvalStatus: ServiceDoc["approvalStatus"];
}

const SERVICES: SeedService[] = [
  {
    title: "iPhone Screen Replacement",
    category: "Smartphone",
    description: "Original quality screen replacement with a 3 month warranty and free pickup.",
    image: IMG.phone1,
    basePrice: 89,
    estimatedDuration: "2-3 hours",
    serviceMode: "Home Visit",
    technicianEmail: "rafiq@fixmate.dev",
    approvalStatus: "approved",
  },
  {
    title: "Samsung Battery Replacement",
    category: "Smartphone",
    description: "Genuine battery replacement with health check and charging port cleaning.",
    image: IMG.phone2,
    basePrice: 45,
    estimatedDuration: "1-2 hours",
    serviceMode: "Shop Drop-off",
    technicianEmail: "rafiq@fixmate.dev",
    approvalStatus: "approved",
  },
  {
    title: "Laptop Keyboard Repair",
    category: "Laptop & PC",
    description: "Key replacement or full keyboard module swap for all major laptop brands.",
    image: IMG.laptop1,
    basePrice: 55,
    estimatedDuration: "3-4 hours",
    serviceMode: "Shop Drop-off",
    technicianEmail: "rafiq@fixmate.dev",
    approvalStatus: "approved",
  },
  {
    title: "MacBook Battery Service",
    category: "Laptop & PC",
    description: "Battery replacement with genuine cells, calibration and a 6 month warranty.",
    image: IMG.laptop2,
    basePrice: 120,
    estimatedDuration: "1 day",
    serviceMode: "Shop Drop-off",
    technicianEmail: "rafiq@fixmate.dev",
    approvalStatus: "approved",
  },
  {
    title: "Laptop Motherboard Diagnostics",
    category: "Laptop & PC",
    description: "Deep board-level diagnostics for laptops that do not power on or charge.",
    image: IMG.tech1,
    basePrice: 35,
    estimatedDuration: "1-2 days",
    serviceMode: "Shop Drop-off",
    technicianEmail: "rafiq@fixmate.dev",
    approvalStatus: "approved",
  },
  {
    title: "Water Damage Recovery",
    category: "Smartphone",
    description: "Ultrasonic cleaning and component-level recovery for water damaged phones.",
    image: IMG.tech2,
    basePrice: 70,
    estimatedDuration: "1 day",
    serviceMode: "Home Visit",
    technicianEmail: "rafiq@fixmate.dev",
    approvalStatus: "approved",
  },
  {
    title: "Gaming PC Cleaning & Thermal Paste",
    category: "Laptop & PC",
    description: "Full dust removal, fan servicing and premium thermal paste application.",
    image: IMG.tech3,
    basePrice: 40,
    estimatedDuration: "2 hours",
    serviceMode: "Home Visit",
    technicianEmail: "rafiq@fixmate.dev",
    approvalStatus: "approved",
  },
  {
    title: "AC Deep Cleaning",
    category: "AC",
    description: "Indoor and outdoor unit cleaning with gas pressure check and drainage flush.",
    image: IMG.ac,
    basePrice: 60,
    estimatedDuration: "2 hours",
    serviceMode: "Home Visit",
    technicianEmail: "karim@fixmate.dev",
    approvalStatus: "approved",
  },
  {
    title: "AC Gas Refill",
    category: "AC",
    description: "Leak test, vacuuming and R32 gas refill for split air conditioners.",
    image: IMG.ac2,
    basePrice: 110,
    estimatedDuration: "3 hours",
    serviceMode: "Home Visit",
    technicianEmail: "karim@fixmate.dev",
    approvalStatus: "approved",
  },
  {
    title: "Refrigerator Compressor Check",
    category: "Refrigerator",
    description: "Cooling diagnostics, compressor testing and thermostat replacement.",
    image: IMG.fridge,
    basePrice: 75,
    estimatedDuration: "3-4 hours",
    serviceMode: "Home Visit",
    technicianEmail: "karim@fixmate.dev",
    approvalStatus: "approved",
  },
  {
    title: "Washing Machine Drum Repair",
    category: "Washing Machine",
    description: "Drum bearing replacement, belt change and full vibration balancing.",
    image: IMG.washer,
    basePrice: 95,
    estimatedDuration: "1 day",
    serviceMode: "Home Visit",
    technicianEmail: "karim@fixmate.dev",
    approvalStatus: "approved",
  },
  {
    title: "LED TV Panel Diagnosis",
    category: "TV",
    description: "Backlight, panel and power board diagnosis with an honest repair quote.",
    image: IMG.tv,
    basePrice: 50,
    estimatedDuration: "1 day",
    serviceMode: "Shop Drop-off",
    technicianEmail: "karim@fixmate.dev",
    approvalStatus: "approved",
  },
  {
    title: "Ceiling Fan Installation",
    category: "Electrical",
    description: "Safe fan installation with regulator wiring and balance testing.",
    image: IMG.electrical,
    basePrice: 25,
    estimatedDuration: "1 hour",
    serviceMode: "Home Visit",
    technicianEmail: "karim@fixmate.dev",
    approvalStatus: "approved",
  },
  {
    title: "Home Wiring Inspection",
    category: "Electrical",
    description: "Complete safety inspection of home wiring, breakers and earthing.",
    image: IMG.tools,
    basePrice: 65,
    estimatedDuration: "2-3 hours",
    serviceMode: "Home Visit",
    technicianEmail: "karim@fixmate.dev",
    approvalStatus: "pending",
  },
];

const SEED_EMAILS = PEOPLE.map((person) => person.email);

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function history(statuses: BookingStatus[], endDate: Date): BookingDoc["statusHistory"] {
  return statuses.map((status, index) => ({
    status,
    changedAt: new Date(endDate.getTime() - (statuses.length - index) * 60 * 60 * 1000),
  }));
}

async function clearSeedData(): Promise<void> {
  const db = getDb();
  const existingUsers = await usersCollection().find({ email: { $in: SEED_EMAILS } }).toArray();
  const ids = existingUsers.map((user: UserDoc) => user._id);
  const idStrings = ids.map((id) => id.toString());

  if (ids.length) {
    await db.collection("accounts").deleteMany({
      $or: [{ userId: { $in: ids } }, { userId: { $in: idStrings } }],
    });
    await db.collection("sessions").deleteMany({
      $or: [{ userId: { $in: ids } }, { userId: { $in: idStrings } }],
    });
  }

  await usersCollection().deleteMany({ email: { $in: SEED_EMAILS } });
  await servicesCollection().deleteMany({ technicianEmail: { $in: SEED_EMAILS } });
  await bookingsCollection().deleteMany({
    $or: [{ customerEmail: { $in: SEED_EMAILS } }, { technicianEmail: { $in: SEED_EMAILS } }],
  });
  await paymentsCollection().deleteMany({
    $or: [{ customerEmail: { $in: SEED_EMAILS } }, { technicianEmail: { $in: SEED_EMAILS } }],
  });
}

async function createPeople(): Promise<void> {
  const { getAuth } = await import("../lib/auth.js");

  for (const person of PEOPLE) {
    await getAuth().api.signUpEmail({
      body: {
        name: person.name,
        email: person.email,
        password: PASSWORD,
        // Admin accounts can only be created here, never through the public form.
        role: person.role === "admin" ? "customer" : person.role,
      },
    });

    await usersCollection().updateOne(
      { email: person.email },
      {
        $set: {
          role: person.role,
          phone: person.phone,
          area: person.area,
          bio: person.bio,
          image: person.image,
          updatedAt: new Date(),
        },
      }
    );
  }
}

async function createServices(): Promise<ServiceDoc[]> {
  const now = Date.now();
  const docs: ServiceDoc[] = SERVICES.map((service, index) => ({
    _id: new ObjectId(),
    ...service,
    technicianName:
      PEOPLE.find((person) => person.email === service.technicianEmail)?.name ?? "FixMate Technician",
    serviceArea:
      PEOPLE.find((person) => person.email === service.technicianEmail)?.area ?? "Dhaka",
    isAvailable: true,
    createdAt: new Date(now - (SERVICES.length - index) * 24 * 60 * 60 * 1000),
    updatedAt: new Date(now - (SERVICES.length - index) * 24 * 60 * 60 * 1000),
  }));

  await servicesCollection().insertMany(docs);
  return docs;
}

function buildBooking(
  service: ServiceDoc,
  customerEmail: string,
  status: BookingStatus,
  options: { days: number; finalAmount?: number; paymentStatus?: "paid" | "unpaid"; problem: string }
): BookingDoc {
  const customer = PEOPLE.find((person) => person.email === customerEmail)!;
  const preferredDate = daysFromNow(options.days);
  const createdAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

  const statusChain: BookingStatus[] =
    status === "rejected"
      ? ["requested", "rejected"]
      : status === "cancelled"
        ? ["requested", "cancelled"]
        : status === "requested"
          ? ["requested"]
          : status === "accepted"
            ? ["requested", "accepted"]
            : status === "in-progress"
              ? ["requested", "accepted", "in-progress"]
              : ["requested", "accepted", "in-progress", "completed"];

  return {
    _id: new ObjectId(),
    serviceId: service._id.toString(),
    serviceTitle: service.title,
    serviceImage: service.image,
    category: service.category,
    basePrice: service.basePrice,
    technicianName: service.technicianName,
    technicianEmail: service.technicianEmail,
    customerName: customer.name,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    address: `${customer.area}, Dhaka`,
    preferredDate,
    problemDescription: options.problem,
    status,
    finalAmount: options.finalAmount ?? service.basePrice,
    paymentStatus: options.paymentStatus ?? "unpaid",
    statusHistory: history(statusChain, new Date()),
    createdAt,
    updatedAt: new Date(),
  };
}

async function createBookings(services: ServiceDoc[]): Promise<BookingDoc[]> {
  const byTitle = (title: string) => services.find((service) => service.title === title)!;

  const bookings: BookingDoc[] = [
    buildBooking(byTitle("iPhone Screen Replacement"), "customer@fixmate.dev", "requested", {
      days: 2,
      problem: "The screen cracked after a fall and the touch is not responding properly.",
    }),
    buildBooking(byTitle("AC Deep Cleaning"), "customer@fixmate.dev", "accepted", {
      days: 3,
      problem: "The AC is blowing warm air and there is a bad smell when it starts.",
    }),
    buildBooking(byTitle("Laptop Keyboard Repair"), "customer@fixmate.dev", "in-progress", {
      days: 1,
      problem: "Several keys stopped working after a small water spill on the keyboard.",
    }),
    buildBooking(byTitle("MacBook Battery Service"), "customer@fixmate.dev", "completed", {
      days: -2,
      finalAmount: 130,
      problem: "Battery drains within one hour and shows a service warning.",
    }),
    buildBooking(byTitle("LED TV Panel Diagnosis"), "customer@fixmate.dev", "completed", {
      days: -4,
      finalAmount: 55,
      paymentStatus: "paid",
      problem: "The TV turns on but the screen stays dark with a faint backlight glow.",
    }),
    buildBooking(byTitle("AC Gas Refill"), "ayesha@fixmate.dev", "completed", {
      days: -3,
      finalAmount: 115,
      paymentStatus: "paid",
      problem: "Cooling dropped suddenly and the outdoor unit runs continuously.",
    }),
    buildBooking(byTitle("Refrigerator Compressor Check"), "ayesha@fixmate.dev", "rejected", {
      days: 2,
      problem: "The refrigerator is not cooling and the freezer is collecting ice.",
    }),
    buildBooking(byTitle("Washing Machine Drum Repair"), "ayesha@fixmate.dev", "cancelled", {
      days: 4,
      problem: "The drum makes a loud knocking sound during the spin cycle.",
    }),
    buildBooking(byTitle("Samsung Battery Replacement"), "ayesha@fixmate.dev", "requested", {
      days: 5,
      problem: "The phone shuts down at 30 percent battery and charges very slowly.",
    }),
  ];

  await bookingsCollection().insertMany(bookings);
  return bookings;
}

async function createPayments(bookings: BookingDoc[]): Promise<void> {
  const paidBookings = bookings.filter((booking) => booking.paymentStatus === "paid");

  const payments: PaymentDoc[] = paidBookings.map((booking, index) => ({
    _id: new ObjectId(),
    bookingId: booking._id.toString(),
    serviceTitle: booking.serviceTitle,
    customerName: booking.customerName,
    customerEmail: booking.customerEmail,
    technicianName: booking.technicianName,
    technicianEmail: booking.technicianEmail,
    amount: booking.finalAmount,
    currency: "usd",
    transactionId: `pi_seed_${index + 1}`,
    stripeSessionId: `cs_seed_${index + 1}`,
    paymentStatus: "paid",
    paidAt: new Date(Date.now() - (index + 1) * 24 * 60 * 60 * 1000),
  }));

  await paymentsCollection().insertMany(payments);
}

async function main(): Promise<void> {
  await connectToDatabase();
  await ensureIndexes();

  console.log("🧹 Removing previous seed data...");
  await clearSeedData();

  console.log("👤 Creating users...");
  await createPeople();

  console.log("🛠️  Creating services...");
  const services = await createServices();

  console.log("📅 Creating bookings...");
  const bookings = await createBookings(services);

  console.log("💳 Creating payments...");
  await createPayments(bookings);

  const counts = {
    users: await usersCollection().countDocuments(),
    services: await servicesCollection().countDocuments(),
    bookings: await bookingsCollection().countDocuments(),
    payments: await paymentsCollection().countDocuments(),
  };

  console.log("\n✅ Seed complete:", counts);
  console.log("\n🔑 Test accounts (password: Fixmate1234)");
  console.log("   Admin      : admin@fixmate.dev");
  console.log("   Technician : rafiq@fixmate.dev");
  console.log("   Technician : karim@fixmate.dev");
  console.log("   Customer   : customer@fixmate.dev");
  console.log("   Customer   : ayesha@fixmate.dev");

  await closeDatabase();
}

main().catch(async (error) => {
  console.error("❌ Seed failed:", error);
  await closeDatabase();
  process.exit(1);
});
