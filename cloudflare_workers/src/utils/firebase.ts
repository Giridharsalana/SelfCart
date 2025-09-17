import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import type { Env } from '../types'

let firebaseApp: any = null
let firestore: any = null
let auth: any = null

export async function initializeFirebase(env: Env) {
  if (firebaseApp) {
    return { firebaseApp, firestore, auth }
  }

  try {
    // Check if Firebase is already initialized
    const apps = getApps()
    if (apps.length > 0) {
      firebaseApp = apps[0]
    } else {
      // Initialize Firebase Admin
      firebaseApp = initializeApp({
        credential: cert({
          projectId: env.FIREBASE_PROJECT_ID,
          privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          clientEmail: env.FIREBASE_CLIENT_EMAIL,
        }),
        projectId: env.FIREBASE_PROJECT_ID,
      })
    }

    firestore = getFirestore(firebaseApp)
    auth = getAuth(firebaseApp)

    return { firebaseApp, firestore, auth }
  } catch (error) {
    console.error('Firebase initialization error:', error)
    throw new Error('Failed to initialize Firebase')
  }
}

export async function verifyFirebaseToken(token: string, auth: any) {
  try {
    const decodedToken = await auth.verifyIdToken(token)
    return decodedToken
  } catch (error) {
    console.error('Token verification error:', error)
    throw new Error('Invalid token')
  }
}

export function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }
}
