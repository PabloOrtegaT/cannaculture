import NextAuth from "next-auth";
import { getAuthOptions } from "@/server/auth/options";

const handler = async (request: Request, context: unknown) => {
  const options = getAuthOptions();
  return NextAuth(options)(request, context);
};

export { handler as GET, handler as POST };
