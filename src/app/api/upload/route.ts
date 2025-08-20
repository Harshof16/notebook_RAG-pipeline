import { NextRequest, NextResponse } from "next/server";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { QdrantVectorStore } from "@langchain/qdrant";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document as LangchainDocument } from "langchain/document";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { TextLoader } from "langchain/document_loaders/fs/text";

// Type definitions for better TypeScript support
type DocumentType = LangchainDocument<Record<string, any>>;

// Initialize embeddings
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
});

// ✅ IMPORTANT: Initialize text splitter for chunking
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ["\n\n", "\n", " ", ""],
});

export async function POST(req: NextRequest) {
  let tempPath: string | null = null;
  
  try {
    const { url, text, fileContent, fileType } = await req.json();
    let docs: DocumentType[] = [];
    
    console.log("Processing request with type:", { url: !!url, text: !!text, fileType });

    if (url) {
      console.log("Loading content from URL:", url);
      const loader = new CheerioWebBaseLoader(url, { selector: "p" });
      docs = await loader.load();
      
    } else if (text) {
      console.log("Processing direct text input");
      docs = [new LangchainDocument({ 
        pageContent: text,
        metadata: { source: "direct_input" }
      })];
      
    } else if (fileContent && fileType) {
      console.log("Processing uploaded file of type:", fileType);
      
      // Clean base64 string - remove data URL prefix if present
      let cleanBase64 = fileContent;
      if (fileContent.includes(',')) {
        const parts = fileContent.split(',');
        if (parts.length > 1) {
          cleanBase64 = parts[1];
          console.log("Removed data URL prefix");
        }
      }
      
      // Remove any whitespace
      cleanBase64 = cleanBase64.replace(/\s/g, '');
      
      // Decode base64 → buffer
      const buffer = Buffer.from(cleanBase64, "base64");
      console.log("Decoded buffer size:", buffer.length, "bytes");
      
      // Load documents based on file type
      if (fileType === "pdf") {
        console.log("Loading PDF document...");
        
        // Enhanced PDF validation
        if (buffer.length < 1024) {
          throw new Error(`PDF file too small: ${buffer.length} bytes`);
        }
        
        const header = buffer.toString('utf8', 0, 8);
        if (!header.startsWith('%PDF-')) {
          throw new Error(`Invalid PDF header: "${header}"`);
        }
        
        // Create temporary file for PDF
        tempPath = path.join(os.tmpdir(), `upload-${Date.now()}.pdf`);
        fs.writeFileSync(tempPath, buffer);
        
        const loader = new PDFLoader(tempPath);
        docs = await loader.load();
        
      } else if (fileType === "csv") {
        console.log("Loading CSV document...");
        tempPath = path.join(os.tmpdir(), `upload-${Date.now()}.csv`);
        fs.writeFileSync(tempPath, buffer);
        
        const loader = new CSVLoader(tempPath);
        docs = await loader.load();
        
      } else if (fileType === "txt") {
        console.log("Loading text document...");
        tempPath = path.join(os.tmpdir(), `upload-${Date.now()}.txt`);
        fs.writeFileSync(tempPath, buffer);
        
        const loader = new TextLoader(tempPath);
        docs = await loader.load();
        
      } else {
        throw new Error(`Unsupported file type: ${fileType}`);
      }
      
    } else {
      throw new Error("No valid input provided");
    }

    if (!docs || docs.length === 0) {
      throw new Error("No documents were loaded");
    }

    console.log(`Loaded ${docs.length} document(s)`);

    // ✅ CRITICAL: Split documents into chunks
    console.log("Splitting documents into chunks...");
    const chunkedDocs = await textSplitter.splitDocuments(docs);
    console.log(`Created ${chunkedDocs.length} chunks from ${docs.length} document(s)`);

    // Add enhanced metadata to chunks
    const enrichedDocs: DocumentType[] = chunkedDocs.map((doc, index) => {
      return new LangchainDocument({
        pageContent: doc.pageContent,
        metadata: {
          ...doc.metadata,
          chunkIndex: index,
          totalChunks: chunkedDocs.length,
          chunkSize: doc.pageContent.length,
          timestamp: new Date().toISOString(),
          fileType: fileType || 'unknown',
        }
      });
    });

    // ✅ Store in Qdrant Vector Database
    console.log("Storing chunks in Qdrant vector database...");
    const vectorStore = await QdrantVectorStore.fromDocuments(
      enrichedDocs, // Use chunked docs, not original docs
      embeddings,
      {
        collectionName: "notebook-collection",
        url: process.env.QDRANT_URL || "http://localhost:6333",
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
    // Cleanup temporary file
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