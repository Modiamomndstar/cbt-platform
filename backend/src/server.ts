import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import fileUpload from "express-fileupload";

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from "./routes/auth";
import schoolRoutes from "./routes/schools";
import tutorRoutes from "./routes/tutors";
import studentRoutes from "./routes/students";
import examRoutes from "./routes/exams";
import questionRoutes from "./routes/questions";
import scheduleRoutes from "./routes/schedules";
import resultRoutes from "./routes/results";
import paymentRoutes from "./routes/payments";
import messagesRoutes from "./routes/messages";
import categoryRoutes from "./routes/categories";
import analyticsRoutes from "./routes/analytics";
import uploadRoutes from "./routes/uploads";
import billingRoutes from "./routes/billing";
import securityRoutes from "./routes/security";
import staffRoutes from "./routes/staff";
import superAdminRoutes from "./routes/superAdmin";
import schoolSettingsRoutes from "./routes/schoolSettings";
import externalStudentRoutes from "./routes/externalStudents";
import examCategoryRoutes from "./routes/examCategories";
import examTypeRoutes from "./routes/examTypes";
import competitionRoutes from "./routes/competitions";
import aiCoachRoutes from "./routes/aiCoach";
import aiAnalyticsRoutes from "./routes/aiAnalytics";
import commissionRoutes from "./routes/commissions";
import { initCronJobs } from "./services/cronService";
import { ApiResponseHandler } from "./utils/apiResponse";

// Import services
// import { EmailService } from "./services/email";
import { logger } from "./utils/logger";

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Disable CSP for API to allow mobile flexibility
}));

app.use(
  cors({
    origin: (origin, callback) => {
      // For APIs, it's often better to be more permissive with origins
      // especially when dealing with mobile apps and local dev
      const allowed = [
        process.env.FRONTEND_URL,
        "https://mycbtplatform.cc",
        "https://www.mycbtplatform.cc",
        "null",
        "http://localhost",
        "http://localhost:5173",
        "http://localhost:8081",
        "http://10.0.2.2", // Android Emulator
        "http://10.0.2.2:5000",
        "http://10.0.2.2:8081",
      ].filter(Boolean);

      // If no origin (standard for many mobile app requests) or in allowed list
      if (!origin || allowed.includes(origin)) {
        return callback(null, true);
      }

      // Check for mobile app custom schemes, local network, or specific subdomains
      if (
        origin.startsWith("http://192.168.") ||
        origin.startsWith("http://10.") ||
        origin.startsWith("exp://") ||
        origin.includes("mycbtplatform.cc") ||
        origin.includes("localhost")
      ) {
        return callback(null, true);
      }

      // In development, allow all
      if (process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }

      logger.warn(`Rejected CORS origin: ${origin}`);
      callback(new Error(`CORS policy: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  }),
);

// Rate limiting - Significantly increased for production stability
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000, // 2000 requests per 15 minutes (much safer for mobile apps)
  message: "Too many requests from this IP, please try again later.",
  handler: (req, res) => ApiResponseHandler.badRequest(res, "Too many requests from this IP, please try again later.", { code: 'RATE_LIMIT_EXCEEDED' }),
});
app.use("/api/", limiter);

// Rate limiting for auth routes - Also increased
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: "Too many login attempts, please try again after 15 minutes",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth/school/login", authLimiter);
app.use("/api/auth/tutor/login", authLimiter);
app.use("/api/auth/student/login", authLimiter);
app.use("/api/auth/student/portal-login", authLimiter);
app.use("/api/auth/super-admin/login", authLimiter);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// File upload middleware
app.use(
  fileUpload({
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
    abortOnLimit: true,
    useTempFiles: false,
  }),
);

// Logging
app.use(
  morgan("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  }),
);

// Static files
const uploadsPath = fs.existsSync(path.join(process.cwd(), "uploads"))
  ? path.join(process.cwd(), "uploads")
  : path.join(process.cwd(), "backend", "uploads");

logger.info(`Serving static files from: ${uploadsPath}`);
app.use("/uploads", express.static(uploadsPath));

// Health check endpoint (both /health and /api/health for Caddy passthrough)
app.get(["/health", "/api/health"], (req, res) => {
  ApiResponseHandler.success(res, { status: "ok", timestamp: new Date().toISOString() }, "Health check successful");
});

// Root endpoint for quick API info
app.get("/", (req, res) => {
  ApiResponseHandler.success(res, {
    timestamp: new Date().toISOString(),
  }, "CBT Platform API is running");
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/schools", schoolRoutes);
app.use("/api/tutors", tutorRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/schedules", scheduleRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/uploads", uploadRoutes);
// Sprint 1: Monetisation & Admin
app.use("/api/billing", billingRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/super-admin", superAdminRoutes);
app.use("/api/school-settings", schoolSettingsRoutes);
app.use("/api/tutor/external-students", externalStudentRoutes);
app.use("/api/exam-categories", examCategoryRoutes);
app.use("/api/exam-types", examTypeRoutes);
app.use("/api/competitions", competitionRoutes);
app.use("/api/exams/security", securityRoutes);
app.use("/api/ai", aiCoachRoutes);
app.use("/api/ai-analytics", aiAnalyticsRoutes);
app.use("/api/commissions", commissionRoutes);

// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    logger.error("Unhandled error:", err);
    ApiResponseHandler.serverError(res, err.message || "Internal server error", {
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
      status: err.status || 500
    });
  },
);

// 404 handler
app.use((req, res) => {
  ApiResponseHandler.notFound(res, "Route not found");
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || "development"}`);

  // Initialize automated jobs (e.g., Trial expiries)
  initCronJobs();
});

export default app;
