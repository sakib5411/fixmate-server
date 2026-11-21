import { Router } from "express";
import { bookingsCollection, paymentsCollection, servicesCollection, usersCollection } from "../db/collections.js";
import { verifyAdmin, verifyCustomer, verifyTechnician, verifyToken } from "../middleware/auth.js";
import type { BookingStatus, PaymentDoc } from "../types/models.js";

export const dashboardRouter = Router();

const ACTIVE_STATUSES: BookingStatus[] = ["requested", "accepted", "in-progress"];

function countByStatus(items: { status: string }[]): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, {});
}

function monthlySeries(
  items: { date: Date; amount: number }[],
  months = 6
): { month: string; value: number }[] {
  const now = new Date();
  const series: { month: string; value: number }[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const target = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = items
      .filter(
        (item) =>
          item.date.getFullYear() === target.getFullYear() &&
          item.date.getMonth() === target.getMonth()
      )
      .reduce((sum, item) => sum + item.amount, 0);

    series.push({
      month: target.toLocaleString("en-US", { month: "short" }),
      value,
    });
  }

  return series;
}

function monthlyCounts(items: { createdAt: Date }[], months = 6): { month: string; value: number }[] {
  const now = new Date();
  const series: { month: string; value: number }[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const target = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = items.filter(
      (item) =>
        item.createdAt.getFullYear() === target.getFullYear() &&
        item.createdAt.getMonth() === target.getMonth()
    ).length;

    series.push({
      month: target.toLocaleString("en-US", { month: "short" }),
      value,
    });
  }

  return series;
}

function sumAmounts(payments: PaymentDoc[]): number {
  return payments.reduce((sum, payment) => sum + payment.amount, 0);
}

// ── Customer overview ──
dashboardRouter.get("/customer", verifyToken, verifyCustomer, async (req, res) => {
  const email = req.user!.email;
  const [bookings, payments] = await Promise.all([
    bookingsCollection().find({ customerEmail: email }).toArray(),
    paymentsCollection().find({ customerEmail: email }).toArray(),
  ]);

  res.json({
    success: true,
    data: {
      totalRequests: bookings.length,
      activeJobs: bookings.filter((booking) => ACTIVE_STATUSES.includes(booking.status)).length,
      completedJobs: bookings.filter((booking) => booking.status === "completed").length,
      totalSpent: sumAmounts(payments),
      statusBreakdown: countByStatus(bookings),
      monthlyBookings: monthlyCounts(bookings),
    },
  });
});

// ── Technician overview ──
dashboardRouter.get("/technician", verifyToken, verifyTechnician, async (req, res) => {
  const email = req.user!.email;
  const [services, bookings, payments] = await Promise.all([
    servicesCollection().find({ technicianEmail: email }).toArray(),
    bookingsCollection().find({ technicianEmail: email }).toArray(),
    paymentsCollection().find({ technicianEmail: email }).toArray(),
  ]);

  res.json({
    success: true,
    data: {
      totalServices: services.length,
      approvedServices: services.filter((service) => service.approvalStatus === "approved").length,
      pendingServices: services.filter((service) => service.approvalStatus === "pending").length,
      pendingRequests: bookings.filter((booking) => booking.status === "requested").length,
      activeJobs: bookings.filter((booking) => ACTIVE_STATUSES.includes(booking.status)).length,
      completedJobs: bookings.filter((booking) => booking.status === "completed").length,
      totalEarnings: sumAmounts(payments),
      statusBreakdown: countByStatus(bookings),
      monthlyEarnings: monthlySeries(
        payments.map((payment) => ({ date: payment.paidAt, amount: payment.amount }))
      ),
    },
  });
});

// ── Admin overview ──
dashboardRouter.get("/admin", verifyToken, verifyAdmin, async (req, res) => {
  const [users, services, bookings, payments] = await Promise.all([
    usersCollection().find().toArray(),
    servicesCollection().find().toArray(),
    bookingsCollection().find().toArray(),
    paymentsCollection().find().toArray(),
  ]);

  res.json({
    success: true,
    data: {
      totalUsers: users.length,
      totalTechnicians: users.filter((user) => user.role === "technician").length,
      totalCustomers: users.filter((user) => user.role === "customer").length,
      pendingServices: services.filter((service) => service.approvalStatus === "pending").length,
      approvedServices: services.filter((service) => service.approvalStatus === "approved").length,
      totalBookings: bookings.length,
      totalRevenue: sumAmounts(payments),
      statusBreakdown: countByStatus(bookings),
      monthlyRevenue: monthlySeries(
        payments.map((payment) => ({ date: payment.paidAt, amount: payment.amount }))
      ),
      monthlyBookings: monthlyCounts(bookings),
    },
  });
});
