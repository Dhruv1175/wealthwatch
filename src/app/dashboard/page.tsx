import { auth , signOut } from "@/auth";
import {redirect} from "next/navigation";

export default async function Dashboard() {

    const session = await auth();
    if(!session){
      redirect("/");
    }

  return (
    <div className="flex min-h-screen flex-col justify-center items-center m-auto">
        <h1 className="text-2xl font-bold">Welcome , {session.user?.name}</h1>
        <button onClick={async ()=>{
            'use server';
            await signOut({redirectTo:"/"})
        }} className="bg-blue-500 hover:bg-blue-700 text-white transition-colors font-bold">Sign Out</button>
        
    </div>
  )
}
