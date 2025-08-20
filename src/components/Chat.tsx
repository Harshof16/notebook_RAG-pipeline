"use client";

import axios from "axios";
import { useState } from "react";

interface Msg {
    role: "user" | "assistant" | "system";
    text: string;
}

export default function Chat() {
    const [messages, setMessages] = useState<Msg[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);

    async function sendMessage() {
        if (!input.trim() || loading) return;

        const userMsg: Msg = { role: "user", text: input };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        try {
            const res = await axios.post("/api/chat", { query: input });

            if (res.data?.answer) {
                setMessages((prev) => [
                    ...prev,
                    { role: "assistant", text: res.data.answer },
                ]);
            } else {
                setMessages((prev) => [
                    ...prev,
                    { role: "system", text: "Unexpected response from server." },
                ]);
            }
        } catch (error) {
            setMessages((prev) => [
                ...prev,
                { role: "system", text: "Something went wrong. Please try again." },
            ]);
        } finally {
            setLoading(false);
        }
    }


    return (
        <div className="flex flex-col h-full p-4 bg-gray-900 rounded-2xl">
            <div className="flex-1 overflow-y-auto space-y-2">
                {messages.map((m, i) => (
                    <div
                        key={i}
                        className={`p-2 rounded ${m.role === "user"
                                ? "bg-blue-600 text-white"
                                : m.role === "assistant"
                                    ? "bg-gray-800 text-gray-100"
                                    : "bg-red-700 text-white"
                            }`}
                    >
                        {m.text}
                    </div>
                ))}
            </div>
            <div className="flex mt-2">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={loading}
                    className="flex-1 p-2 rounded bg-gray-800 disabled:opacity-50"
                    placeholder="Type your question..."
                />
                <button
                    onClick={sendMessage}
                    disabled={loading}
                    className="ml-2 px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
                >
                    {loading ? "Sending..." : "Send"}
                </button>
            </div>
        </div>
    );
}
