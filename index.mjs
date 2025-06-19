import { Ragie } from "ragie";
import OpenAI from "openai";
import dotenv from "dotenv";
import readline from "readline";
dotenv.config();

// Initialize clients with API keys
const ragie = new Ragie({ auth: process.env.RAGIE_API_KEY});
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Function to get user query
function getUserQuery() {
  return new Promise((resolve) => {
    rl.question('Enter your query: ', (answer) => {
      resolve(answer);
    });
  });
}

// Get query from user
const userQuery = await getUserQuery();
rl.close();

if (!userQuery.trim()) {
  console.log("No query provided. Exiting.");
  process.exit(0);
}

console.log(`\nSearching for: "${userQuery}"\n`);

// 1. Retrieve relevant chunks from Ragie
const response = await ragie.retrievals.retrieve({
  query: userQuery,
//   filter: {
//     // optionally filter by metadata or partition
//     source: { $eq: "sharepoint" }
//   }
});
const chunks = response.scoredChunks; 

console.log(`Retrieved ${chunks.length} chunks from Ragie.`);
for (const chunk of chunks) {
  console.log("- Chunk snippet:", chunk.text.substring(0, 100), "...");
}

if (chunks.length === 0) {
    console.log("No relevant content found for the query.");
    process.exit(0);
}
  
// Prepare a system message with instructions and context
const chunkTexts = chunks.map(c => c.text).join("\n\n");
const systemMessage = `
You are an AI assistant using the organization's knowledge base to answer questions. Use ONLY the information provided in the context below to formulate your response.

Guidelines for your responses:
- If you are unsure or the answer is not clearly supported by the context, explicitly state "I don't know" or "This information is not available in the provided documents"
- Always cite specific documents, sections, or sources when referencing information from the context
- When possible, include document titles, page numbers, or other identifying information in your citations
- Structure your answer clearly, separating your main response from your source citations
- If multiple documents contain relevant information, synthesize the information while maintaining clear attribution to each source
- Avoid speculation or inference beyond what is directly stated in the provided context
- If the context contains conflicting information, acknowledge the discrepancy and cite both sources
Context:
${chunkTexts}
`;

// Call OpenAI Chat Completion API (GPT-4 model) with the system message and user query
try {
  const chatCompletion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userQuery }
    ]
  });
  const answer = chatCompletion.choices[0].message.content;
  console.log("\n**Answer:**\n", answer);
} catch (err) {
  console.error("Failed to get completion from OpenAI:", err);
}
