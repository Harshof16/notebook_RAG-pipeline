"use client";

import DataSourceForm from "@/components/DataSourceForm";
import Chat from "@/components/Chat";
import { useRef } from "react";

export default function Home() {
  const chatRef = useRef<any>(null);

  function handleIndexed() {
    // clear chat when new content is indexed
    if (chatRef.current?.clear) chatRef.current.clear();
  }

  return (
    <div className="w-full h-screen bg-gradient-to-br from-[#232a3a] via-[#1a2030] to-[#232a3a] flex items-center justify-center p-6">
      <div className="w-full max-w-7xl h-[92vh] rounded-3xl bg-gradient-to-br from-gray-900/95 via-blue-900/30 to-purple-900/20 shadow-2xl border border-white/10 overflow-hidden flex">

        {/* Left panel (uploads) */}
        <div className="w-[38%] min-w-[360px] p-8 flex items-stretch">
            <div className="w-full h-full flex items-center justify-center">
            <DataSourceForm onIndexed={handleIndexed} />
            </div>
        </div>

        {/* Divider */}
        <div className="w-px bg-gradient-to-b from-white/6 via-transparent to-white/6" />

        {/* Right panel (chat) */}
        <div className="flex-1 p-8 flex items-stretch">
            <div className="w-full h-full flex items-center justify-center">
            <Chat ref={chatRef} />
            </div>
        </div>

      </div>
    </div>
  );
}
