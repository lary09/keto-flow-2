import { NextResponse } from 'next/server'

const APPWRITE_ENDPOINT = 'https://nyc.cloud.appwrite.io/v1'
const APPWRITE_PROJECT_ID = '69b84d1c000d50dc644e'

export async function GET() {
  console.log('[v0] Server-side Appwrite connection test starting...')
  console.log('[v0] Endpoint:', APPWRITE_ENDPOINT)
  console.log('[v0] Project ID:', APPWRITE_PROJECT_ID)
  
  const results: Record<string, unknown> = {
    endpoint: APPWRITE_ENDPOINT,
    projectId: APPWRITE_PROJECT_ID,
    tests: {}
  }
  
  // Test 1: Health endpoint
  try {
    console.log('[v0] Testing health endpoint...')
    const healthResponse = await fetch(`${APPWRITE_ENDPOINT}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    const healthStatus = healthResponse.status
    let healthData = null
    
    try {
      healthData = await healthResponse.json()
    } catch {
      healthData = await healthResponse.text()
    }
    
    console.log('[v0] Health status:', healthStatus)
    console.log('[v0] Health data:', healthData)
    
    results.tests = {
      ...results.tests as object,
      health: {
        status: healthStatus,
        ok: healthResponse.ok,
        data: healthData
      }
    }
  } catch (error) {
    console.error('[v0] Health test error:', error)
    results.tests = {
      ...results.tests as object,
      health: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  // Test 2: Account endpoint (should return 401 if not authenticated)
  try {
    console.log('[v0] Testing account endpoint...')
    const accountResponse = await fetch(`${APPWRITE_ENDPOINT}/account`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': APPWRITE_PROJECT_ID,
      },
    })
    
    const accountStatus = accountResponse.status
    let accountData = null
    
    try {
      accountData = await accountResponse.json()
    } catch {
      accountData = await accountResponse.text()
    }
    
    console.log('[v0] Account status:', accountStatus)
    console.log('[v0] Account data:', accountData)
    
    // 401 is expected when not authenticated - this confirms the connection works
    const connectionWorks = accountStatus === 401 || accountStatus === 200
    
    results.tests = {
      ...results.tests as object,
      account: {
        status: accountStatus,
        connectionWorks,
        data: accountData
      }
    }
    
    results.overallSuccess = connectionWorks
    results.message = connectionWorks 
      ? 'Appwrite connection successful! Server can reach Appwrite Cloud.'
      : `Unexpected response: ${accountStatus}`
      
  } catch (error) {
    console.error('[v0] Account test error:', error)
    results.tests = {
      ...results.tests as object,
      account: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
    results.overallSuccess = false
    results.message = 'Failed to connect to Appwrite'
  }
  
  return NextResponse.json(results)
}
