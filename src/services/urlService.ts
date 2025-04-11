import { HeaderResult } from '@/components/ResultCard';
import { calculateCachingScore, generateSummary, getDetailedPerformanceTiming } from '@/utils/headerAnalyzer';

// Generate a curl command for the URL with debug headers
const generateCurlCommand = (url: string): string => {
  return `curl -I -H "Fastly-Debug: 1" -H "Pantheon-Debug: 1" "${url}"`;
};

// This function tries to fetch headers using a direct jsonp approach
export const checkUrl = async (url: string): Promise<{
  result: HeaderResult;
  goCode: string;
  phpCode: string;
  curlCommand: string;
}> => {
  // Ensure URL has protocol
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }
  
  console.log(`Fetching headers for: ${url}`);
  
  
  try {
    // Create a proxy URL to avoid CORS issues
    // Make a separate request to get the response time
    // Example usage:
    /*const totalTime = await getDetailedPerformanceTiming(url, (totalTime) => {
      console.log('totalTime from callback:', totalTime);
      return totalTime;
    });
    console.log('totalTime :', totalTime );*/

    const start = performance.now();
    await fetch(encodeURIComponent(url));
    const responseTimeRaw = performance.now() - start;
    const responseTime = parseFloat(responseTimeRaw.toFixed(2));

    // Make a proxy request to fetch headers
    const proxyUrl = 'https://2ce35250-6caf-4679-9f7c-5f3f9b29be3f-00-2wj5812hu9b5s.sisko.replit.dev/proxy?url=' + encodeURIComponent(url);
    const response = await fetch(proxyUrl);
    const data: HeaderResult = await response.json();
    if (data.status != 200) {
      throw new Error('Failed to fetch headers');
    }
    
    // Extract headers from the response
    const responseHeaders = data.headers || {};
    console.log('Received raw headers:', responseHeaders);

    
    
    const allHeaders: Record<string, string> = {};

    allHeaders['response-time'] = responseTime.toString() || "Unknown";
    //allHeaders['total-response-time'] = totalTime.toString() || "Unknown";
    
    // Add basic headers that would be present
    allHeaders['content-type'] = data.headers['content-type'];
    allHeaders['date'] = data.headers['date'];
    allHeaders['server'] = data.headers['server'];
    
    // Add cache-related headers
    allHeaders['cache-control'] = data.headers['cache-control'];
    allHeaders['age'] = data.headers['age'];
    allHeaders['expires'] = data.headers['expires'];
    allHeaders['last-modified'] = data.headers['last-modified'];
    allHeaders['etag'] = data.headers['etag'];

    // Drupal specific headers
    if ('x-drupal-cache' in data.headers) { 
      allHeaders['x-drupal-cache'] = data.headers['x-drupal-cache'];
    }
    if ('x-drupal-dynamic-cache' in data.headers) { 
      allHeaders['x-drupal-dynamic-cache'] = data.headers['x-drupal-dynamic-cache'];
    }
    if ('x-generator' in data.headers) { 
      allHeaders['x-generator'] = data.headers['x-generator'];
    }
    
    // Add CDN-specific headers based on URL
    if ('x-cache' in data.headers) { 
      allHeaders['x-cache'] = data.headers['x-cache'];
    }
    if ('x-served-by' in data.headers) { 
      allHeaders['x-served-by'] = data.headers['x-served-by'];
    }
    if ('x-cache-hits' in data.headers) { 
      allHeaders['x-cache-hits'] = data.headers['x-cache-hits'];
    }

    // Fastly debug headers
    if ('surrogate-key' in data.headers) { 
      allHeaders['surrogate-key'] = data.headers['surrogate-key'];
    }
    if ('fastly-debug-digest' in data.headers) { 
      allHeaders['fastly-debug-digest'] = data.headers['fastly-debug-digest'];
    }
    if ('fastly-debug-path' in data.headers) { 
      allHeaders['fastly-debug-path'] = data.headers['fastly-debug-path'];
    }
    if ('fastly-debug-ttl' in data.headers) { 
      allHeaders['fastly-debug-ttl'] = data.headers['fastly-debug-ttl'];
    }
      
    // Add Pantheon-specific debug headers
    if ('surrogate-key-raw' in data.headers) { 
      allHeaders['surrogate-key-raw'] = data.headers['surrogate-key-raw'];
    }
    if ('policy-doc-cache' in data.headers) { 
      allHeaders['policy-doc-cache'] = data.headers['policy-doc-cache'];
    }
    if ('policy-doc-surrogate-key' in data.headers) { 
      allHeaders['policy-doc-surrogate-key'] = data.headers['policy-doc-surrogate-key'];
    }
    if ('pcontext-pdocclustering' in data.headers) { 
      allHeaders['pcontext-pdocclustering'] = data.headers['pcontext-pdocclustering'];
    }
    if ('pcontext-backend' in data.headers) { 
      allHeaders['pcontext-pdocclustering'] = data.headers['pcontext-backend'];
    }
    if ('pcontext-enforce-https' in data.headers) { 
      allHeaders['pcontext-enforce-https'] = data.headers['pcontext-enforce-https'];
    }
    if ('pcontext-request-restarts' in data.headers) { 
      allHeaders['pcontext-request-restarts'] = data.headers['pcontext-request-restarts'];
    }
    if ('pcontext-platform' in data.headers) { 
      allHeaders['pcontext-platform'] = data.headers['pcontext-platform'];
    }
    if ('pantheon-trace-id' in data.headers) { 
      allHeaders['pantheon-trace-id'] = data.headers['pantheon-trace-id'];
    }
    
    // Add Cloudflare-specific headers
    if ('cf-ray' in data.headers) { 
      allHeaders['cf-ray'] = data.headers['cf-ray'];
      allHeaders['cf-cache-status'] =data.headers['cf-ray'] || "Unknown";
      allHeaders['cf-polished'] = data.headers['cf-polished'] || "Unknown";
      allHeaders['cf-apo-via'] = data.headers['cf-apo-via'] || "Unknown";
      allHeaders['cf-edge-cache'] = data.headers['cf-edge-cache'] || "Unknown";
    }

    // Cloudfront specific headers
    if ('x-amz-cf-id' in data.headers) {
      allHeaders['x-amz-cf-id'] = data.headers['x-amz-cf-id'];
    }
    if ('x-amz-cf-pop' in data.headers) {
      allHeaders['x-amz-cf-pop'] = data.headers['x-amz-cf-pop'];
    }
    if ('x-amz-cf-status' in data.headers) {
      allHeaders['x-amz-cf-status'] = data.headers['x-amz-cf-status'];
    }
    if ('x-amz-cf-variant' in data.headers) {
      allHeaders['x-amz-cf-variant'] = data.headers['x-amz-cf-variant'];
    }
    if ('x-amz-cf-visitor' in data.headers) {
      allHeaders['x-amz-cf-visitor'] = data.headers['x-amz-cf-visitor'];
    }
    if ('x-amz-cf-trace-id' in data.headers) {
      allHeaders['x-amz-cf-trace-id'] = data.headers['x-amz-cf-trace-id'];
    }

    // Security headers
    if ('strict-transport-security' in data.headers) { 
      allHeaders['strict-transport-security'] = data.headers['strict-transport-security'];
    }
    if ('x-xss-protection' in data.headers) {
      allHeaders['x-xss-protection'] = data.headers['x-xss-protection'];
    }
    if ('x-content-security-policy' in data.headers) {
      allHeaders['x-content-security-policy'] = data.headers['x-content-security-policy'];
    }
    if ('x-frame-options' in data.headers) {
      allHeaders['x-frame-options'] = data.headers['x-frame-options'];
    }
    if ('x-permitted-cross-domain-policies' in data.headers) {
      allHeaders['x-permitted-cross-domain-policies'] = data.headers['x-permitted-cross-domain-policies'];
    }
    if ('x-download-options' in data.headers) {
      allHeaders['x-download-options'] = data.headers['x-download-options'];
    }
    if ('x-content-security-policy-report-only' in data.headers) {
      allHeaders['x-content-security-policy-report-only'] = data.headers['x-content-security-policy-report-only'];
    }
    if ('content-security-policy-report-only' in data.headers) {
      allHeaders['content-security-policy-report-only'] = data.headers['content-security-policy-report-only'];
    }
    if ('x-webkit-csp' in data.headers) {
      allHeaders['x-webkit-csp'] = data.headers['x-webkit-csp'];
    }
    if ('x-dns-prefetch-control' in data.headers) {
      allHeaders['x-dns-prefetch-control'] = data.headers['x-dns-prefetch-control'];
    }
  

    // Other headers
    if ('x-content-type-options' in data.headers) { 
      allHeaders['x-content-type-options'] = data.headers['x-content-type-options'];
    }
    if ('x-pantheon-styx-hostname' in data.headers) { 
      allHeaders['x-pantheon-styx-hostname'] = data.headers['x-pantheon-styx-hostname'];
    }
    if ('x-styx-req-id' in data.headers) { 
      allHeaders['x-styx-req-id'] = data.headers['x-styx-req-id'];
    }
    if ('content-language' in data.headers) { 
      allHeaders['content-language'] = data.headers['content-language'];
    }
    if ('content-type' in data.headers) { 
      allHeaders['content-type'] = data.headers['content-type'];
    }
    if ('content-length' in data.headers) { 
      allHeaders['content-length'] = data.headers['content-length'];
    }
    if ('content-encoding' in data.headers) { 
      allHeaders['content-encoding'] = data.headers['content-encoding'];
    }
    if ('vary' in data.headers) { 
      allHeaders['vary'] = data.headers['vary'];
    }
    if ('via' in data.headers) { 
      allHeaders['via'] = data.headers['via'];
    }
    if ('version-epoch' in data.headers) { 
      allHeaders['version-epoch'] = data.headers['version-epoch'];
    }
    if ('x-robots-tag' in data.headers) { 
      allHeaders['x-robots-tag'] = data.headers['x-robots-tag'];
    }
    if ('x-fastly-cache-status' in data.headers) { 
      allHeaders['x-fastly-cache-status'] = data.headers['x-fastly-cache-status'];
    }
    if ('x-fastly-pre-flight-cache' in data.headers) { 
      allHeaders['x-fastly-pre-flight-cache'] = data.headers['x-fastly-pre-flight-cache'];
    }
    if ('x-fastly-pre-flight-cache-status' in data.headers) { 
      allHeaders['x-fastly-pre-flight-cache-status'] = data.headers['x-fastly-pre-flight-cache-status'];
    }
    if ('fastly-restarts' in data.headers) { 
      allHeaders['fastly-restarts'] = data.headers['fastly-restarts'];
    }
    if ('alt-svc' in data.headers) { 
      allHeaders['alt-svc'] = data.headers['alt-svc'];
    }
    if ('referrer-policy' in data.headers) { 
      allHeaders['referrer-policy'] = data.headers['referrer-policy'];
    }
    if ('set-cookie' in data.headers) { 
      allHeaders['set-cookie'] = data.headers['set-cookie'];
    }
    
    console.log('Received headers:', allHeaders);
    
    // Extract common headers
    const server = allHeaders['server'] || "Unknown";
    const cacheControl = allHeaders['cache-control'] || "";
    const cacheStatus = allHeaders['x-cache'] || allHeaders['cf-cache-status'] || "unknown";
    const age = allHeaders['age'] || "0";
    const expires = allHeaders['expires'] || "";
    const lastModified = allHeaders['last-modified'] || "";
    const etag = allHeaders['etag'] || "";

    // Security headers
    const securityHeaders = Object.keys(allHeaders)
      .filter(key => 
        key.toLowerCase().includes('strict-transport-') || 
        key.toLowerCase().includes('x-xss-') ||
        key.toLowerCase().includes('content-security-') ||
        key.toLowerCase().includes('x-frame-') || 
        key.toLowerCase().includes('x-permitted-') ||
        key.toLowerCase().includes('x-download-') ||
        key.toLowerCase().includes('x-webkit-') ||
        key.toLowerCase().includes('x-content') ||
        key.toLowerCase().includes('x-dns-')
      )
      .map(key => `${key}: ${allHeaders[key]}`)
      .join('\n');
    

    // Other useful headers
    const usefulHeaders = Object.keys(allHeaders)
      .filter(key => 
        key.toLowerCase().includes('x-drupal-') || 
        key.toLowerCase().includes('x-pantheon-styx') ||
        key.toLowerCase().includes('x-styx-req') ||
        key.toLowerCase().startsWith('content-') ||
        key.toLowerCase().includes('version-') ||
        key.toLowerCase().includes('via') ||
        key.toLowerCase().includes('vary') ||
        key.toLowerCase().includes('total-response') ||
        key.toLowerCase().includes('x-robots-') ||
        key.toLowerCase() === 'alt-svc' ||
        key.toLowerCase() === 'referrer-policy' ||
        key.toLowerCase() === 'set-cookie' 
      )
      .map(key => `${key}: ${allHeaders[key]}`)
      .join('\n');
    
    // Extract Fastly specific headers
    const fastlyDebugHeaders = Object.keys(allHeaders)
      .filter(key => 
        key.toLowerCase().includes('fastly-debug-') || 
        key.toLowerCase() === 'surrogate-key' ||
        key.toLowerCase().includes('x-fastly-cache') ||
        key.toLowerCase().includes('x-fastly-pre-') ||
        key.toLowerCase() === 'fastly-restarts'
      )
      .map(key => `${key}: ${allHeaders[key]}`)
      .join('\n');
    
    // Extract Pantheon specific headers
    const pantheonDebugHeaders = Object.keys(allHeaders)
      .filter(key => 
        key.toLowerCase() === 'surrogate-key-raw' || 
        key.toLowerCase().includes('policy-doc') || 
        key.toLowerCase().includes('pcontext') ||
        key.toLowerCase().includes('pantheon-')
      )
      .map(key => `${key}: ${allHeaders[key]}`)
      .join('\n');
    
    // Extract Cloudflare specific headers
    const cloudflareDebugHeaders = Object.keys(allHeaders)
      .filter(key => key.toLowerCase().includes('cf-'))
      .map(key => `${key}: ${allHeaders[key]}`)
      .join('\n');

    // Extract Cloudfront specific headers
    const cloudfrontDebugHeaders = Object.keys(allHeaders)
      .filter(key => key.toLowerCase().includes('x-amz'))
      .map(key => `${key}: ${allHeaders[key]}`)
      .join('\n');
    
    // Calculate caching score based on the headers
    const cachingScore = calculateCachingScore(
      cacheControl,
      etag,
      lastModified,
      expires,
      cacheStatus,
      age
    );
    
    // Generate performance suggestions based on the headers and score
    const performanceSuggestions = generatePerformanceSuggestions(
      cacheControl,
      etag,
      lastModified,
      server,
      cachingScore,
      responseTime
    );
    
    // Create the result object with simulated header values
    const result: HeaderResult = {
      url: url,
      status: data.status,
      headers: allHeaders,
      humanReadableSummary: generateSummary(url, server, cachingScore, responseTime, cacheStatus),
      cachingScore: cachingScore,
      securityHeaders: securityHeaders,
      usefulHeaders: usefulHeaders,
      fastlyDebug: fastlyDebugHeaders,
      pantheonDebug: pantheonDebugHeaders,
      cloudflareDebug: cloudflareDebugHeaders,
      cloudfrontDebugHeaders: cloudfrontDebugHeaders,
      performanceSuggestions: performanceSuggestions
    };
    
    // Import these at runtime to avoid circular dependencies
    const { generateGoCode, generatePhpCode } = await import('@/utils/codeGenerators');
    
    // Generate the equivalent Go code with debug headers
    const generatedGoCode = generateGoCode(url, server);
    
    // Generate the equivalent PHP code with debug headers
    const generatedPhpCode = generatePhpCode(url, server);
  
    // Generate the curl command
    const curlCmd = generateCurlCommand(url);
    
    return {
      result: result,
      goCode: generatedGoCode,
      phpCode: generatedPhpCode,
      curlCommand: curlCmd
    };
  } catch (error) {
    console.error("Error fetching headers:", error);
  }
};

