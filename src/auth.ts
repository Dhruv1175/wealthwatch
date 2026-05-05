import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import prisma from "@/lib/db";
 
export const { handlers, signIn, signOut, auth } = NextAuth({
    adapter:PrismaAdapter(prisma),
    providers: [
        Google({
            clientId: process.env.GOOGLE_ID,
            clientSecret: process.env.GOOGLE_SECRET,
        
        })
    ],
    session:{
        strategy: "jwt",
        maxAge: 2 * 24 * 60 * 60, // 2 days
    },
    callbacks:{
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
            }
            return token;
        },
        async session({session,token}){
            if(token){
                session.user.id = token.id as string;
            }
            return session;
        }
    },

    secret: process.env.AUTH_SECRET,
})