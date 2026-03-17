'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { account, databases, ID, APPWRITE_DATABASE_ID, COLLECTIONS, type UserProfile } from '@/lib/appwrite'
import type { Models } from 'appwrite'

interface AuthContextType {
  user: Models.User<Models.Preferences> | null
  profile: UserProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const doc = await databases.getDocument(
        APPWRITE_DATABASE_ID,
        COLLECTIONS.USER_PROFILES,
        userId
      )
      setProfile(doc as unknown as UserProfile)
    } catch {
      // Profile doesn't exist yet, that's okay
      setProfile(null)
    }
  }, [])

  const checkAuth = useCallback(async () => {
    try {
      let session;
      try {
        session = await account.get()
      } catch {
        // No current session, attempt to create anonymous session
        session = await account.createAnonymousSession()
      }
      setUser(session)
      await fetchProfile(session.$id)
    } catch (err) {
      console.error('Failed to get or create session:', err)
      setUser(null)
      setProfile(null)
    } finally {
      setIsLoading(false)
    }
  }, [fetchProfile])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const login = async (email: string, password: string) => {
    await account.createEmailPasswordSession(email, password)
    const session = await account.get()
    setUser(session)
    await fetchProfile(session.$id)
  }

  const register = async (email: string, password: string, name: string) => {
    await account.create(ID.unique(), email, password, name)
    await account.createEmailPasswordSession(email, password)
    const session = await account.get()
    setUser(session)

    // Create default profile with keto macros
    const defaultProfile: Omit<UserProfile, '$id'> = {
      userId: session.$id,
      email,
      name,
      dailyCalorieGoal: 2000,
      dailyFatGoal: 155, // ~70% of calories from fat
      dailyProteinGoal: 100, // ~20% of calories from protein
      dailyCarbGoal: 25, // ~5-10% of calories from carbs
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    try {
      const doc = await databases.createDocument(
        APPWRITE_DATABASE_ID,
        COLLECTIONS.USER_PROFILES,
        session.$id,
        defaultProfile
      )
      setProfile(doc as unknown as UserProfile)
    } catch (error) {
      console.error('Failed to create profile:', error)
    }
  }

  const logout = async () => {
    await account.deleteSession('current')
    setUser(null)
    setProfile(null)
  }

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return

    const updated = await databases.updateDocument(
      APPWRITE_DATABASE_ID,
      COLLECTIONS.USER_PROFILES,
      user.$id,
      {
        ...updates,
        updatedAt: new Date().toISOString(),
      }
    )
    setProfile(updated as unknown as UserProfile)
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.$id)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