// Generate performance suggestions based on header analysis
const generatePerformanceSuggestions = (
  cacheControl: string,
  etag: string,
  lastModified: string,
  serverType: string,
  cachingScore: number,
  responseTime: number
): string[] => {
  const suggestions: string[] = [];
  
  // Caching suggestions
  if (!cacheControl || cacheControl.includes('no-store')) {
    suggestions.push("Add appropriate Cache-Control headers to enable browser and CDN caching.");
  } else if (!cacheControl.includes('max-age=')) {
    suggestions.push("Set a specific max-age directive in Cache-Control to control caching duration.");
  } else if (cacheControl.includes('max-age=0')) {
    suggestions.push("Increase max-age value to enable longer caching for static assets.");
  }
  
  if (!etag && !lastModified) {
    suggestions.push("Add ETag or Last-Modified headers to enable conditional requests and reduce bandwidth.");
  }
  
  // Performance suggestions based on server type
  if (serverType.includes("Apache")) {
    suggestions.push("Consider enabling mod_deflate for compression and mod_expires for better caching control.");
  } else if (serverType.includes("Nginx")) {
    suggestions.push("Ensure gzip compression is enabled in your Nginx configuration for text-based resources.");
  } else if (serverType.includes("cloudflare") || serverType.includes("Cloudflare")) {
    suggestions.push("Review your Cloudflare caching rules to optimize edge caching for static assets.");
  }
  
  // Response time suggestions
  if (responseTime > 300) {
    suggestions.push("Consider implementing a CDN to reduce latency for global users.");
  }
  
  if (cachingScore < 50) {
    suggestions.push("Implement a caching strategy with longer TTLs for static assets and shorter ones for dynamic content.");
  }
  
  // Common suggestions for most sites
  suggestions.push("Use HTTP/2 or HTTP/3 to improve connection efficiency and reduce latency.");
  suggestions.push("Consider implementing Brotli compression for better compression ratios than gzip.");
  suggestions.push("Implement content preloading with <link rel='preload'> for critical resources.");
  
  // Limit to 5 suggestions maximum to avoid overwhelming the user
  return suggestions.slice(0, 5);
};
