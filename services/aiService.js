import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const runAIReview = async (files) => {
  try {
    const codeContext = files.map(
      file => `--- START FILE: ${file.fileName} ---\n${file.content}\n--- END FILE ---`
    ).join('\n\n');

    const prompt = `
      Please review the following source code files. 
      Identify bugs, security vulnerabilities, and performance bottlenecks.
      
      Code to review:
      ${codeContext}
    `;

    console.log('Sending payload to Gemini...');
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: `You are an elite Staff Software Engineer conducting a strict code review. 
          Return your findings as a raw JSON object with exactly this structure:
          {
            "summary": "Describe the uploaded codebase specifically. Mention detected language(s), architecture, design patterns, code quality, security observations, performance observations, and maintainability. Do not use generic statements.",
            "strengths": ["Strength 1", "Strength 2"],
            "weaknesses": ["Weakness 1", "Weakness 2"],
            "aiSuggestions": [
              {
                "category": "Security|Performance|Refactoring|Best Practices",
                "priority": "High|Medium|Low",
                "title": "Short title of the suggestion",
                "description": "What is the issue and how to fix it",
                "whyItMatters": "Explain the impact",
                "snippet": "Short code example of the fix (if applicable)"
              }
            ],
            "findings": [
              {
                "file": "filename",
                "type": "bug|security|performance|style",
                "severity": "low|medium|high|critical",
                "line_estimate": "approximate line number or function name",
                "description": "What is wrong",
                "recommendation": "How to fix it"
              }
            ]
          }`,
        temperature: 0.1, 
      }
    });

    return JSON.parse(response.text);

  } catch (error) {
    console.error("AI Review Pipeline Failed:", error);
    throw new Error("Failed to generate AI code review");
  }
};