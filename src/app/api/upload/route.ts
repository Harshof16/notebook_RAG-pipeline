import { NextRequest, NextResponse } from "next/server";

import { TextLoader } from "langchain/document_loaders/fs/text";

import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { QdrantVectorStore } from "@langchain/qdrant";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document as LangchainDocument } from "langchain/document";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";

// Type definitions for better TypeScript support
type DocumentType = LangchainDocument<Record<string, any>>;

// Initialize embeddings (make sure to set your OpenAI API key)
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// Initialize text splitter with optimal settings
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ["\n\n", "\n", " ", ""],
});

// Helper function to extract text from documents (keeping your original logic)
function extractTextFromDocs(docs: DocumentType[]): string {
  return docs.map(doc => doc.pageContent).join("\n");
}

export async function POST(req: NextRequest) {
  let tempPath: string | null = null;
  
  try {
    const { url, text, fileContent, fileType } = await req.json();
    let docs: DocumentType[] = [];
    
    console.log("Processing request with type:", { url: !!url, text: !!text, fileType });

    if (url) {
      // ✅ Crawl + extract <p> tags with Cheerio loader
      console.log("Loading content from URL:", url);
      const loader = new CheerioWebBaseLoader(url, { selector: "p" });
      docs = await loader.load();
      
    } else if (text) {
      // ✅ Direct text input - create Document object
      console.log("Processing direct text input");
      docs = [new LangchainDocument({ 
        pageContent: text,
        metadata: { source: "direct_input" }
      })];
      
    } else if (fileContent && fileType) {
      // ✅ Process uploaded file
      console.log("Processing uploaded file of type:", fileType);
      
      // Decode base64 → buffer
      const buffer = Buffer.from(fileContent, "base64");
      
      // Validate PDF structure for debugging
      if (fileType === "pdf") {
        console.log("Buffer size:", buffer.length);
        console.log("First 10 bytes:", buffer.slice(0, 10));
        console.log("PDF header check:", buffer.toString('utf8', 0, 4) === '%PDF');
        
        if (buffer.length < 100) {
          throw new Error("PDF file appears to be too small or corrupted");
        }
        
        if (buffer.toString('utf8', 0, 4) !== '%PDF') {
          throw new Error("Invalid PDF header - file may not be a valid PDF");
        }
      }
      
      // Load documents based on file type
      if (fileType === "pdf") {
        console.log("Loading PDF document...");
        
        // Try multiple approaches for PDF loading
        try {
          // Approach 1: Create a proper Blob with correct MIME type
          const pdfBlob = new Blob([buffer], { type: 'application/pdf' });
          const loader = new PDFLoader(pdfBlob);
          docs = await loader.load();
        } catch (blobError) {
          console.warn("Blob approach failed, trying file path approach:", blobError);
          
          // Approach 2: Write to temporary file
          const fileExtension = '.pdf';
          tempPath = path.join(os.tmpdir(), `upload-${Date.now()}${fileExtension}`);
          fs.writeFileSync(tempPath, buffer);
          
          const loader = new PDFLoader(tempPath);
          docs = await loader.load();
        }
        
      } else if (fileType === "csv") {
        console.log("Loading CSV document...");
        // For CSV, create temporary file
        const fileExtension = '.csv';
        tempPath = path.join(os.tmpdir(), `upload-${Date.now()}${fileExtension}`);
        fs.writeFileSync(tempPath, buffer);
        
        const loader = new CSVLoader(tempPath);
        docs = await loader.load();
        
      } else if (fileType === "txt") {
        console.log("Loading text document...");
        // For text files, we can use the buffer directly or create a blob
        try {
          const textBlob = new Blob([buffer], { type: 'text/plain' });
          const loader = new TextLoader(textBlob);
          docs = await loader.load();
        } catch (blobError) {
          // Fallback to file approach
          const fileExtension = '.txt';
          tempPath = path.join(os.tmpdir(), `upload-${Date.now()}${fileExtension}`);
          fs.writeFileSync(tempPath, buffer);
          
          const loader = new TextLoader(tempPath);
          docs = await loader.load();
        }
        
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
    const enrichedDocs: DocumentType[] = chunkedDocs.map((doc, index) => {
      return new LangchainDocument({
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
        url: "http://localhost:6333",
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
      qdrantUrl: "http://localhost:6333",
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to check vector store status" },
      { status: 500 }
    );
  }
}