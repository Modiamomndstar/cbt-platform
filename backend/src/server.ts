import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import path from "path";
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
import staffRoutes from "./routes/staff";
import superAdminRoutes from "./routes/superAdmin";
import schoolSettingsRoutes from "./routes/schoolSettings";
import externalStudentRoutes from "./routes/externalStudents";
import examCategoryRoutes from "./routes/examCategories";
import examTypeRoutes from "./routes/examTypes";
import competitionRoutes from "./routes/competitions";
import aiCoachRoutes from "./routes/aiCoach";
import { initCronJobs } from "./services/cronService";
import { ApiResponseHandler } from "./utils/apiResponse";

// Import services
// import { EmailService } from "./services/email";
import { logger } from "./utils/logger";

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // 💡 Production Tip:
      // Mobile apps often send no origin, 'null' origin, or a custom protocol.
      // We explicitly allow 'null' for production and standard local origins.
      const allowed = [
        process.env.FRONTEND_URL,
        "null",
        "http://localhost",
        "http://localhost:5173",
        "http://localhost:8081",
        "http://10.143.80.37:5000",
      ].filter(Boolean);

      // Log rejected origins in production to debug 403s
      if (process.env.NODE_ENV === "production" && origin && !allowed.includes(origin)) {
        logger.warn(`Rejected CORS origin: ${origin}`);
      }

      // If no origin (mobile app, curl, etc.) or in the allowed list, approve it
      if (!origin || allowed.includes(origin)) {
        return callback(null, true);
      }

      // Allow mobile app requests that might have custom headers but no origin
      if (allowed.some(a => a && origin.startsWith(a))) {
        return callback(null, true);
      }

      callback(new Error(`CORS policy: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  }),
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  handler: (req, res) => ApiResponseHandler.badRequest(res, "Too many requests from this IP, please try again later.", { code: 'RATE_LIMIT_EXCEEDED' }),
});
app.use("/api/", limiter);

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // slightly more generous for schools/tutors
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
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

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
app.use("/api/ai", aiCoachRoutes);

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
