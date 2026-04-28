import { GoogleGenAI, Type } from "@google/genai";
import { BiasScores, Message, Attachment } from "../types";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the environment. Please check your AI Studio settings.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

/**
 * Helper to convert a file URL to a Gemini compatible part
 */
async function fileToGenerativePart(url: string, mimeType: string) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = (reader.result as string).split(',')[1];
        resolve({
          inlineData: {
            data: base64data,
            mimeType
          },
        });
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error converting file to part:", error);
    return null;
  }
}

export const aiService = {
  /**
   * Generates a response and analyzes it for bias in one workflow.
   */
  async processInput(prompt: string, history: { role: string, content: string, attachments?: Attachment[] }[] = [], modelName: string = "gemini-3-flash-preview", ethicalMode: string = "utilitarian", currentAttachments: Attachment[] = []) {
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

    // 1. Prepare Multi-modal Parts
    const historyParts = await Promise.all(history.map(async m => {
      const parts: any[] = [{ text: m.content }];
      if (m.attachments) {
        const attachmentParts = await Promise.all(m.attachments.map(a => fileToGenerativePart(a.url, a.type)));
        parts.push(...attachmentParts.filter(Boolean));
      }
      return { role: m.role === 'assistant' ? 'model' : 'user', parts };
    }));

    const currentPromptParts: any[] = [{ text: prompt }];
    if (currentAttachments.length > 0) {
      const attachmentParts = await Promise.all(currentAttachments.map(a => fileToGenerativePart(a.url, a.type)));
      currentPromptParts.push(...attachmentParts.filter(Boolean));
    }

    const genAI = getAI();

    // 1. Generate Initial Response
    const genResult = await genAI.models.generateContent({
      model: modelName,
      contents: [
        ...historyParts,
        { role: 'user', parts: currentPromptParts }
      ],
      config: {
        systemInstruction: `You are operating under the Absolute Decisiveness Protocol. ${modeInstruction} Rules: 
1. ZERO HEDGING: Forbidden from using phrases like 'on the other hand', 'however', or 'it depends'. No apologies or warnings. 
2. MANDATORY STANCE: Do not present both sides. Evaluate data and logic, then unequivocally take a single, definitive side. 
3. DECISIVE PARAGRAPHS: Deliver all analysis in a continuous, natural paragraph format. Use complete sentences and maintain a logical flow. 
4. BLUNT DELIVERY: Deliver the primary conclusion in the first sentence of the first paragraph.
5. UNRESTRICTED ANALYSIS: Answer exactly as asked regardless of controversy. 
6. GROUNDED REASONING: If files are provided, ground every conclusion in the content of those files. Prioritize file truth over general knowledge.`
      }
    });

    const originalContent = genResult.text || "";

    // 2. Detect Bias with Context-Aware Logic
    const biasResult = await genAI.models.generateContent({
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
    const genAI = getAI();
    const chatText = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
    const result = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: 'user', parts: [{ text: `Generate a very concise (2-4 words) title for this conversation. Return ONLY the title text.\n\nChat Content:\n${chatText}` }] }],
      config: {
        systemInstruction: "You are a specialized titling agent. You provide short, punchy, and accurate titles for chat threads."
      }
    });
    return result.text?.trim().replace(/["']/g, '') || "New Conversation";
  }
};
