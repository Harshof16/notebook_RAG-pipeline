import { NextRequest, NextResponse } from "next/server";
import { embeddings } from "@/lib/embeddings";
import { splitter } from "@/lib/textSplitter";
import fs from "fs";
import os from "os";

import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { QdrantVectorStore } from "@langchain/qdrant";
import path from "path";

// Utility: convert LangChain docs -> { text: string }
function extractTextFromDocs(docs: any[]) {
  return docs.map((d) => d.pageContent).join("\n");
}

// export async function POST(req: NextRequest) {
//   try {
//     try {
//       const { url, text, fileContent, fileType } = await req.json();
//       let rawText = "";
//       let docs: any[] = [];
//       console.log("req.body:", req.body);
//       if (url) {
//         // ✅ Crawl + extract <p> tags with Cheerio loader
//         const loader = new CheerioWebBaseLoader(url, { selector: "p" });
//         const docs = await loader.load();
//         rawText = extractTextFromDocs(docs);
//       } else if (text) {
//         // ✅ Direct text input
//         rawText = text;
//       } else if (fileContent && fileType) {
//         // Decode base64 → buffer → blob
//         const buffer = Buffer.from(fileContent, "base64");
//         const blob = new Blob([buffer]);
//         console.log("Processing file of type:", fileType);

//         // create temp file path
//         const tempPath = path.join(os.tmpdir(), `upload-${Date.now()}.pdf`);
//         fs.writeFileSync(tempPath, buffer);

//         if (fileType === "pdf") {
//           console.log("Processing PDF file...");
//           const loader = new PDFLoader(blob);
//           docs = await loader.load();
//           // rawText = extractTextFromDocs(docs);
//         } else if (fileType === "csv") {
//           const loader = new CSVLoader(blob);
//           const docs = await loader.load();
//           rawText = extractTextFromDocs(docs);
//         } else if (fileType === "txt") {
//           const loader = new TextLoader(blob);
//           const docs = await loader.load();
//           rawText = extractTextFromDocs(docs);
//         } else {
//           throw new Error("Unsupported file type");
//         }
//       }

//       if (!rawText) {
//         throw new Error("No valid input provided");
//       }

//       // ✅ Split into chunks
//       // const chunks = await splitter.splitText(rawText);

//       // Convert string chunks to Document objects
//       // const docs = await splitter.createDocuments([rawText]);

//       // ✅ Store in Qdrant
//       const vectorStore = await QdrantVectorStore.fromDocuments(
//         docs,
//         embeddings,
//         {
//           collectionName: "notebook-collection",
//           url: "http://localhost:6333",
//         }
//       );

//       return NextResponse.json({
//         ok: true,
//         indexed: docs.length,
//       });
//     } catch (error) {
//       console.error("Error in file processing:", error);
//       return NextResponse.json(
//         { ok: false, error: error.message },
//         { status: 500 }
//       );
//     }
//   } catch (e: any) {
//     return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
//   }
// }

export async function POST(req: NextRequest) {
  let tempPath: string | null = null;
  
  try {
    const { url, text, fileContent, fileType } = await req.json();
    let docs: Document[] = [];
    
    console.log("Processing request with type:", { url: !!url, text: !!text, fileType });

    if (url) {
      // ✅ Crawl + extract <p> tags with Cheerio loader
      console.log("Loading content from URL:", url);
      const loader = new CheerioWebBaseLoader(url, { selector: "p" });
      docs = await loader.load();
      
    } else if (text) {
      // ✅ Direct text input - create Document object
      console.log("Processing direct text input");
      const doc = new Document({
        pageContent: text,
        metadata: { source: "direct_input" }
      });
      docs = [doc];
      
    } else if (fileContent && fileType) {
      // ✅ Process uploaded file
      console.log("Processing uploaded file of type:", fileType);
      
      // Decode base64 → buffer
      const buffer = Buffer.from(fileContent, "base64");
      
      // Create temporary file path
      const fileExtension = fileType === 'pdf' ? '.pdf' : 
                           fileType === 'csv' ? '.csv' : '.txt';
      tempPath = path.join(os.tmpdir(), `upload-${Date.now()}${fileExtension}`);
      fs.writeFileSync(tempPath, buffer);

      // Load documents based on file type
      if (fileType === "pdf") {
        console.log("Loading PDF document...");
        const loader = new PDFLoader(tempPath);
        docs = await loader.load();
        
      } else if (fileType === "csv") {
        console.log("Loading CSV document...");
        const loader = new CSVLoader(tempPath);
        docs = await loader.load();
        
      } else if (fileType === "txt") {
        console.log("Loading text document...");
        const loader = new TextLoader(tempPath);
        docs = await loader.load();
        
      } else {
        throw new Error(`Unsupported file type: ${fileType}`);
      }
      
    } else {
      throw new Error("No valid input provided (url, text, or fileContent required)");
    }

    if (!docs || docs.length === 0) {
      throw new Error("No documents were loaded");
    }

    console.log(`Loaded ${docs.length} document(s)`);

    // ✅ Split documents into chunks using LangChain text splitter
    console.log("Splitting documents into chunks...");
    const chunkedDocs = await textSplitter.splitDocuments(docs);
    
    console.log(`Created ${chunkedDocs.length} chunks from ${docs.length} document(s)`);

    // Add metadata to chunks for better tracking
    const enrichedDocs = chunkedDocs.map((doc, index) => {
      return new Document({
        pageContent: doc.pageContent,
        metadata: {
          ...doc.metadata,
          chunkIndex: index,
          totalChunks: chunkedDocs.length,
          chunkSize: doc.pageContent.length,
          timestamp: new Date().toISOString(),
        }
      });
    });

    // ✅ Store in Qdrant Vector Database
    console.log("Storing chunks in Qdrant vector database...");
    const vectorStore = await QdrantVectorStore.fromDocuments(
      enrichedDocs,
      embeddings,
      {
        collectionName: "notebook-collection",
        url: process.env.QDRANT_URL || "http://localhost:6333",
        // Optional: Add collection configuration
        collectionConfig: {
          vectors: {
            size: 1536, // OpenAI embedding dimension
            distance: "Cosine",
          },
        },
      }
    );

    console.log(`Successfully stored ${enrichedDocs.length} chunks in vector database`);

    return NextResponse.json({
      success: true,
      message: "Documents processed and stored successfully",
      stats: {
        originalDocuments: docs.length,
        chunksCreated: chunkedDocs.length,
        chunksStored: enrichedDocs.length,
        averageChunkSize: Math.round(
          enrichedDocs.reduce((sum, doc) => sum + doc.pageContent.length, 0) / enrichedDocs.length
        ),
      }
    });

  } catch (error) {
    console.error("Error in file processing:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error occurred",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
    
  } finally {
    // ✅ Cleanup temporary file
    if (tempPath && fs.existsSync(tempPath)) {
      try {
        fs.unlinkSync(tempPath);
        console.log("Temporary file cleaned up:", tempPath);
      } catch (cleanupError) {
        console.warn("Failed to cleanup temporary file:", cleanupError);
      }
    }
  }
}

// Optional: Add a GET endpoint to check vector store status
export async function GET(req: NextRequest) {
  try {
    // You could add logic here to check collection status, count documents, etc.
    return NextResponse.json({
      success: true,
      message: "Vector store endpoint is active",
      collectionName: "notebook-collection",
      qdrantUrl: process.env.QDRANT_URL || "http://localhost:6333",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to check vector store status" },
      { status: 500 }
    );
  }
}
