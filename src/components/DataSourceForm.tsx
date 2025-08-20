"use client";

import { useState, useRef } from "react";
import axios from "axios";
import { fileToBase64 } from "@/lib/utils";
import toast, { Toaster } from "react-hot-toast";

interface DataSourceFormProps {
    onIndexed?: () => void;
}

export default function DataSourceForm({ onIndexed = () => {} }: DataSourceFormProps) {
    const [activeTab, setActiveTab] = useState<"url" | "text" | "file">("url");
    const [url, setUrl] = useState("");
    const [text, setText] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [skeleton, setSkeleton] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [processedFile, setProcessedFile] = useState<null | {
        name: string;
        size: number;
        status: string;
        added: string;
        words: number;
        chunks: number;
    }>(null);

    const progressIntervalRef = useRef<any>(null);

    const handleTabClick = (key: "url" | "text" | "file") => {
        // Cancel any ongoing simulated progress
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
        }
        setLoading(false);
        setSkeleton(false);
        setUploadProgress(0);
        setProcessedFile(null);
        setFile(null);
        setText("");
        setUrl("");
        setActiveTab(key);
    };

    async function handleSubmit() {
        try {
            setLoading(true);
            setSkeleton(true);
            setUploadProgress(0);
            if (activeTab === "file" && file) {
                // Validate file type and size before starting
                const ext = file.name.split('.').pop()?.toLowerCase();
                const allowed = ['pdf', 'csv', 'txt'];
                const maxBytes = 10 * 1024 * 1024; // 10MB
                if (!ext || !allowed.includes(ext)) {
                    toast.error('Unsupported file type. Only PDF, CSV or TXT allowed.');
                    setLoading(false);
                    setSkeleton(false);
                    return;
                }
                if (file.size > maxBytes) {
                    toast.error('File too large. Max allowed size is 10MB.');
                    setLoading(false);
                    setSkeleton(false);
                    return;
                }
                progressIntervalRef.current = setInterval(() => {
                    setUploadProgress((prev: number) => {
                        if (prev >= 100) {
                            clearInterval(progressIntervalRef.current);
                            progressIntervalRef.current = null;
                            return 100;
                        }
                        return Math.min(100, prev + Math.random() * 10);
                    });
                }, 150);
            }
            const payload: any = {};

            if (activeTab === "url") {
                if (!url.trim()) {
                    toast.error("Please enter a URL.");
                    setLoading(false);
                    setSkeleton(false);
                    return;
                }
                payload.url = url.trim();
            } else if (activeTab === "text") {
                if (!text.trim()) {
                    toast.error("Please enter some text.");
                    setLoading(false);
                    setSkeleton(false);
                    return;
                }
                payload.text = text.trim();
            } else if (activeTab === "file") {
                if (!file) {
                    toast.error("Please select a file.");
                    setLoading(false);
                    setSkeleton(false);
                    return;
                }
                payload.fileContent = await fileToBase64(file);
                payload.fileType = file.name.split(".").pop()?.toLowerCase();
            }

            // Simulate API call and file processing
            setTimeout(async () => {
                if (progressIntervalRef.current) { clearInterval(progressIntervalRef.current); progressIntervalRef.current = null; }
                setUploadProgress(100);
                // Simulate processed file details
                if (activeTab === "file" && file) {
                    setProcessedFile({
                        name: file.name,
                        size: file.size,
                        status: "processed",
                        added: new Date().toLocaleDateString(),
                        words: Math.floor(file.size / 1000), // Simulate word count
                        chunks: Math.max(1, Math.floor(file.size / 1024 / 1024)), // Simulate chunk count
                    });
                }
                setLoading(false);
                setSkeleton(false);
                // For url/text, clear the input after indexing. For file, keep processedFile until dismissed
                if (activeTab === 'url') setUrl('');
                if (activeTab === 'text') setText('');

                toast.success("Upload successful!");
                onIndexed();
            }, 1800);

            // Uncomment for real API call
            // const res = await axios.post("/api/upload", payload);
            // if (res.data.ok) {
            //     toast.success("Upload successful!");
            //     onIndexed();
            //     setUrl("");
            //     setText("");
            //     setFile(null);
            // } else {
            //     toast.error("Upload failed. Please try again.");
            // }
        } catch (err: any) {
            toast.error("Error uploading: " + (err?.message || "Unknown error"));
            setLoading(false);
            setSkeleton(false);
        }
    }
    // simulateProgress kept for reference (not used directly)

    const getFileIcon = (fileName: string | undefined) => {
        const ext = fileName?.split('.').pop()?.toLowerCase();
        if (ext === 'pdf') return '📄';
        if (ext === 'csv') return '📊';
        if (ext === 'txt') return '📝';
        return '📋';
    };

    // ...existing code...

         return (
        <div className="min-h-[400px] flex flex-col justify-between bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-sm rounded-3xl shadow-2xl shadow-cyan-500/10 p-8 text-white w-full max-w-lg mx-auto border border-slate-700/50 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-pink-500/5 animate-pulse" />
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-cyan-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gradient-to-tr from-purple-400/20 to-pink-600/20 rounded-full blur-3xl animate-pulse" />
            
            <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-3 h-3 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full animate-pulse" />
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                        Upload Content
                    </h2>
                </div>

                <div className="flex gap-1 mb-8 bg-slate-800/50 p-1 rounded-2xl backdrop-blur-sm border border-slate-700/30">
                    {([
                        { key: 'url', label: 'Website', icon: '🌐' },
                        { key: 'text', label: 'Text', icon: '📝' },
                        { key: 'file', label: 'File', icon: '📁' }
                    ] as { key: "url" | "text" | "file"; label: string; icon: string }[]).map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => handleTabClick(tab.key)}
                            className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2 group relative overflow-hidden
                                ${activeTab === tab.key
                                    ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/25 scale-105"
                                    : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                                }`}
                        >
                            <span className="text-sm">{tab.icon}</span>
                            <span className="text-sm">{tab.label}</span>
                            {activeTab === tab.key && (
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/20 to-blue-500/20 animate-pulse" />
                            )}
                        </button>
                    ))}
                </div>


                <div className="mb-8">
                    {activeTab === 'url' && (
                        <div className="relative group">
                            <input
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                placeholder="https://example.com"
                                className="w-full p-4 rounded-xl bg-slate-800/50 text-white border border-slate-600/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 backdrop-blur-sm transition-all duration-300 group-hover:border-slate-500/50"
                                disabled={loading}
                            />
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                        </div>
                    )}

                    {activeTab === 'text' && (
                        <div className="relative group">
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Paste your text content here..."
                                className="w-full p-4 rounded-xl bg-slate-800/50 text-white border border-slate-600/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 backdrop-blur-sm transition-all duration-300 group-hover:border-slate-500/50 resize-none"
                                rows={6}
                                disabled={loading}
                            />
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                            <div className="absolute bottom-3 right-3 text-xs text-slate-400">
                                {text.length} characters
                            </div>
                        </div>
                    )}

                    {activeTab === 'file' && (
                        <div className="space-y-4">
                            {!processedFile && <div className="relative group">
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-600/50 rounded-xl cursor-pointer bg-slate-800/30 hover:bg-slate-700/30 transition-all duration-300 group-hover:border-cyan-500/50">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <span className="text-3xl mb-2">📁</span>
                                        <p className="mb-2 text-sm text-slate-300">
                                            <span className="font-semibold">Click to upload</span> 
                                            {/* or drag and drop */}
                                        </p>
                                        <p className="text-xs text-slate-400">PDF, CSV, or TXT (MAX. 10MB)</p>
                                    </div>
                                    <input
                                        type="file"
                                        accept=".pdf,.csv,.txt"
                                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                                        className="hidden"
                                        disabled={loading}
                                    />
                                </label>
                            </div>}
                            
                            {file && !processedFile && (
                                <div className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-xl border border-slate-600/30 backdrop-blur-sm">
                                    <span className="text-lg">{getFileIcon(file.name)}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-white truncate">{file.name}</p>
                                        <p className="text-xs text-slate-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                                    </div>
                                    <button
                                        onClick={() => setFile(null)}
                                        className="text-slate-400 hover:text-red-400 transition-colors duration-200 cursor-pointer"
                                        disabled={loading}
                                        aria-disabled={loading}
                                        title="Remove file"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {loading && (
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-slate-300">Processing...</span>
                            <span className="text-sm text-cyan-400">{Math.round(uploadProgress)}%</span>
                        </div>
                        <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300 ease-out rounded-full"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Processed file details UI */}
                {processedFile && (
                    <div className="mb-6">
                        <div className="flex items-center gap-3 p-4 bg-slate-800/60 rounded-xl border border-slate-700/40 shadow-lg">
                            <span className="text-2xl">{getFileIcon(processedFile.name)}</span>
                            <div className="flex-1 min-w-0">
                                <p className="text-base font-semibold text-white truncate">{processedFile.name}</p>
                                <div className="flex gap-2 items-center mt-1">
                                    <span className="px-2 py-1 rounded bg-green-700/80 text-green-200 text-xs font-bold">{processedFile.status}</span>
                                    <span className="text-xs text-slate-400">{(processedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                                </div>
                                <div className="text-xs text-slate-400 mt-1">Added {processedFile.added}</div>
                                <div className="text-xs text-slate-400 mt-1">{processedFile.words} words • {processedFile.chunks} chunks</div>
                            </div>
                            <button
                                onClick={() => { setProcessedFile(null); setFile(null); setUploadProgress(0); }}
                                className="text-slate-400 cursor-pointer hover:text-red-400 transition-colors duration-200"
                                title="Dismiss processed file"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <button
                onClick={handleSubmit}
                disabled={loading || (activeTab === 'file' && !!processedFile)}
                className={`relative px-6 py-4 bg-gradient-to-r cursor-pointer from-cyan-500 to-blue-500 rounded-xl font-bold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all duration-300 flex items-center justify-center group overflow-hidden ${
                    loading || (activeTab === 'file' && !!processedFile)
                        ? "opacity-50 cursor-not-allowed scale-95"
                        : "hover:scale-105 active:scale-95"
                }`}
                style={
                    loading || (activeTab === 'file' && !!processedFile)
                        ? { pointerEvents: "none" }
                        : undefined
                }
            >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center gap-2">
                    {loading ? (
                        <>
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                            <span>Indexing Content...</span>
                        </>
                    ) : (
                        <>
                            <span>🚀</span>
                            <span>Upload & Index</span>
                        </>
                    )}
                </div>
            </button>
        </div>
    );
}
