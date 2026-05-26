import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    roles?: string[];
    permissions?: string[];
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      roles: string[];
      permissions: string[];
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    roles?: string[];
    permissions?: string[];
  }
}
