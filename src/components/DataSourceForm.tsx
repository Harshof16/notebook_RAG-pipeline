"use client";

import { useState } from "react";
import axios from "axios";
import { fileToBase64 } from "@/lib/utils";

export default function DataSourceForm({ onIndexed }: { onIndexed: () => void }) {
    const [activeTab, setActiveTab] = useState<"url" | "text" | "file">("url");
    const [url, setUrl] = useState("");
    const [text, setText] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit() {
        try {
            setLoading(true);
            const payload: any = {};

            if (activeTab === "url") {
                payload.url = url;
            } else if (activeTab === "text") {
                payload.text = text;
            } else if (activeTab === "file" && file) {
                // Fix: Convert file to base64 properly
                console.log("Converting file to base64...", {
                    name: file.name,
                    size: file.size,
                    type: file.type
                });

                payload.fileContent = await fileToBase64(file);
                payload.fileType = file.name.split(".").pop()?.toLowerCase();

                console.log("File converted:", {
                    base64Length: payload.fileContent.length,
                    fileType: payload.fileType
                });
            }

            console.log("Sending payload to server...");
            const res = await axios.post("/api/upload", payload);
            console.log("Upload successful:", res.data);

            if (res.data.ok) {
                onIndexed();
            }
        } catch (err) {
            console.error("Error uploading:", err);
        } finally {
            setLoading(false);
        }
    }

    // Your updated upload logic
    const handleUpload = async () => {
        try {
            const payload: any = {};

            if (activeTab === "url") {
                payload.url = url;
            } else if (activeTab === "text") {
                payload.text = text;
            } else if (activeTab === "file" && file) {
                // Fix: Convert file to base64 properly
                console.log("Converting file to base64...", {
                    name: file.name,
                    size: file.size,
                    type: file.type
                });

                payload.fileContent = await fileToBase64(file);
                payload.fileType = file.name.split(".").pop()?.toLowerCase();

                console.log("File converted:", {
                    base64Length: payload.fileContent.length,
                    fileType: payload.fileType
                });
            }

            console.log("Sending payload to server...");
            const res = await axios.post("/api/upload", payload);
            console.log("Upload successful:", res.data);

        } catch (error) {
            console.error("Upload failed:", error);
        }
    };

    return (
        <div className="p-4 bg-gray-900 rounded-xl shadow-lg text-white">
            <h2 className="text-lg font-semibold mb-3">Data Source</h2>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
                {["url", "text", "file"].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={`px-3 py-1 rounded-lg ${activeTab === tab ? "bg-blue-600" : "bg-gray-700"
                            }`}
                    >
                        {tab.toUpperCase()}
                    </button>
                ))}
            </div>

            {/* Input Fields */}
            {activeTab === "url" && (
                <input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Enter website URL"
                    className="w-full p-2 rounded bg-gray-800 mb-3"
                />
            )}

            {activeTab === "text" && (
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Paste raw text here"
                    className="w-full p-2 rounded bg-gray-800 mb-3"
                    rows={4}
                />
            )}

            {activeTab === "file" && (
                <input
                    type="file"
                    accept=".pdf,.csv,.txt"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="mb-3"
                />
            )}

            <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500"
            >
                {loading ? "Indexing..." : "Submit"}
            </button>
        </div>
    );
}
