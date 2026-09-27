/**
 * Authentication Service
 * Supabase JWT verification and user management
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getConfig } from '@collaborative-ide/shared-types/config';
import { getDb, getCollection, COLLECTIONS } from './services/mongodb';
import { logger } from './utils/logger';
import { ObjectId } from 'mongodb';
import type { User, AuthTokens, SignupRequest, LoginRequest } from '@collaborative-ide/shared-types/api';

const config = getConfig();

// Supabase client for admin operations
const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY);

// ============================================================================
// Supabase JWT Verification
// ============================================================================

interface SupabaseJWTPayload {
  sub: string; // supabase user ID
  email: string;
  role: string;
  aud: string;
  exp: number;
  iat: number;
}

export async function verifySupabaseJWT(request: { headers: { authorization?: string } }): Promise<{ id: string; email: string; supabaseId: string } | null> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);

  try {
    // Verify with Supabase (uses their public key)
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      logger.debug({ error }, 'Supabase JWT verification failed');
      return null;
    }

    // Get or create local user record
    const localUser = await getOrCreateLocalUser(user.id, user.email!);

    return {
      id: localUser._id.toString(),
      email: localUser.email,
      supabaseId: localUser.supabaseId,
    };
  } catch (err) {
    logger.error(err, 'JWT verification error');
    return null;
  }
}

// ============================================================================
// User Management
// ============================================================================

async function getOrCreateLocalUser(supabaseId: string, email: string): Promise<User> {
  const users = getCollection<User>(COLLECTIONS.USERS);

  let user = await users.findOne({ supabaseId });

  if (!user) {
    user = await users.findOne({ email });

    if (user) {
      // Link existing user to Supabase
      await users.updateOne(
        { _id: user._id },
        { $set: { supabaseId } }
      );
      user.supabaseId = supabaseId;
    } else {
      // Create new user
      const result = await users.insertOne({
        email,
        passwordHash: '', // Not used with Supabase Auth
        supabaseId,
        createdAt: new Date().toISOString(),
      });
      user = { _id: result.insertedId, email, passwordHash: '', supabaseId, createdAt: new Date().toISOString() };
    }
  }

  return user;
}

export async function signup(data: SignupRequest): Promise<{ user: User; tokens: AuthTokens }> {
  // Create user in Supabase
  const { data: authData, error } = await supabase.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
  });

  if (error || !authData.user) {
    throw new Error(error?.message || 'Failed to create user in Supabase');
  }

  // Create local user record
  const user = await getOrCreateLocalUser(authData.user.id, data.email);

  // Generate tokens (using Supabase session)
  const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (sessionError || !sessionData.session) {
    throw new Error(sessionError?.message || 'Failed to create session');
  }

  const tokens: AuthTokens = {
    accessToken: sessionData.session.access_token,
    refreshToken: sessionData.session.refresh_token,
    expiresIn: sessionData.session.expires_in,
  };

  return { user, tokens };
}

export async function login(data: LoginRequest): Promise<{ user: User; tokens: AuthTokens }> {
  // Authenticate with Supabase
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error || !authData.session || !authData.user) {
    throw new Error(error?.message || 'Invalid credentials');
  }

  // Get or create local user
  const user = await getOrCreateLocalUser(authData.user.id, authData.user.email!);

  const tokens: AuthTokens = {
    accessToken: authData.session.access_token,
    refreshToken: authData.session.refresh_token,
    expiresIn: authData.session.expires_in,
  };

  return { user, tokens };
}

export async function refreshToken(refreshToken: string): Promise<AuthTokens> {
  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

  if (error || !data.session) {
    throw new Error('Failed to refresh token');
  }

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresIn: data.session.expires_in,
  };
}

export async function logout(accessToken: string): Promise<void> {
  await supabase.auth.admin.signOut(accessToken);
}