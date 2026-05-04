import {Pool,neonConfig} from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";
import ws from "ws";

if (typeof window === "undefined") {
    neonConfig.webSocketConstructor = ws ;
}

const prismaClientSingleton = () => {
    const pool = new Pool({connectionString: process.env.DATABASE_URL});
    const adapter = new PrismaNeon(pool as any);
    return new PrismaClient({adapter});
}

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
prisma: PrismaClientSingleton | undefined;
}

const prisma = globalForPrisma.prisma || prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
