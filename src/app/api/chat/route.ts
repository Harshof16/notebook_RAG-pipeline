// app/api/chat/route.ts
import { NextResponse } from "next/server";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";

export async function POST(req: Request) {
  try {
    const { query } = await req.json();

    if (!query || query.trim() === "") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // 1. Ready the client OpenAI Embedding Model
    const embeddings = new OpenAIEmbeddings({
      model: "text-embedding-3-small",
    });

    // 2. Load existing Qdrant collection
    const vectorStore = await QdrantVectorStore.fromExistingCollection(
      embeddings,
      {
        collectionName: "notebook-collection",
        url: "http://localhost:6333", // Qdrant instance URL
      }
    );

    // 3. Prepare retriever
    const retriever = vectorStore.asRetriever({
      k: 3, // number of chunks to fetch
    });

    // 4. Define LLM (ChatGPT model)
    const llm = new ChatOpenAI({
      model: "gpt-4o-mini", // or gpt-4, gpt-3.5-turbo
    //   temperature: 0.2,
    });

    // 5. Define a prompt template
    const prompt = PromptTemplate.fromTemplate(`
You are an AI assistant who helps resolving user query based on the
    context available to you from a PDF file with the content and page number.

    Only answer based on the available context from file only.

    Context:`);

    // 6. Build chain (Retriever → Prompt → LLM → Output)
    const chain = RunnableSequence.from([
      {
        context: async (input: { question: string }) => {
          const docs = await retriever.invoke(input.question);
          return docs.map((d) => d.pageContent).join("\n\n");
        },
        question: (input: { question: string }) => input.question,
      },
      prompt,
      llm,
      new StringOutputParser(),
    ]);

    // 7. Run chain
    const finalAnswer = await chain.invoke({ question: query });

    return NextResponse.json({
      answer: finalAnswer,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
