import { auth } from "~/utils/auth";
import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

export const authenticatedMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next }) => {
  const request = getRequest();

  if (!request?.headers) {
    throw new Error("No headers");
  }
  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    throw new Error("No session");
  }

  return next({
    context: { userId: session.user.id, userEmail: session.user.email },
  });
});

export const optionalAuthMiddleware = createMiddleware({
  type: "function",
}).server(async ({ next }) => {
  const request = getRequest();

  if (!request?.headers) {
    return next({
      context: { userId: undefined as string | undefined, userEmail: undefined as string | undefined },
    });
  }

  const session = await auth.api.getSession({ headers: request.headers });

  return next({
    context: {
      userId: session?.user.id as string | undefined,
      userEmail: session?.user.email as string | undefined,
    },
  });
});
