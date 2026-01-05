import { GoogleGenAI, Type } from "@google/genai";

// Ensure the API key is retrieved from the environment variable as per strict guidelines
const apiKey = process.env.API_KEY || ''; 

// We use the new instance for each call to ensure fresh config if needed, 
// though typically one instance is fine. The guidelines suggest creating it before calls.

export const analyzeProjectStructure = async (filePaths: string[]): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing.");

  const ai = new GoogleGenAI({ apiKey });
  
  // Truncate list if too long to avoid token limits in a demo
  const limitedPaths = filePaths.slice(0, 100); 
  const prompt = `
    Analyze this list of file paths from a project folder:
    ${JSON.stringify(limitedPaths)}

    1. Identify the primary programming language and framework.
    2. Describe the likely architectural pattern (e.g., MVC, Microservices, React SPA).
    3. Determine if this is a Java, Python, PHP, or Node.js project based on structure.
    
    Keep the response concise, under 100 words.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', // Good for fast text analysis
      contents: prompt,
    });
    return response.text || "Analysis failed to produce text.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Failed to analyze project structure. Please check your API key or network connection.";
  }
};

export const translateCode = async (
  sourceCode: string, 
  sourceLang: string, 
  targetLang: string, 
  filename: string
): Promise<string> => {
  if (!apiKey) throw new Error("API Key is missing.");
  if (!sourceCode.trim()) return "";

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    You are an expert polyglot programmer. 
    Task: Convert the following code file named "${filename}" from ${sourceLang} to ${targetLang}.
    
    Rules:
    1. Maintain the original logic and functionality.
    2. Adapt to the idioms and best practices of the target language (e.g., naming conventions).
    3. If a direct translation isn't possible, add a comment explaining why.
    4. Return ONLY the code. Do not include markdown backticks (like \`\`\`) or conversational text.

    Source Code:
    ${sourceCode}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Better for complex coding tasks
      contents: prompt,
    });
    
    let text = response.text || "";
    // Clean up if the model adds markdown despite instructions
    text = text.replace(/^```[a-z]*\n/i, '').replace(/\n```$/, '');
    return text;
  } catch (error) {
    console.error("Gemini Translation Error:", error);
    return `// Error translating file: ${filename}\n// ${error}`;
  }
};