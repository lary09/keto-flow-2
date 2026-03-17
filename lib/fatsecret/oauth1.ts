import crypto from 'crypto';

/**
 * FatSecret OAuth 1.0a signature generator and request helper.
 * This avoids the IP whitelisting restrictions of OAuth 2.0.
 */

function escape(str: string) {
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

  const method = 'GET';
  const url = 'https://platform.fatsecret.com/rest/server.api';
  
  const oauthParams: Record<string, string> = {
    ...params,
    oauth_consumer_key: clientId,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_version: '1.0',
    format: 'json',
  };

  // 1. Sort parameters alphabetically by key
  const sortedKeys = Object.keys(oauthParams).sort();
  const baseStringParams = sortedKeys
    .map((key) => `${escape(key)}=${escape(oauthParams[key])}`)
    .join('&');

  // 2. Construct Signature Base String
  const signatureBaseString = [
    method.toUpperCase(),
    escape(url),
    escape(baseStringParams),
  ].join('&');

  // 3. Signing Key (Consumer Secret + "&" + Access Token Secret, but we use 2-legged OAuth so it's just Consumer Secret + "&")
  const signingKey = `${escape(clientSecret)}&`;

  // 4. Generate Signature
  const signature = crypto
    .createHmac('sha1', signingKey)
    .update(signatureBaseString)
    .digest('base64');

  oauthParams.oauth_signature = signature;

  // 5. Build final URL
  const searchParams = new URLSearchParams(oauthParams);
  const finalUrl = `${url}?${searchParams.toString()}`;

  const response = await fetch(finalUrl);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`FatSecret API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}
