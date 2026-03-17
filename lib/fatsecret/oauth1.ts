import crypto from 'crypto';

/**
 * FatSecret OAuth 1.0a signature generator and request helper.
 * This avoids the IP whitelisting restrictions of OAuth 2.0.
 */

function rfc3986Encode(str: string) {
  return encodeURIComponent(str)
    .replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase())
    .replace(/%7E/g, '~');
}

export async function fatSecretRequest(params: Record<string, string>) {
  const clientId = process.env.FATSECRET_CLIENT_ID;
  const clientSecret = process.env.FATSECRET_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('FatSecret credentials not configured');
  }

  const httpMethod = 'GET';
  const url = 'https://platform.fatsecret.com/rest/server.api';
  
  const oauthParams: Record<string, string> = {
    ...params,
    oauth_consumer_key: clientId,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: crypto.randomBytes(8).toString('hex'), // FatSecret prefers shorter nonces
    oauth_version: '1.0',
    format: 'json',
  };

  // 1. Parameter normalization (sorted by key, then value)
  const sortedKeys = Object.keys(oauthParams).sort();
  const baseStringParams = sortedKeys
    .map((key) => `${rfc3986Encode(key)}=${rfc3986Encode(oauthParams[key])}`)
    .join('&');

  // 2. Signature Base String: method & raw_url & base_string_params
  // IMPORTANT: All three components must be encoded
  const signatureBaseString = [
    httpMethod.toUpperCase(),
    rfc3986Encode(url),
    rfc3986Encode(baseStringParams),
  ].join('&');

  // 3. Signing Key: consumer_secret & "" (no access token)
  const signingKey = `${rfc3986Encode(clientSecret)}&`;

  // 4. Generate Signature
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBaseString)
    .digest('base64');

  oauthParams.oauth_signature = signature;

  // 5. Final URL with all parameters
  const queryItems = Object.keys(oauthParams).map(key => `${rfc3986Encode(key)}=${rfc3986Encode(oauthParams[key])}`);
  const finalUrl = `${url}?${queryItems.join('&')}`;

  const response = await fetch(finalUrl);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`FatSecret API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}
