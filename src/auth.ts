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
            image: user.image,
        };
      },
    }),
    ],
    session:{
        strategy: "jwt",
        maxAge: 2 * 24 * 60 * 60, // 2 days
    },
    callbacks:{
        async jwt({ token, user , trigger , session }) {
            if (user) {
                token.id = user.id;
                token.email = user.email;
                token.name = user.name;
                token.image = user.image;
            }
            if (trigger === "update" && session) {
                return { ...token, ...session };
            }
            return token;
        },
        async session({session,token}){
            if(token){
                session.user.id = token.id as string;
                session.user.email = token.email as string;
                session.user.name = token.name as string;
                session.user.image = token.image as string;
            }
            return session;
        }
    },

    secret: process.env.AUTH_SECRET,
})