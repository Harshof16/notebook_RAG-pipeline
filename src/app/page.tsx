"use client";

import DataSourceForm from "@/components/DataSourceForm";
import Chat from "@/components/Chat";

export default function Home() {
  return (
    <main className="grid grid-cols-3 gap-4 h-screen p-4 bg-black text-white">
      <div>
        <DataSourceForm onIndexed={() => {}} />
      </div>
      <div className="col-span-2">
        <Chat />
      </div>
    </main>
  );
}
