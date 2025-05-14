import session from "express-session";
import type { Express, Request as ExpressRequest, Response as ExpressResponse, NextFunction, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { db } from '../shared/db.js.js';
import { users } from '../shared/schema.js.js';
// Import passport and client
import passport from "passport";
import * as client from "openid-client";
// Define a class to use as fallback
class MockStrategy {
  // Using _unused prefix to indicate these are stored but intentionally not used
  private _unusedOptions: any;
  private _unusedVerify: any;
  public name: string = 'mock';
  constructor(_options: any, _verify: any) {
    console.error("WARNING: Using mock OpenID strategy - authentication will not work");
    // Store options and verify callback but don't use them in mock implementation
    this._unusedOptions = _options;
    this._unusedVerify = _verify;
  }
  // Required method from Strategy interface
  authenticate(req: any, options?: any): any {
    return this.fail('Mock authentication not supported', 401);
  }
  // Helper methods required by the authenticate method
  fail(challenge: any, status?: number): any {
    console.log('Mock strategy fail called');
    return;
  }
  success(user: any, info?: any): any {
    console.log('Mock strategy success called');
    return;
  }
  error(err: any): any {
    console.log('Mock strategy error called');
    return;
  }
}
// Define our strategy variable
let Strategy: any = MockStrategy;
type VerifyFunction = any; // Use any type as a workaround for module resolution issues
// Define a completely compatible request interface
// Using type intersections instead of extending to avoid compatibility issues
type AuthRequest = ExpressRequest & {
  user?: any;
  isAuthenticated?: any;
  logout?: any;
}
// No type needed here anymore since we're using 'any' directly
// Check for required environment variables
if (!process.env.REPLIT_DOMAINS) {
  console.warn("Environment variable REPLIT_DOMAINS not provided, auth will be limited");
}
// Cache OIDC configuration
const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);
// Create and configure session middleware
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  // Safely cast to any first to avoid TypeScript type mismatch errors
  const pgStore = connectPg(session) as any;
  // Now we can safely initialize the session store
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET || 'temporary-dev-secret',
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}
// Update user session with tokens and claims
function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}
// Upsert user to database
async function upsertUser(claims: any) {
  try {
    const [user] = await db
      .insert(users)
      .values({
        id: claims["sub"],
        email: claims["email"],
        firstName: claims["first_name"],
        lastName: claims["last_name"],
        profileImageUrl: claims["profile_image_url"],
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: claims["email"],
          firstName: claims["first_name"],
          lastName: claims["last_name"],
          profileImageUrl: claims["profile_image_url"],
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  } catch (error) {
    console.error("Failed to upsert user:", error);
    throw error;
  }
}
// Setup authentication middleware and routes
export async function setupAuth(app: Express) {
  if (!process.env.REPLIT_DOMAINS) {
    console.warn("Skipping full auth setup due to missing REPLIT_DOMAINS");
    // Still set up session handling for dev mode
    app.use(getSession());
    // Register a mock strategy with a proper name to avoid the error
    const mockStrategy = new MockStrategy({}, () => {});
    passport.use('mock', mockStrategy);
    // Initialize passport middleware
    app.use(passport.initialize());
    app.use(passport.session());
    // Simple serialization for dev mode
    passport.serializeUser((user: any, cb: any) => cb(null, user));
    passport.deserializeUser((user: any, cb: any) => cb(null, user));
    return;
  }
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());
  const config = await getOidcConfig();
  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    try {
      const user = {};
      updateUserSession(user, tokens);
      await upsertUser(tokens.claims());
      verified(null, user);
    } catch (error) {
      console.error("Verification error:", error);
      verified(error as Error);
    }
  };
  for (const domain of process.env.REPLIT_DOMAINS.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`,
      },
      verify,
    );
    // Explicitly provide name as first argument
    passport.use(`replitauth:${domain}`, strategy);
  }
  passport.serializeUser((user: any, cb: (err: any, user: any) => void) => cb(null, user));
  passport.deserializeUser((user: any, cb: (err: any, user: any) => void) => cb(null, user));
  app.get("/api/login", (req: AuthRequest, res: ExpressResponse, next: NextFunction) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });
  app.get("/api/callback", (req: AuthRequest, res: ExpressResponse, next: NextFunction) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });
  app.get("/api/logout", (req: AuthRequest, res: ExpressResponse) => {
    if (req.logout) {
      req.logout(() => {
        res.redirect(
          client.buildEndSessionUrl(config, {
            client_id: process.env.REPL_ID!,
            post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
          }).href
        );
      });
    } else {
      // Fallback for Express 4.x
      (req as any).logout();
      res.redirect("/");
    }
  });
}
// Authentication middleware for protected routes
export const isAuthenticated: RequestHandler = async (req: any, res: ExpressResponse, next: NextFunction): Promise<void> => {
  // Skip auth check in dev mode if env vars are missing
  if (!process.env.REPLIT_DOMAINS) {
    console.warn("Auth check bypassed in dev mode");
    next();
    return;
  }
  const user = req.user;
  if (!req.isAuthenticated || !req.isAuthenticated() || !user?.expires_at) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    next();
    return;
  }
  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.redirect("/api/login");
    return;
  }
  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    next();
  } catch (error) {
    console.error("Token refresh error:", error);
    res.redirect("/api/login");
  }
};