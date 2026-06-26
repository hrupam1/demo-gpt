import express from "express";
import { kv } from "@vercel/kv";
import getOpenAIAPIResponse from "../utils/openai.js";

const router = express.Router();

// Mock fallback for local development if KV is not configured
const getKVClient = () => {
    if (!process.env.KV_URL) {
        console.warn("Vercel KV environment variables (KV_URL) not found. Falling back to in-memory storage mock.");
        if (!global._kvMockStore) {
            global._kvMockStore = {};
            global._kvMockIndex = [];
        }
        return {
            get: async (key) => global._kvMockStore[key] || null,
            set: async (key, value) => { global._kvMockStore[key] = value; },
            del: async (key) => { delete global._kvMockStore[key]; },
            zrange: async (key, start, end, options) => {
                const sorted = [...global._kvMockIndex].sort((a, b) => b.score - a.score);
                return sorted.map(item => item.member);
            },
            zadd: async (key, { score, member }) => {
                global._kvMockIndex = global._kvMockIndex.filter(item => item.member !== member);
                global._kvMockIndex.push({ score, member });
            },
            zrem: async (key, member) => {
                global._kvMockIndex = global._kvMockIndex.filter(item => item.member !== member);
            }
        };
    }
    return kv;
};

// Get all threads
router.get("/thread", async (req, res) => {
    try {
        const client = getKVClient();
        const threadIds = await client.zrange("threads:index", 0, -1, { rev: true });
        
        const threads = [];
        for (const id of threadIds) {
            const thread = await client.get(`thread:${id}`);
            if (thread) {
                threads.push({
                    threadId: thread.threadId,
                    title: thread.title,
                    updatedAt: thread.updatedAt
                });
            }
        }
        res.json(threads);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch threads" });
    }
});

router.get("/thread/:threadId", async (req, res) => {
    const { threadId } = req.params;
    try {
        const client = getKVClient();
        const thread = await client.get(`thread:${threadId}`);
        if (!thread) {
            return res.status(404).json({ error: "Thread not found" });
        }
        res.json(thread.messages);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch chat" });
    }
});

router.delete("/thread/:threadId", async (req, res) => {
    const { threadId } = req.params;
    try {
        const client = getKVClient();
        await client.del(`thread:${threadId}`);
        await client.zrem("threads:index", threadId);
        res.status(200).json({ success: "Thread deleted successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete thread" });
    }
});

router.post("/chat", async (req, res) => {
    const { threadId, message } = req.body;

    if (!threadId || !message) {
        return res.status(400).json({ error: "missing required fields" });
    }

    try {
        const client = getKVClient();
        const threadKey = `thread:${threadId}`;
        let thread = await client.get(threadKey);

        if (!thread) {
            thread = {
                threadId,
                title: message,
                messages: [{ role: "user", content: message, timestamp: new Date() }],
                createdAt: new Date(),
                updatedAt: new Date()
            };
        } else {
            thread.messages.push({ role: "user", content: message, timestamp: new Date() });
        }

        const assistantReply = await getOpenAIAPIResponse(message);

        thread.messages.push({ role: "assistant", content: assistantReply, timestamp: new Date() });
        thread.updatedAt = new Date();

        await client.set(threadKey, thread);
        await client.zadd("threads:index", { score: Date.now(), member: threadId });

        res.json({ reply: assistantReply });
    } catch (err) {
        console.error("Error in /chat endpoint:", err);
        res.status(500).json({ error: "something went wrong", details: err.message });
    }
});

export default router;