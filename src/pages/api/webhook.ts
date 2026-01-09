import type { APIRoute } from 'astro';
import { invalidateCache } from '../../lib/cache';

/**
 * Manual cache refresh endpoint
 * This can be called manually to force a cache refresh
 */
export const POST: APIRoute = async () => {
  try {
    console.log('Manual cache refresh triggered via POST');

    // Invalidate all cache
    await invalidateCache();

    console.log('Cache cleared successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Cache cleared successfully. Next request will fetch fresh data from Notion.',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error clearing cache:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};

/**
 * GET endpoint for easy browser access
 * Visit this URL to clear cache instantly
 */
export const GET: APIRoute = async ({ request }) => {
  // Check if this is a browser request (wants HTML) or API request (wants JSON)
  const acceptHeader = request.headers.get('accept') || '';
  const wantsHtml = acceptHeader.includes('text/html');

  if (wantsHtml) {
    // Return HTML page with clear cache button
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Clear Feitewen Cache</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: monospace;
      background: #faf7f0;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      background: white;
      border: 4px solid black;
      padding: 40px;
      box-shadow: 8px 8px 0 black;
      max-width: 500px;
      width: 100%;
    }
    h1 {
      font-size: 24px;
      text-transform: uppercase;
      margin-bottom: 20px;
    }
    p { margin-bottom: 20px; line-height: 1.6; }
    button {
      background: black;
      color: white;
      border: 4px solid black;
      padding: 16px 32px;
      font-size: 16px;
      font-weight: bold;
      text-transform: uppercase;
      cursor: pointer;
      width: 100%;
      font-family: monospace;
    }
    button:hover { background: #333; }
    button:active { transform: translate(2px, 2px); }
    button:disabled {
      background: #ccc;
      border-color: #ccc;
      cursor: not-allowed;
    }
    #result {
      margin-top: 20px;
      padding: 16px;
      border: 2px solid black;
      display: none;
    }
    .success { background: #d4edda; border-color: #28a745; }
    .error { background: #f8d7da; border-color: #dc3545; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🗑️ Clear Feitewen Cache</h1>
    <p>Click the button below to clear all cached data. The next page load will fetch fresh content from Notion.</p>
    <p><strong>Use this after:</strong><br>
    • Publishing new articles<br>
    • Updating existing articles<br>
    • Changing article images</p>
    <button id="clearBtn" onclick="clearCache()">Clear Cache Now</button>
    <div id="result"></div>
  </div>

  <script>
    async function clearCache() {
      const btn = document.getElementById('clearBtn');
      const result = document.getElementById('result');

      btn.disabled = true;
      btn.textContent = 'Clearing cache...';
      result.style.display = 'none';

      try {
        const response = await fetch('/api/webhook', { method: 'POST' });
        const data = await response.json();

        result.style.display = 'block';
        if (data.success) {
          result.className = 'success';
          result.textContent = '✅ ' + data.message;
          setTimeout(() => {
            window.location.href = '/';
          }, 1500);
        } else {
          result.className = 'error';
          result.textContent = '❌ Error: ' + (data.error || 'Unknown error');
          btn.disabled = false;
          btn.textContent = 'Clear Cache Now';
        }
      } catch (error) {
        result.style.display = 'block';
        result.className = 'error';
        result.textContent = '❌ Network error: ' + error.message;
        btn.disabled = false;
        btn.textContent = 'Clear Cache Now';
      }
    }
  </script>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } else {
    // Return JSON for API requests
    return new Response(
      JSON.stringify({
        status: 'ok',
        message: 'Cache refresh endpoint is active. Use POST to clear cache, or visit in browser for UI.',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
