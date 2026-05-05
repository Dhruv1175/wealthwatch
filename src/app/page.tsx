import { auth, signIn } from "@/auth";
import {redirect} from "next/navigation";
import Image from "next/image";


export default async function Home() {

  const session = await auth();
  if(session){
    redirect("/dashboard");
  }


  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-4xl font-bold mb-8">WealthWatch</h1>
      <p className="text-gray-400 mb-8">Track your finances with ease.</p>

      <form action={ async ()=>{
        'use server';
        await signIn("google",{redirectTo:"/dashboard"})
      }}>
        <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors">
          Sign in with Google
        </button>
      </form>
    </main>
  );
}
