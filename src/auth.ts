import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";
 
export const { handlers, signIn, signOut, auth } = NextAuth({
    adapter:PrismaAdapter(prisma),
    providers: [
        Google({
            clientId: process.env.GOOGLE_ID,
            clientSecret: process.env.GOOGLE_SECRET,
        
        }),
        Credentials({
            name:"credentials",
            credentials:{
                email:{label:"email",type:"email"},
                password:{label:"password",type:"password"}
            },
            async authorize(credentials){
                if (!credentials?.email || !credentials?.password) return null;

                const user = await prisma.user.findUnique({
                where: { email: credentials.email as string },
                
        });if (!user || !user.password) return null;
const isPasswordCorrect = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isPasswordCorrect) return null;

        return {
            id: user.id,
            email: user.email,
            name: user.name,
        };
      },
    }),
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