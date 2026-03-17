import crypto from 'crypto';

/**
 * FatSecret OAuth 1.0a signature generator and request helper.
 * This avoids the IP whitelisting restrictions of OAuth 2.0.
 */

/**
 * RFC 3986 compliant encoding as required by FatSecret.
 */
function rfc3986Encode(str: string): string {
  return encodeURIComponent(str)
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
    .replace(/%7E/g, '~');
}

export async function fatSecretRequest(params: Record<string, string>) {
  const clientId = process.env.FATSECRET_CLIENT_ID;
  const clientSecret = process.env.FATSECRET_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('FatSecret credentials not configured');
  }

  const httpMethod = 'GET';
  const baseUrl = 'https://platform.fatsecret.com/rest/server.api';
  
  const oauthParams: Record<string, string> = {
    ...params,
    oauth_consumer_key: clientId,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: crypto.randomBytes(8).toString('hex'),
    oauth_version: '1.0',
    format: 'json',
  };

  // 1. Sort and Encode Parameters for the Base String
  const sortedKeys = Object.keys(oauthParams).sort();
  const baseStringParams = sortedKeys
    .map((key) => `${rfc3986Encode(key)}=${rfc3986Encode(oauthParams[key])}`)
    .join('&');

  // 2. Construct Signature Base String
  // Format: METHOD & URL & NORMALIZED_PARAMS
  // Each part must be encoded!
  const signatureBaseString = [
    httpMethod.toUpperCase(),
    rfc3986Encode(baseUrl),
    rfc3986Encode(baseStringParams),
  ].join('&');

  // 3. Signing Key: consumer_secret & ""
  const signingKey = `${rfc3986Encode(clientSecret)}&`;

  // 4. Generate Signature
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBaseString)
    .digest('base64');

  // 5. Build final URL
  const allParams = { ...oauthParams, oauth_signature: signature };
  const queryItems = Object.keys(allParams)
    .sort() // Optional but cleaner
    .map(key => `${rfc3986Encode(key)}=${rfc3986Encode(allParams[key])}`);
    
  const finalUrl = `${baseUrl}?${queryItems.join('&')}`;

  const response = await fetch(finalUrl);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`FatSecret API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}
