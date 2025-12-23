import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { prisma } from "./prisma.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
      // ❌ DO NOT add passReqToCallback
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) return done(new Error("Email not provided"), false);

        let user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email,
              username: profile.displayName.replace(/\s+/g, ""),
              password: "oauth", // required by your schema
            },
          });
        }

        done(null, user);
      } catch (err) {
        done(err as Error, false);
      }
    }
  )
);


/* =========================
   DISCORD STRATEGY
========================= */
import { Strategy as DiscordStrategy } from "passport-discord-auth";

passport.use(
  new DiscordStrategy(
    {
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      callbackUrl: process.env.DISCORD_CALLBACK_URL!,
      scope: ["identify", "email"],
      // ❌ DO NOT add passReqToCallback
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.email;
        if (!email)
          return done(new Error("Discord email missing"), false);

        let user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              email,
              username: profile.username,
              password: "oauth",
            },
          });
        }

        done(null, user);
      } catch (err) {
        done(err as Error, false);
      }
    }
  )
);


export default passport;
