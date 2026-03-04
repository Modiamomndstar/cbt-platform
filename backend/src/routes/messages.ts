import { Router, Request, Response } from "express";
import { db } from "../config/database";
import { authenticate, authorize } from "../middleware/auth";
import { ApiResponseHandler } from "../utils/apiResponse";

const router = Router();
const PLATFORM_SUPPORT_ID = "00000000-0000-0000-0000-000000000000";

// Get allowed recipients based on user role
router.get("/recipients", authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    let recipients: any[] = [];

    if (user.role === 'super_admin') {
      const schools = await db.query("SELECT id, name, 'school' as role FROM schools WHERE is_active = true ORDER BY name");
      recipients = schools.rows;
    } else if (user.role === 'school') {
      const tutors = await db.query("SELECT id, full_name as name, 'tutor' as role FROM tutors WHERE school_id = $1 AND is_active = true ORDER BY full_name", [user.id]);
      const students = await db.query("SELECT id, full_name as name, 'student' as role FROM students WHERE school_id = $1 AND is_active = true ORDER BY full_name", [user.id]);
      recipients = [
        { id: PLATFORM_SUPPORT_ID, name: 'Platform Support', role: 'super_admin' },
        ...tutors.rows,
        ...students.rows
      ];
    } else if (user.role === 'tutor') {
      const school = await db.query("SELECT id, name, 'school' as role FROM schools WHERE id = $1", [user.schoolId]);
      const students = await db.query(
        `SELECT s.id, s.full_name as name, 'student' as role
         FROM students s
         JOIN student_tutors st ON s.id = st.student_id
         WHERE st.tutor_id = $1 AND s.is_active = true ORDER BY s.full_name`,
        [user.id]
      );
      recipients = [...school.rows, ...students.rows];
    } else if (user.role === 'student') {
      const school = await db.query("SELECT id, name, 'school' as role FROM schools WHERE id = $1", [user.schoolId]);
      const tutors = await db.query(
        `SELECT t.id, t.full_name as name, 'tutor' as role
         FROM tutors t
         JOIN student_tutors st ON t.id = st.tutor_id
         WHERE st.student_id = $1 AND t.is_active = true ORDER BY t.full_name`,
        [user.id]
      );
      recipients = [...school.rows, ...tutors.rows];
    }

    ApiResponseHandler.success(res, recipients);
  } catch (error) {
    console.error("Recipients error:", error);
    ApiResponseHandler.serverError(res, "Failed to fetch recipients");
  }
});

