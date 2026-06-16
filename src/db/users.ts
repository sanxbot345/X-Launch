import { db } from './index.ts';
import { users } from './schema.ts';
import { eq } from 'drizzle-orm';

export async function getOrCreateUser(uid: string, email: string | null = null, githubToken: string | null = null) {
  const valuesToSet: any = {};
  if (email) valuesToSet.email = email;
  if (githubToken) valuesToSet.githubToken = githubToken;

  const result = await db.insert(users)
    .values({
      uid,
      email,
      githubToken,
    })
    .onConflictDoUpdate({
      target: users.uid,
      set: valuesToSet,
    })
    .returning();

  return result[0];
}
