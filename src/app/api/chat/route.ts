import { NextRequest, NextResponse } from "next/server";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";

// Initialize embeddings (must match upload route)
const chatEmbeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();

    if (!query || query.trim() === "") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    console.log("Received query:", query);

    // ✅ Connect to existing Qdrant collection
    const vectorStore = await QdrantVectorStore.fromExistingCollection(
      chatEmbeddings,
      {
        collectionName: "notebook-collection",
        url: process.env.QDRANT_URL || "http://localhost:6333",
        apiKey: process.env.QDRANT_API_KEY || "",
      }
    );

    // ✅ Test retriever first
    const retriever = vectorStore.asRetriever({
      k: 5, // Get more chunks for better context
      searchType: "similarity",
    });

    console.log("Testing retriever...");
    const relevantChunks = await retriever.invoke(query);
    console.log(`Retrieved ${relevantChunks.length} relevant chunks`);
    
    // Debug retrieved chunks
    relevantChunks.forEach((chunk, idx) => {
      console.log(`Chunk ${idx + 1}:`, {
        size: chunk.pageContent.length,
        metadata: chunk.metadata,
        preview: chunk.pageContent.substring(0, 150) + '...'
      });
    });

    if (relevantChunks.length === 0) {
      return NextResponse.json({
        answer: "I couldn't find any relevant information in the uploaded documents to answer your question.",
        chunks: 0
      });
    }

    // ✅ Format context properly
    const context = relevantChunks.map((doc, idx) => {
      const metadata = doc.metadata || {};
      return `--- Chunk ${idx + 1} ---
Source: ${metadata.source || 'Unknown'}
Content: ${doc.pageContent}`;
    }).join("\n\n");

    // ✅ Complete prompt template
    const prompt = PromptTemplate.fromTemplate(`
You are an AI assistant helping users understand their uploaded documents.

Instructions:
- Answer ONLY based on the provided context from the documents
- Be specific and reference relevant information from the context
- If the context doesn't contain enough information, say so clearly
- Provide accurate, helpful responses

Context from Documents:
{context}

User Question: {question}

Answer:`);

    // ✅ LangChain approach (recommended)
    const llm = new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0.2,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    const chain = RunnableSequence.from([
      {
        context: async (input: { question: string }) => {
          const docs = await retriever.invoke(input.question);
          return docs.map((d, idx) => {
            // const metadata = d.metadata || {};
            return `[Document ${idx + 1}] ${d.pageContent}`;
          }).join("\n\n");
        },
        question: (input: { question: string }) => input.question,
      },
      prompt,
      llm,
      new StringOutputParser(),
    ]);

    const finalAnswer = await chain.invoke({ question: query });

    console.log("Final Answer:", finalAnswer);

    return NextResponse.json({
      success: true,
      answer: finalAnswer,
      chunksRetrieved: relevantChunks.length,
      debug: {
        contextLength: context.length,
        chunkSizes: relevantChunks.map(c => c.pageContent.length)
      }
    });

  } catch (error: unknown) {
    console.error("Error in chat processing:", error);

    let errorMessage = "Something went wrong";
    let errorStack = undefined;

    if (error instanceof Error) {
      errorMessage = error.message;
      errorStack = error.stack;
    }

    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        details: errorStack
      },
      { status: 500 }
    );
  }
}