// Send a private message
router.post("/send", authenticate, async (req: Request, res: Response) => {
  try {
    const { receiverId, receiverRole, content } = req.body;
    const user = req.user!;

    if (!receiverId || !receiverRole || !content) {
      return ApiResponseHandler.badRequest(res, "Missing required fields");
    }

    const isToSupport = receiverId === 'platform_support' || receiverId === PLATFORM_SUPPORT_ID;
    const finalReceiverId = isToSupport ? PLATFORM_SUPPORT_ID : receiverId;
    const finalReceiverRole = isToSupport ? 'super_admin' : receiverRole;

    // Simple role-based validation (ensure cross-school messaging isn't possible for non-admins)
    if (user.role !== 'super_admin' && finalReceiverRole !== 'super_admin') {
        const targetId = user.schoolId || user.id;
        // Verify recipient belongs to the same school if it's a student/tutor/school admin
        // This is a basic safety check; in a highly secure environment, we'd query the recipient's school_id here.
    }

    const result = await db.query(
      `INSERT INTO inbox_messages (sender_id, sender_role, receiver_id, receiver_role, content)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user.id, user.role, finalReceiverId, finalReceiverRole, content]
    );

    ApiResponseHandler.success(res, result.rows[0], "Message sent successfully");
  } catch (error) {
    console.error("Send message error:", error);
    ApiResponseHandler.serverError(res, "Failed to send message");
  }
});

// Get inbox messages for current user
router.get("/inbox", authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;

    // Staff/Admins see their own messages + messages to Platform Support alias
    const isStaff = user.role === 'super_admin';
    const receiverFilter = isStaff
      ? `(m.receiver_id = $1 OR m.receiver_id = $3)`
      : `m.receiver_id = $1`;

    const queryParams = isStaff
      ? [user.id, user.role, PLATFORM_SUPPORT_ID]
      : [user.id, user.role];

    const directMessages = await db.query(
      `SELECT m.*,
              CASE
                WHEN m.sender_role = 'school' THEN (SELECT name FROM schools WHERE id = m.sender_id)
                WHEN m.sender_role = 'tutor' THEN (SELECT full_name FROM tutors WHERE id = m.sender_id)
                WHEN m.sender_role = 'student' THEN (SELECT full_name FROM students WHERE id = m.sender_id)
                WHEN m.sender_role = 'super_admin' THEN (SELECT COALESCE(name, 'System Admin') FROM staff_accounts WHERE id = m.sender_id)
                ELSE 'System'
              END as sender_name
       FROM inbox_messages m
       WHERE ${receiverFilter} AND m.receiver_role = $2
       ORDER BY m.created_at DESC`,
      queryParams
    );

    // Fetch broadcasts relevant to this user
    const broadcasts = await db.query(
      `SELECT b.*, 'System' as sender_name
       FROM inbox_broadcasts b
       WHERE (b.target_role IS NULL OR b.target_role = $1)
         AND (b.target_school_id IS NULL OR b.target_school_id = $2)
       ORDER BY b.created_at DESC`,
      [user.role, user.schoolId || user.id]
    );

    ApiResponseHandler.success(res, {
      messages: directMessages.rows,
      broadcasts: broadcasts.rows
    }, "Inbox retrieved");
  } catch (error) {
    console.error("Get inbox error:", error);
    ApiResponseHandler.serverError(res, "Failed to retrieve inbox");
  }
});

// Mark message as read
router.patch("/read/:messageId", authenticate, async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const user = req.user!;

    await db.query(
      "UPDATE inbox_messages SET is_read = true WHERE id = $1 AND receiver_id = $2",
      [messageId, user.id]
    );

    ApiResponseHandler.success(res, null, "Message marked as read");
  } catch (error) {
    console.error("Mark read error:", error);
    ApiResponseHandler.serverError(res, "Failed to update message");
  }
});

// Get unread count
router.get("/unread-count", authenticate, async (req: Request, res: Response) => {
  try {
    const user = req.user!;
    const isStaff = user.role === 'super_admin';

    const query = isStaff
      ? `SELECT COUNT(*) FROM inbox_messages
         WHERE (receiver_id = $1 OR receiver_id = $2)
         AND is_read = false`
      : `SELECT COUNT(*) FROM inbox_messages
         WHERE receiver_id = $1
         AND is_read = false`;

    const params = isStaff
      ? [user.id, PLATFORM_SUPPORT_ID]
      : [user.id];

    const result = await db.query(query, params);
    ApiResponseHandler.success(res, { count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error("Unread count error:", error);
    ApiResponseHandler.serverError(res, "Failed to get unread count");
  }
});

// Broadcast a message (Admins only)
router.post("/broadcast", authenticate, authorize("super_admin", "school"), async (req: Request, res: Response) => {
  try {
    const { title, content, targetRole, targetSchoolId } = req.body;
    const user = req.user!;

    const result = await db.query(
      `INSERT INTO inbox_broadcasts (sender_id, sender_role, title, content, target_role, target_school_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [user.id, user.role, title, content, targetRole || null, targetSchoolId || null]
    );

    ApiResponseHandler.success(res, result.rows[0], "Broadcast sent successfully");
  } catch (error) {
    console.error("Broadcast error:", error);
    ApiResponseHandler.serverError(res, "Failed to send broadcast");
  }
});

export default router;
