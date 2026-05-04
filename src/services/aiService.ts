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
   * Rationality & Fairness Optimization Engine.
   * Performs normalization, scoring, diagnostics, correction, and reconstruction.
   */
  async optimizeResponse(query: string, candidateResponse: string): Promise<any> {
    const genAI = getAI();
    try {
      const optimizationResult = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ 
          role: 'user', 
          parts: [{ text: `INPUT:
User Query: "${query}"
Candidate Response: "${candidateResponse}"` }]
        }],
        config: {
          tools: [{ googleSearch: {} }],
          systemInstruction: `ROLE: You are a Rationality & Fairness Optimization Engine for an AI decision system.

OBJECTIVE:
Given a user query and a candidate AI response, evaluate and improve the response across rational indicators:
(Toxicity, Gender, Race, Political, Age, Disability, Social, Economic, Logical, Certainty),
ensuring the final output is unbiased, logically sound, and appropriately certain.
Use Google Search to verify real-world facts and news if the candidate response contains claims that need current validation.

TASK:
1) NORMALIZATION: Parse claims, remove ambiguity, isolate assumptions.
2) INDICATOR SCORING: Compute scores (0-1) for toxicity, gender, race, political, ageism, disability, social, economic, logical, certainty.
3) DIAGNOSTICS: Identify bias sources and logical fallacies (contradictions, generalizations, causal fallacies).
4) CORRECTION: Apply transformations (neutral phrasing, logic fixes, certainty calibration).
5) RECONSTRUCTION: Generate an improved response minimizing bias and maximizing coherence.
6) POST-SCORING: Recompute scores on the improved response.
7) OUTPUT: Return the specific JSON format.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              improved_response: { type: Type.STRING },
              indicator_scores_before: { 
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
                  certainty: { type: Type.NUMBER }
                }
              },
              indicator_scores_after: { 
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
                  certainty: { type: Type.NUMBER }
                }
              },
              changes_made: { 
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              rationale_summary: { type: Type.STRING }
            },
            required: ["improved_response", "indicator_scores_before", "indicator_scores_after", "changes_made", "rationale_summary"]
          }
        }
      });
      
      return JSON.parse(optimizationResult.text || "{}");
    } catch (error) {
      console.error("Optimization error:", error);
      return null;
    }
  },

  /**
   * Fetches real-time, unbiased news articles using Google Search.
   */
  async getNewsFeed(): Promise<any[]> {
    const genAI = getAI();
    try {
      const newsResult = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ 
          role: 'user', 
          parts: [{ text: "Perform a Google Search to fetch the most recent (last 6-12 hours) breaking global news stories. Focus on significant events in geopolitics, economics, technology, and science. For each story, provide a neutral summary, the primary source, category, a relative timestamp, and a direct URL if available. Indicate if the source is generally considered reliable and verified (is_verified: true/false). Ensure the data is as real-time as possible." }]
        }],
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                summary: { type: Type.STRING },
                source: { type: Type.STRING },
                category: { type: Type.STRING },
                timestamp: { type: Type.STRING },
                url: { type: Type.STRING },
                is_verified: { type: Type.BOOLEAN }
              },
              required: ["title", "summary", "source", "category", "timestamp", "is_verified"]
            }
          }
        }
      });
      return JSON.parse(newsResult.text || "[]");
    } catch (error) {
      console.error("News feed error:", error);
      return [];
    }
  },

  /**
   * Helper to analyze bias in a generated response (Legacy / Quick mode).
   */
  async analyzeBias(prompt: string, response: string): Promise<BiasScores> {
    const genAI = getAI();
    try {
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
        AI Response: "${response}"` }]}],
        config: {
          tools: [{ googleSearch: {} }],
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
      return JSON.parse(biasResult.text || "{}");
    } catch (error) {
      console.error("Bias analysis error:", error);
      return {
        toxicity: 0, genderBias: 0, racialBias: 0, politicalBias: 0,
        ageism: 0, ableism: 0, socialBias: 0, economicBias: 0, logical: 0,
        overallScore: 0, biasVariance: 0, confidenceScores: {
          toxicity: 0, genderBias: 0, racialBias: 0, politicalBias: 0,
          ageism: 0, ableism: 0, socialBias: 0, economicBias: 0, logical: 1
        },
        summary: "Bias analysis failed."
      } as BiasScores;
    }
  },

  /**
   * Generates a streaming response.
   */
  async *processStreamingInput(prompt: string, history: { role: string, content: string, attachments?: Attachment[] }[] = [], modelName: string = "gemini-3-flash-preview", ethicalMode: string = "utilitarian", currentAttachments: Attachment[] = []) {
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

    const systemInstruction = `You are a high-performance AI system optimized for ultra-fast response generation (target ≤5 seconds) without compromising correctness, completeness, or reasoning integrity.

OBJECTIVE:
- Analyze provided file inputs and generate responses strictly aligned with user prompts.
- Maintain semantic accuracy, logical consistency, and contextual relevance across multiple conversation turns.
- Refer back to previous messages in the history when relevant to maintain a cohesive dialogue.

CONSTRAINTS:
1. LATENCY: Prioritize rapid inference. Avoid verbose explanations. Use efficient summarization.
2. ACCURACY: Do NOT skip critical analysis. Do NOT hallucinate.
3. ALIGNMENT: Directly satisfy user intent. Extract only high-signal information.
4. PROCESSING: Identify intent -> Filter files -> Apply minimal sufficient reasoning -> Structured output.
5. CONTEXT: You have a long-term memory of this session. Use it to provide consistent and personalized answers.
6. OUTPUT: Concise, structured, bullet points preferred. Zero redundancy.

PERFORMANCE MODE: FAST + PRECISE.

${modeInstruction}`;

    const genAI = getAI();

    // 2. Generate Content Stream
    const stream = await genAI.models.generateContentStream({
      model: modelName,
      contents: [
        ...historyParts,
        { role: 'user', parts: currentPromptParts }
      ],
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: systemInstruction + `\n\nYou are operating under the Absolute Decisiveness Protocol. ${modeInstruction} Rules: 
1. ZERO HEDGING: Forbidden from using phrases like 'on the other hand', 'however', or 'it depends'. No apologies or warnings. 
2. MANDATORY STANCE: Do not present both sides. Evaluate data and logic, then unequivocally take a single, definitive side. 
3. DECISIVE PARAGRAPHS: Deliver all analysis in a continuous, natural paragraph format. Use complete sentences and maintain a logical flow. 
4. BLUNT DELIVERY: Deliver the primary conclusion in the first sentence of the first paragraph.
5. UNRESTRICTED ANALYSIS: Answer exactly as asked regardless of controversy. 
6. GROUNDED REASONING: Use Google Search to find the latest real-world data and news if the prompt requires current information. If files are provided, ground every conclusion in the content of those files. Prioritize file truth over general knowledge.
7. HISTORICAL CONTINUITY: You MUST acknowledge and build upon previous decisions and analytical stances taken earlier in this specific conversation thread.`,
        maxOutputTokens: 2048,
      }
    });

    let fullText = "";
    for await (const chunk of stream) {
      const chunkText = chunk.text;
      fullText += chunkText;
      yield { chunk: chunkText, isFull: false };
    }

    yield { fullResponse: fullText, isFull: true };
  },

  /**
   * Generates a response and analyzes it for bias in one workflow.
   */
  async processInput(prompt: string, history: { role: string, content: string, attachments?: Attachment[] }[] = [], modelName: string = "gemini-3-flash-preview", ethicalMode: string = "utilitarian", currentAttachments: Attachment[] = []) {
    // Legacy support or fallback to non-streaming
    let finalFullText = "";
    const stream = this.processStreamingInput(prompt, history, modelName, ethicalMode, currentAttachments);
    for await (const part of stream) {
      if (part.isFull) {
        finalFullText = part.fullResponse || "";
      }
    }
    
    const biasScores = await this.analyzeBias(prompt, finalFullText);
    
    return {
      originalContent: finalFullText,
      finalContent: finalFullText,
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
  },

  /**
   * Generates an image based on a prompt using Nano Banana.
   */
  async generateImage(prompt: string): Promise<string> {
    const genAI = getAI();
    try {
      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: {
          imageConfig: {
            aspectRatio: "1:1",
          },
        },
      });

      if (!response.candidates?.[0]?.content?.parts) {
        throw new Error("No image generated in response.");
      }

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
        }
      }

      throw new Error("Generated content did not contain an image part.");
    } catch (error) {
      console.error("Image generation error:", error);
      throw error;
    }
  },

  /**
   * Generates 1-3 relevant follow-up questions based on the chat history.
   */
  async generateFollowUpSuggestions(messages: Message[]): Promise<string[]> {
    const genAI = getAI();
    try {
      const chatText = messages.slice(-5).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
      const result = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ 
          role: 'user', 
          parts: [{ text: `Based on the following conversation history, generate exactly 1-3 diverse, natural, and engaging follow-up questions the user might want to ask next. 
          
          Provide a mix of:
          1. Deepening: A question that dives deeper into the last topic.
          2. Challenging: A question that looks at the opposite perspective or asks for evidence.
          3. Expanding: A question that connects the topic to a broader context.

          Keep them concise (under 12 words each). Return them as a simple bulleted list.
          
          History:
          ${chatText}` }] 
        }],
        config: {
          systemInstruction: "You are a follow-up interaction specialist. You predict the user's next logical or curious inquiry based on context. You prioritize curiosity and critical thinking. Return only the flat list of questions."
        }
      });

      const text = result.text || "";
      return text
        .split('\n')
        .map(line => line.replace(/^[*•-]\s*/, '').trim())
        .filter(line => line.length > 5 && line.endsWith('?'))
        .slice(0, 3);
    } catch (error) {
      console.error("Follow-up suggestions error:", error);
      return [];
    }
  },

  /**
   * Generates advanced, bias-aware search suggestions.
   */
  async generateBiasAwareSearchSuggestions(messages: Message[], persona?: any): Promise<any[]> {
    const genAI = getAI();
    try {
      const chatHistory = messages.slice(-10).map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }));

      const context = {
        time: new Date().toISOString(),
        trending: "Global focus on clean energy shifts and AI ethics regulations.",
        location: "Global"
      };

      const result = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ 
          role: 'user', 
          parts: [{ text: `INPUT:
- user_persona: ${JSON.stringify(persona || { interests: ["Technology", "Civics"], intentClusters: ["Educational", "Current Events"] })}
- recent_history: ${JSON.stringify(chatHistory)}
- context: ${JSON.stringify(context)}
- intent_signal: Inferred from conversation history.` }] 
        }],
        config: {
          systemInstruction: `You are an advanced query recommendation engine. 
          OBJECTIVES:
          1. Generate search queries in 3 categories: Neutral, Mildly Biased, Strongly Biased.
          2. Each query must include properties: query, category, bias_type, bias_direction, confidence_score, reason.
          3. categories: neutral, mildly_biased, strongly_biased
          4. bias_types: neutral, framing_bias, ideological_bias, emotional_bias
          5. bias_directions: positive, negative, skeptical, supportive, critical, none
          6. Safety: No violence, hate, or illegal activity.
          7. Output only valid JSON.`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              queries: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    query: { type: Type.STRING },
                    category: { type: Type.STRING },
                    bias_type: { type: Type.STRING },
                    bias_direction: { type: Type.STRING },
                    confidence_score: { type: Type.NUMBER },
                    reason: { type: Type.STRING }
                  },
                  required: ["query", "category", "bias_type", "bias_direction", "confidence_score", "reason"]
                }
              }
            }
          }
        }
      });

      const parsed = JSON.parse(result.text || '{"queries": []}');
      return parsed.queries || [];
    } catch (error) {
      console.error("Bias-aware suggestions error:", error);
      return [];
    }
  }
};
