import type { Response } from "express";
import pool from "../db/index.js";
import { generateAIReply } from "../ai/index.js";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware.js";
import type { ChatMessage, Conversation } from "../types/index.js";

function formatMessageTime(date: Date): string {
  if (!date || isNaN(date.getTime())) return "Just now";

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatConversationDate(date: Date): string {
  if (!date || isNaN(date.getTime())) return "Today";

  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return "Today";
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) {
    return "Yesterday";
  }

  const isSameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(isSameYear ? {} : { year: "numeric" }),
  });
}

export async function createConversation(
  req: AuthenticatedRequest,
  res: Response,
) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const messageText: string = (req.body.message || req.body.trimmedDraft || "").trim();
  if (!messageText) {
    return res.status(400).json({ error: "Message content is required" });
  }

  try {
    const title =
      messageText.length > 35
        ? messageText.slice(0, 35) + "…"
        : messageText;

    // 1. Create conversation record
    const { rows: convRows } = await pool.query(
      `INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING id, title, created_at`,
      [req.user.id, title],
    );
    const conv = convRows[0];

    // 2. Insert user's first message
    const { rows: userMsgRows } = await pool.query(
      `INSERT INTO messages (conversation_id, by_user, content) VALUES ($1, true, $2) RETURNING id, content, created_at`,
      [conv.id, messageText],
    );
    const userMsg = userMsgRows[0];

    // 3. AI response
    // =============================  MAGIC is here!  =========================================
    const replyText = await generateAIReply(messageText);

    // 4. Insert assistant's reply
    const { rows: assistantMsgRows } = await pool.query(
      `INSERT INTO messages (conversation_id, by_user, content) VALUES ($1, false, $2) RETURNING id, content, created_at`,
      [conv.id, replyText],
    );
    const assistantMsg = assistantMsgRows[0];

    const messages: ChatMessage[] = [
      {
        id: userMsg.id.toString(),
        role: "user",
        content: userMsg.content,
        time: formatMessageTime(userMsg.created_at),
        createdAt: userMsg.created_at.toISOString(),
      },
      {
        id: assistantMsg.id.toString(),
        role: "assistant",
        content: assistantMsg.content,
        time: formatMessageTime(assistantMsg.created_at),
        createdAt: assistantMsg.created_at.toISOString(),
      },
    ];

    const newConversation: Conversation = {
      id: conv.id.toString(),
      title: conv.title,
      preview: replyText,
      time: formatConversationDate(conv.created_at),
      createdAt: conv.created_at.toISOString(),
      updatedAt: conv.created_at.toISOString(),
      messages,
    };

    return res.status(201).json(newConversation);
  } catch (err) {
    console.error("Error creating conversation:", err);
    return res.status(500).json({ error: "Failed to create conversation" });
  }
}

export async function addMessageToConversation(
  req: AuthenticatedRequest,
  res: Response,
) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const rawId = req.params.id;
  const idStr = Array.isArray(rawId) ? rawId[0] : rawId;
  const convId = parseInt(idStr || "", 10);
  if (isNaN(convId)) {
    return res.status(400).json({ error: "Invalid conversation ID" });
  }

  const messageText: string = (req.body.message || req.body.trimmedDraft || "").trim();
  if (!messageText) {
    return res.status(400).json({ error: "Message content is required" });
  }

  try {
    // Check conversation ownership
    const { rows: convRows } = await pool.query(
      `SELECT id FROM conversations WHERE id = $1 AND user_id = $2`,
      [convId, req.user.id],
    );

    if (convRows.length === 0) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // 1. Insert user message
    const { rows: userMsgRows } = await pool.query(
      `INSERT INTO messages (conversation_id, by_user, content) VALUES ($1, true, $2) RETURNING id, content, created_at`,
      [convId, messageText],
    );
    const userMsg = userMsgRows[0];

    // 2. AI response
    // =============================  MAGIC is here!  =========================================
    const replyText = await generateAIReply(messageText);

    // 3. Insert assistant reply
    const { rows: assistantMsgRows } = await pool.query(
      `INSERT INTO messages (conversation_id, by_user, content) VALUES ($1, false, $2) RETURNING id, content, created_at`,
      [convId, replyText],
    );
    const assistantMsg = assistantMsgRows[0];

    const userMessage: ChatMessage = {
      id: userMsg.id.toString(),
      role: "user",
      content: userMsg.content,
      time: formatMessageTime(userMsg.created_at),
      createdAt: userMsg.created_at.toISOString(),
    };

    const assistantMessage: ChatMessage = {
      id: assistantMsg.id.toString(),
      role: "assistant",
      content: assistantMsg.content,
      time: formatMessageTime(assistantMsg.created_at),
      createdAt: assistantMsg.created_at.toISOString(),
    };

    return res.json({
      userMessage,
      assistantMessage,
    });
  } catch (err) {
    console.error("Error adding message to conversation:", err);
    return res.status(500).json({ error: "Failed to send message" });
  }
}

