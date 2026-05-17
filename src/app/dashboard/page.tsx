import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import UploadForm from "@/components/dashboard/UploadForm"; // Import the client piece

export default async function Dashboard() {

  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }
  const transactions = await prisma.transaction.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
  });

  return (
    <div className="p-8 text-white min-h-screen bg-black font-sans">
      {/* Header Section */}
      <div className="flex justify-between items-center border-b border-white/10 pb-6 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">WealthWatch Core</h1>
          <p className="text-sm text-gray-500">Welcome, {session.user?.name} (ID: {session.user?.id})</p>
        </div>
        <form action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}>
          <button type="submit" className="bg-zinc-900 border border-white/10 px-4 py-2 text-sm font-medium hover:bg-zinc-800 transition-colors">
            Sign Out
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: AI PDF Upload Test Bench */}
        <div className="md:col-span-1 border border-white/10 p-6 bg-zinc-950">
          <h2 className="text-sm font-mono text-sky-400 tracking-wider uppercase mb-4">1. Test AI PDF Pipeline</h2>
          <p className="text-xs text-gray-400 mb-6 leading-relaxed">
            Upload an unencrypted passbook or bank statement PDF. The client will stream the document directly to your API route, invoking the custom Groq engine.
          </p>
          
          {/* Render our client form handling the route request */}
          <UploadForm />
        </div>

        {/* Right Column: Live Transaction Feed */}
        <div className="md:col-span-2 border border-white/10 p-6 bg-zinc-950">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-mono text-mint-500 tracking-wider uppercase">2. Database Transaction Feed</h2>
            <span className="text-xs font-mono bg-zinc-900 px-2.5 py-1 rounded border border-white/5 text-gray-400">
              {transactions.length} Total Records
            </span>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/5 text-gray-600 text-sm font-mono">
              No ledger records caught. Execute a PDF ingest to populate this panel automatically.
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto space-y-2 pr-2">
              {transactions.map((tx) => (
                <div 
                  key={tx.id} 
                  className="flex justify-between items-center py-3 px-4 bg-black border border-white/[0.04] text-xs font-mono"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-gray-200 text-sm font-sans font-medium">{tx.description}</span>
                    <span className="text-gray-500 text-[10px] uppercase tracking-wider">
                      {tx.category || "UNCLASSIFIED"} • {new Date(tx.date).toLocaleDateString("en-IN")}
                    </span>
                  </div>
                  <span className={`text-sm font-bold ${tx.amount >= 0 ? "text-mint-500" : "text-red-500"}`}>
                    {tx.amount >= 0 ? `+₹${tx.amount.toFixed(2)}` : `-₹${Math.abs(tx.amount).toFixed(2)}`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}