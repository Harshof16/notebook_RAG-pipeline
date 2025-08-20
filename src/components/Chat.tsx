"use client";

import axios from "axios";
import { useState, useRef, useEffect, forwardRef, useImperativeHandle, ForwardedRef } from "react";
import toast, { Toaster } from "react-hot-toast";

interface Msg {
    role: "user" | "assistant" | "system";
    text: string;
}
export type ChatHandle = {
    clear: () => void;
    load?: (id: string) => void;
};

function Chat(props: {}, ref: ForwardedRef<ChatHandle | null>) {
    const defaultWelcome: Msg = {
        role: "system",
        text: "Welcome to ChaiCode Mentorship\n\nStart coding conversations with your mentor. Ask questions, seek guidance, or discuss any programming topics you'd like to explore.",
    };
    const [messages, setMessages] = useState<Msg[]>([defaultWelcome]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
        const messagesRef = useRef<HTMLDivElement | null>(null);

    function handleClearChat() {
        setMessages([defaultWelcome]);
        toast.success("Chat cleared.");
    }

    useImperativeHandle(ref, () => ({
        clear() {
            setMessages([defaultWelcome]);
        }
    }));

    async function sendMessage() {
        if (!input.trim() || loading) {
            if (!input.trim()) toast.error("Please enter a message.");
            return;
        }

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
                toast.error("Unexpected response from server.");
                setMessages((prev) => [
                    ...prev,
                    { role: "system", text: "Unexpected response from server." },
                ]);
            }
        } catch (error: unknown) {
            console.error(error);
            const msg = (error as any)?.response?.data?.error || (error as any)?.message || "Something went wrong. Please try again.";
            toast.error(msg);
            setMessages((prev) => [
                ...prev,
                { role: "system", text: "Something went wrong. Please try again." },
            ]);
        } finally {
            setLoading(false);
        }
    }

    // scroll to bottom on new messages
    useEffect(() => {
        const el = messagesRef.current;
        if (el) {
            el.scrollTop = el.scrollHeight;
        }
    }, [messages, loading]);


    return (
            <div className="relative h-full w-full min-h-[600px] max-w-2xl mx-auto">
                <Toaster position="top-right" />
            {/* Custom Toast Container */}
            <div className="fixed top-4 right-4 z-50 space-y-2">
            </div>

            <div className="h-full flex flex-col bg-gradient-to-br from-gray-900/95 via-blue-900/30 to-purple-900/20 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 overflow-hidden relative min-h-[600px]">
                {/* Animated background effects */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-cyan-600/5 animate-pulse"></div>
                <div className="absolute top-0 left-1/4 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
                
                <div className="relative z-10 h-full flex flex-col min-h-[600px]">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-700/50 bg-gray-800/30 backdrop-blur-sm min-h-[70px]">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
                                <span className="text-white font-bold text-lg">🧠</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-white">RecallAI</h3>
                                <div className="flex items-center gap-2 text-xs">
                                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                    <span className="text-green-400">Online</span>
                                </div>
                            </div>
                        </div>
                        
                        <button
                            onClick={handleClearChat}
                            className={`px-4 py-2 cursor-pointer bg-gray-800/80 text-blue-400 rounded-xl font-semibold border border-gray-600/50 transition-all duration-300 ${loading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-600/80 hover:text-white hover:border-red-500/50 hover:scale-105'}`}
                            disabled={loading}
                            aria-disabled={loading}
                            title="Clear chat"
                        >
                            🗑️ Clear
                        </button>
                    </div>

                    {/* Messages Container */}
                    <div ref={messagesRef} className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent min-h-[350px] max-h-[400px]">
                        {messages.map((m, i) => {
                            const isUser = m.role === "user";
                            return (
                                <div
                                    key={i}
                                    className={`flex items-start gap-3 animate-in slide-in-from-bottom duration-500 ${isUser ? "justify-end" : "justify-start"}`}
                                    style={{ animationDelay: `${i * 100}ms` }}
                                >
                                    {/* Avatar */}
                                    {!isUser && (
                                        <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold
                                            ${m.role === "assistant"
                                                ? "bg-gradient-to-r from-orange-500 to-yellow-500 text-white shadow-lg shadow-orange-500/25"
                                                : "bg-gradient-to-r from-gray-600 to-gray-700 text-gray-300"
                                            }`}
                                        >
                                            {m.role === "assistant" ? "🤖" : "ℹ️"}
                                        </div>
                                    )}

                                    {/* Message Content */}
                                    <div className={`flex-1 max-w-[85%] ${isUser ? "flex justify-end" : ""}`}>
                                        {m.role === "system" ? (
                                            <div className="text-center p-8 bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-2xl border border-gray-600/30 backdrop-blur-sm">
                                                <div className="space-y-4">
                                                    <div className="text-4xl mb-4">🧠✨</div>
                                                    <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-400 via-yellow-400 to-orange-500 bg-clip-text text-transparent">
                                                        Welcome to RecallAI
                                                    </h1>
                                                    <p className="text-gray-300 max-w-md mx-auto leading-relaxed">
                                                        Start intelligent conversations with your documents. Upload content and ask questions to unlock insights from your data.
                                                    </p>
                                                    <div className="inline-block bg-gray-900/80 border border-orange-500/30 rounded-xl p-4 mt-4 font-mono text-sm">
                                                        <div className="text-orange-400">
                                                            <span className="text-cyan-400">const</span> <span className="text-yellow-400">aiMentor</span> = {'{'}
                                                        </div>
                                                        <div className="text-gray-300 ml-4">
                                                            status: <span className="text-green-400">"ready"</span>,
                                                        </div>
                                                        <div className="text-gray-300 ml-4">
                                                            mode: <span className="text-blue-400">"interactive"</span>,
                                                        </div>
                                                        <div className="text-gray-300 ml-4">
                                                            knowledge: <span className="text-purple-400">"unlimited"</span>
                                                        </div>
                                                        <div className="text-orange-400">{'}'}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className={`p-4 rounded-2xl shadow-lg backdrop-blur-sm border transition-all duration-300 hover:scale-[1.02] ${isUser
                                                    ? "bg-gradient-to-r from-blue-600/80 to-purple-600/80 text-white border-blue-500/30 ml-auto shadow-blue-500/25"
                                                    : "bg-gradient-to-r from-gray-800/80 to-gray-700/80 text-gray-100 border-gray-600/30 shadow-gray-500/25 mr-auto"
                                                }`}>
                                                <div className="whitespace-pre-wrap leading-relaxed">
                                                    {m.text}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {isUser && (
                                        <div className={`flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold
                                            bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/25`}
                                        >
                                            👤
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Typing Indicator */}
                        {loading && (
                            <div className="flex items-start gap-3 animate-in fade-in duration-300">
                                <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-orange-500/25">
                                    🤖
                                </div>
                                <div className="bg-gradient-to-r from-gray-800/80 to-gray-700/80 p-4 rounded-2xl border border-gray-600/30 backdrop-blur-sm">
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-300">RecallAI is thinking</span>
                                        <div className="flex gap-1">
                                            <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-bounce delay-100"></div>
                                            <div className="w-2 h-2 bg-orange-400 rounded-full animate-bounce delay-200"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* <div ref={messagesEndRef} /> */}
                    </div>

                    {/* Input Area */}
                    <div className="p-6 border-t border-gray-700/50 bg-gray-800/30 backdrop-blur-sm min-h-[100px]">
                        <div className="flex gap-3">
                            <div className="flex-1 relative">
                                <input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === "Enter" && !loading && input.trim()) {
                                            sendMessage();
                                        }
                                    }}
                                    disabled={loading}
                                    className="w-full p-4 pr-12 rounded-2xl bg-gray-800/50 text-white border border-gray-600/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 backdrop-blur-sm placeholder-gray-400"
                                    placeholder="Ask anything about your documents..."
                                />
                                
                                {/* Send button inside input */}
                                <button
                                    onClick={sendMessage}
                                    disabled={loading || !input.trim()}
                                    aria-disabled={loading || !input.trim()}
                                    title={loading || !input.trim() ? 'Enter a message to send' : 'Send message'}
                                    className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl transition-all duration-300 flex items-center justify-center ${loading || !input.trim() ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 shadow-lg shadow-blue-500/25 hover:scale-110'}`}
                                >
                                    {loading ? (
                                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                        
                        {/* Status Bar */}
                        <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span>AI Ready</span>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <span>{messages.filter(m => m.role === 'user').length} messages</span>
                                <span>Press Enter to send</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Corner decorative elements */}
                <div className="absolute top-4 right-4 w-24 h-24 bg-gradient-to-br from-orange-500/10 to-yellow-500/10 rounded-full blur-xl animate-pulse"></div>
                <div className="absolute bottom-4 left-4 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-lg animate-pulse delay-1000"></div>
            </div>
        </div>
    );
}

export default forwardRef(Chat);