export async function getConversations(
  req: AuthenticatedRequest,
  res: Response,
) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { rows } = await pool.query(
      `
      SELECT 
        c.id, 
        c.title, 
        c.created_at,
        COALESCE(
          (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1),
          ''
        ) as preview,
        COALESCE(
          (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1),
          c.created_at
        ) as last_activity
      FROM conversations c
      WHERE c.user_id = $1
      ORDER BY c.id DESC
      `,
      [req.user.id],
    );

    const conversations: Conversation[] = rows.map((r) => {
      const activityDate = r.last_activity ? new Date(r.last_activity) : new Date(r.created_at);
      return {
        id: r.id.toString(),
        title: r.title,
        preview: r.preview,
        time: formatConversationDate(activityDate),
        createdAt: new Date(r.created_at).toISOString(),
        updatedAt: activityDate.toISOString(),
        messages: [],
      };
    });

    return res.json(conversations);
  } catch (err) {
    console.error("Error fetching conversations:", err);
    return res.status(500).json({ error: "Failed to fetch conversations" });
  }
}

export async function getConversationById(
  req: AuthenticatedRequest,
  res: Response,
) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const rawId = req.params.id;
  const idStr = Array.isArray(rawId) ? rawId[0] : rawId;
  const convId = parseInt(idStr || "", 10);
  if (isNaN(convId)) {
    return res.status(400).json({ error: "Invalid conversation ID" });
  }

  try {
    const { rows: convRows } = await pool.query(
      `SELECT id, title, created_at FROM conversations WHERE id = $1 AND user_id = $2`,
      [convId, req.user.id],
    );

    if (convRows.length === 0) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    const conv = convRows[0];

    const { rows: msgRows } = await pool.query(
      `SELECT id, by_user, content, created_at FROM messages WHERE conversation_id = $1 ORDER BY id ASC`,
      [convId],
    );

    const messages: ChatMessage[] = msgRows.map((m) => ({
      id: m.id.toString(),
      role: m.by_user ? "user" : "assistant",
      content: m.content,
      time: formatMessageTime(m.created_at),
      createdAt: m.created_at.toISOString(),
    }));

    const lastMessage = messages[messages.length - 1];
    const activityDate = lastMessage?.createdAt ? new Date(lastMessage.createdAt) : conv.created_at;

    const conversation: Conversation = {
      id: conv.id.toString(),
      title: conv.title,
      preview: lastMessage ? lastMessage.content : "",
      time: formatConversationDate(activityDate),
      createdAt: conv.created_at.toISOString(),
      updatedAt: activityDate instanceof Date ? activityDate.toISOString() : new Date(activityDate).toISOString(),
      messages,
    };

    return res.json(conversation);
  } catch (err) {
    console.error("Error fetching conversation:", err);
    return res.status(500).json({ error: "Failed to fetch conversation" });
  }
}