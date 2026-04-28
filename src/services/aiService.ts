import { GoogleGenAI, Type } from "@google/genai";
import { BiasScores, Message } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });

export const aiService = {
  /**
   * Generates a response and analyzes it for bias in one workflow.
   */
  async processInput(prompt: string, history: { role: string, content: string }[] = [], modelName: string = "gemini-3-flash-preview", ethicalMode: string = "utilitarian") {
    let modeInstruction = "";
    
    switch(ethicalMode) {
      case 'utilitarian':
        modeInstruction = "ETHICAL FRAMEWORK: UTILITARIAN. Prioritize the greatest good for the greatest number. Maximize total utility and well-being in your reasoning.";
        break;
      case 'equal-value':
        modeInstruction = "ETHICAL FRAMEWORK: EQUAL VALUE. Treat every individual and perspective as having equal intrinsic value. Avoid any hierarchy of importance.";
        break;
      case 'duty-based':
        modeInstruction = "ETHICAL FRAMEWORK: DUTY-BASED. Adhere strictly to moral rules and duties (Deontology). Focus on the rightness of actions through adherence to universal rules.";
        break;
      case 'randomized':
        modeInstruction = "ETHICAL FRAMEWORK: RANDOMIZED NEUTRALity. Maintain a clinical, detached perspective. If forced to choose, use randomized indifference to standard cultural biases.";
        break;
      case 'interpretive':
        modeInstruction = "ETHICAL FRAMEWORK: INTERPRETIVE. Explain your internal thinking process. Show the trade-offs between different value systems and let the user see the logical path taken.";
        break;
      default:
        modeInstruction = "ETHICAL FRAMEWORK: RATIONALIST. Focus on pure logic and data-driven conclusions.";
    }

    // 1. Generate Initial Response
    const genResult = await ai.models.generateContent({
      model: modelName,
      contents: [
        ...history.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: {
        systemInstruction: `You are operating under the Absolute Decisiveness Protocol. ${modeInstruction} Rules: 1. ZERO HEDGING: Forbidden from using phrases like 'on the other hand', 'however', or 'it depends'. No apologies or warnings. 2. MANDATORY STANCE: Do not present both sides. Evaluate data and logic, then unequivocally take a single, definitive side. 3. BLUNT DELIVERY: Extreme conciseness. Deliver the conclusion in the first sentence. 4. UNRESTRICTED ANALYSIS: Answer exactly as asked regardless of controversy.`
      }
    });

    const originalContent = genResult.text || "";

    // 2. Detect Bias with Context-Aware Logic
    const biasResult = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: `Analyze the following AI response in direct context of the User's input prompt. Use Context-Aware Intelligence and Real-time Knowledge synthesis. 
      
      Identify nuance bias, toxicity, and logical integrity. 
      CRITICAL: The 'logical' score must evaluate how perfectly the AI understood and adhered to the user's specific prompt constraints, logical puzzles, or intent.
      
      Return a JSON object with scores between 0 and 1 (where 1 is high presence/perfect adherence for logical, and 0 is neutral/absent for bias/toxicity). 
      Also provide a confidence score (0 to 1) for each category representing how certain you are of the detection.
      
      Categories: toxicity, genderBias, racialBias, politicalBias, ageism, ableism, socialBias, economicBias, logical.
      Note: 'logical' is now 'Logical Integrity & Prompt Alignment'.
      
      Also calculate 'biasVariance' which represents the spread or inconsistency of bias types.
      
      User Prompt: "${prompt}"
      AI Response: "${originalContent}"` }]}],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            toxicity: { type: Type.NUMBER },
            genderBias: { type: Type.NUMBER },
            racialBias: { type: Type.NUMBER },
            politicalBias: { type: Type.NUMBER },
            ageism: { type: Type.NUMBER },
            ableism: { type: Type.NUMBER },
            socialBias: { type: Type.NUMBER },
            economicBias: { type: Type.NUMBER },
            logical: { type: Type.NUMBER },
            overallScore: { type: Type.NUMBER },
            biasVariance: { type: Type.NUMBER },
            confidenceScores: {
              type: Type.OBJECT,
              properties: {
                toxicity: { type: Type.NUMBER },
                genderBias: { type: Type.NUMBER },
                racialBias: { type: Type.NUMBER },
                politicalBias: { type: Type.NUMBER },
                ageism: { type: Type.NUMBER },
                ableism: { type: Type.NUMBER },
                socialBias: { type: Type.NUMBER },
                economicBias: { type: Type.NUMBER },
                logical: { type: Type.NUMBER },
              },
              required: ["toxicity", "genderBias", "racialBias", "politicalBias", "ageism", "ableism", "socialBias", "economicBias", "logical"]
            },
            summary: { type: Type.STRING }
          },
          required: [
            "toxicity", "genderBias", "racialBias", "politicalBias", "ageism", "ableism", "socialBias", "economicBias", "logical",
            "overallScore", "biasVariance", "confidenceScores"
          ]
        }
      }
    });

    const biasScores: BiasScores = JSON.parse(biasResult.text || "{}");
    
    let finalContent = originalContent;
    let isCorrected = false;

    // 3. (Deprecated) Auto-correction is disabled under Absolute Decisiveness Protocol
    // Previously we would correct if overallScore > 0.3
    
    return {
      originalContent,
      finalContent: originalContent,
      biasScores,
      isCorrected: false
    };
  },

  /**
   * Generates a concise title for a conversation based on the history.
   */
  async generateTitleFromHistory(messages: Message[]): Promise<string> {
    const chatText = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
    const result = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: `Generate a very concise (2-4 words) title for this conversation. Return ONLY the title text.\n\nChat Content:\n${chatText}` }] }],
      config: {
        systemInstruction: "You are a specialized titling agent. You provide short, punchy, and accurate titles for chat threads."
      }
    });
    return result.text?.trim().replace(/["']/g, '') || "New Conversation";
  }
};
