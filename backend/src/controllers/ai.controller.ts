import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Request, Response } from "express";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

/**
 * POST /ai/suggest
 * Takes recent transcript and returns 3 smart reply suggestions.
 */
export async function getSmartReplies(req: Request, res: Response) {
    try {
        const { transcript, lastSpeaker } = req.body;

        if (!transcript || transcript.length === 0) {
            return res.json({ suggestions: ["Got it!", "I agree", "Can you elaborate?"] });
        }

        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
            return res.json({ suggestions: ["Sure, sounds good!", "I'll look into that", "Can you explain more?"] });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `You are a meeting assistant. Based on the following meeting transcript, suggest exactly 3 short, natural reply options that the user could say next. The replies should be contextually relevant, professional, and conversational.

Recent transcript:
${transcript}

Last speaker: ${lastSpeaker || "Unknown"}

Rules:
- Return ONLY a JSON array of exactly 3 strings
- Each reply should be 3-12 words max
- Make them diverse: one agreeing, one asking for clarification, one adding a point
- No quotes around the array items in the response, just the JSON array
- Example format: ["I agree with that approach", "What about the timeline?", "We should also consider testing"]`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();

        // Parse the JSON array from the response
        const match = text.match(/\[[\s\S]*\]/);
        if (match) {
            const suggestions = JSON.parse(match[0]);
            return res.json({ suggestions: suggestions.slice(0, 3) });
        }

        return res.json({ suggestions: ["Got it!", "I agree", "Can you tell me more?"] });
    } catch (error: any) {
        console.error("AI suggest error:", error.message);
        return res.json({ suggestions: ["Sounds good!", "I understand", "Let's discuss further"] });
    }
}

/**
 * POST /ai/summary
 * Takes full meeting transcript and returns structured summary.
 */
export async function getMeetingSummary(req: Request, res: Response) {
    try {
        const { transcript, duration, participantCount } = req.body;

        if (!transcript || transcript.length === 0) {
            return res.json({
                summary: "No transcript available for this meeting.",
                keyPoints: [],
                actionItems: [],
                decisions: [],
            });
        }

        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
            return res.json({
                summary: "AI summary requires a Gemini API key. Add your key to backend/.env",
                keyPoints: ["Configure GEMINI_API_KEY in .env to enable AI summaries"],
                actionItems: ["Get a free API key from https://aistudio.google.com/apikey"],
                decisions: [],
            });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `You are a professional meeting summarizer. Analyze this meeting transcript and provide a structured summary.

Meeting details:
- Duration: ${duration || "Unknown"}
- Participants: ${participantCount || "Unknown"}

Transcript:
${transcript}

Return a JSON object with these exact keys:
{
  "summary": "A 2-3 sentence overview of the meeting",
  "keyPoints": ["Array of 3-5 key discussion points"],
  "actionItems": ["Array of action items with owners if mentioned"],
  "decisions": ["Array of decisions made during the meeting"]
}

Rules:
- Be concise and professional
- If no action items or decisions are clear, return empty arrays
- Return ONLY the JSON object, no markdown or extra text`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();

        // Parse JSON from response
        const match = text.match(/\{[\s\S]*\}/);
        if (match) {
            const parsed = JSON.parse(match[0]);
            return res.json(parsed);
        }

        return res.json({
            summary: text.slice(0, 500),
            keyPoints: [],
            actionItems: [],
            decisions: [],
        });
    } catch (error: any) {
        console.error("AI summary error:", error.message);
        return res.status(500).json({
            summary: "Failed to generate summary. Please try again.",
            keyPoints: [],
            actionItems: [],
            decisions: [],
        });
    }
}
