/**
 * Studio Shawn Kemp Art - Generator Helpers
 *
 * Include this file in your generators to send features and files
 * to studio.shawnkemp.art
 *
 * Usage:
 *   <script src="https://studio.shawnkemp.art/generator-helpers.js"></script>
 *
 * Then call:
 *   await studioAPI.sendFeatures(hash, features);
 *   await studioAPI.sendCanvas(canvas, hash, filename);
 *   await studioAPI.sendSVG(svgString, hash, filename);
 *   await studioAPI.sendText(text, hash, filename);
 *
 * For local development, set the API base before calling:
 *   studioAPI.setApiBase('http://localhost:3000');
 *
 * For server-side generation (skart mode):
 *   if (studioAPI.isSkartMode()) {
 *     // Auto-run generation and call signalComplete() when done
 *     await generateAndExport();
 *     studioAPI.signalComplete();
 *   }
 */

(function (global) {
  'use strict';

  // Check for server-injected API_BASE first (for Puppeteer execution)
  // Falls back to production URL, can be overridden via setApiBase()
  let API_BASE = global.__STUDIO_API_BASE__ || 'https://studio-shawnkemp-art.vercel.app';

  if (global.__STUDIO_API_BASE__) {
    console.log('[studioAPI] Using server-injected API_BASE:', API_BASE);
  }

  /**
   * Set the API base URL (useful for local development)
   * @param {string} url - The base URL (e.g., 'http://localhost:3000')
   */
  function setApiBase(url) {
    API_BASE = url.replace(/\/$/, ''); // Remove trailing slash
    console.log('Studio API base set to:', API_BASE);
  }

  /**
   * Get the current API base URL
   * @returns {string}
   */
  function getApiBase() {
    return API_BASE;
  }

  /**
   * Send features/metadata for an edition
   * @param {string} hash - The edition hash
   * @param {object} features - Feature data (width, height, depth, layers, etc.)
   * @returns {Promise<object>} API response
   */
  async function sendFeatures(hash, features) {
    console.log(`[studioAPI] sendFeatures (hash: ${hash})`, features);

    try {
      const response = await fetch(`${API_BASE}/api/edition/features`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash, ...features }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error(`[studioAPI] sendFeatures FAILED`, error);
        throw new Error(error.error || 'Failed to send features');
      }

      const result = await response.json();
      console.log(`[studioAPI] sendFeatures SUCCESS`, result);
      return result;
    } catch (err) {
      console.error(`[studioAPI] sendFeatures ERROR`, err);
      throw err;
    }
  }

  /**
   * Send a canvas as PNG
   * @param {HTMLCanvasElement} canvas - The canvas element
   * @param {string} hash - The edition hash
   * @param {string} [filename] - Optional filename (defaults to hash.png)
   * @returns {Promise<object>} API response with file URL
   */
  async function sendCanvas(canvas, hash, filename) {
    const dataUrl = canvas.toDataURL('image/png');
    const fname = filename || `${hash}.png`;

    console.log(`[studioAPI] sendCanvas: ${fname} (hash: ${hash})`);

    try {
      const response = await fetch(`${API_BASE}/api/edition/file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hash,
          filename: fname,
          content: dataUrl,
          contentType: 'image/png',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error(`[studioAPI] sendCanvas FAILED: ${fname}`, error);
        throw new Error(error.error || 'Failed to upload canvas');
      }

      const result = await response.json();
      console.log(`[studioAPI] sendCanvas SUCCESS: ${fname}`, result);
      return result;
    } catch (err) {
      console.error(`[studioAPI] sendCanvas ERROR: ${fname}`, err);
      throw err;
    }
  }

  /**
   * Send an SVG string
   * @param {string} svgString - The SVG content as a string
   * @param {string} hash - The edition hash
   * @param {string} [filename] - Optional filename (defaults to hash.svg)
   * @returns {Promise<object>} API response with file URL
   */
  async function sendSVG(svgString, hash, filename) {
    const base64 = btoa(unescape(encodeURIComponent(svgString)));
    const fname = filename || `${hash}.svg`;

    console.log(`[studioAPI] sendSVG: ${fname} (hash: ${hash})`);

    try {
      const response = await fetch(`${API_BASE}/api/edition/file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hash,
          filename: fname,
          content: base64,
          contentType: 'image/svg+xml',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error(`[studioAPI] sendSVG FAILED: ${fname}`, error);
        throw new Error(error.error || 'Failed to upload SVG');
      }

      const result = await response.json();
      console.log(`[studioAPI] sendSVG SUCCESS: ${fname}`, result);
      return result;
    } catch (err) {
      console.error(`[studioAPI] sendSVG ERROR: ${fname}`, err);
      throw err;
    }
  }

  /**
   * Send text content (e.g., JSON, colors)
   * @param {string} text - The text content
   * @param {string} hash - The edition hash
   * @param {string} filename - The filename (e.g., "Colors-hash.json")
   * @returns {Promise<object>} API response with file URL
   */
  async function sendText(text, hash, filename) {
    const base64 = btoa(unescape(encodeURIComponent(text)));

    console.log(`[studioAPI] sendText: ${filename} (hash: ${hash})`);

    try {
      const response = await fetch(`${API_BASE}/api/edition/file`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hash,
          filename,
          content: base64,
          contentType: filename.endsWith('.json') ? 'application/json' : 'text/plain',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error(`[studioAPI] sendText FAILED: ${filename}`, error);
        throw new Error(error.error || 'Failed to upload text');
      }

      const result = await response.json();
      console.log(`[studioAPI] sendText SUCCESS: ${filename}`, result);
      return result;
    } catch (err) {
      console.error(`[studioAPI] sendText ERROR: ${filename}`, err);
      throw err;
    }
  }

  /**
   * Send all exports for an edition (helper for common workflow)
   * @param {object} options
   * @param {string} options.hash - Edition hash
   * @param {HTMLCanvasElement} options.canvas - Main canvas
   * @param {object} [options.features] - Feature metadata
   * @param {function} [options.getSVG] - Function that returns SVG string
   * @param {object} [options.colors] - Colors/metadata to save as JSON
   * @param {Array<{name: string, color: string}>} [options.frameVariants] - Frame variants to render
   * @param {function} [options.setFrameColor] - Function to set frame color before capture
   */
  async function sendAllExports(options) {
    const {
      hash,
      canvas,
      features,
      getSVG,
      colors,
      frameVariants,
      setFrameColor,
    } = options;

    const results = {
      features: null,
      mainImage: null,
      svg: null,
      colors: null,
      framed: [],
    };

    try {
      // Send features first
      if (features) {
        results.features = await sendFeatures(hash, features);
        console.log('Features sent:', results.features);
      }

      // Send main canvas
      if (canvas) {
        results.mainImage = await sendCanvas(canvas, hash);
        console.log('Main image sent:', results.mainImage);
      }

      // Send SVG
      if (getSVG) {
        const svgString = getSVG();
        results.svg = await sendSVG(svgString, hash);
        console.log('SVG sent:', results.svg);
      }

      // Send colors/metadata as JSON
      if (colors) {
        const colorJson = JSON.stringify(colors, null, 2);
        results.colors = await sendText(colorJson, hash, `Colors-${hash}.json`);
        console.log('Colors sent:', results.colors);
      }

      // Send framed variants
      if (frameVariants && setFrameColor && canvas) {
        for (const variant of frameVariants) {
          setFrameColor(variant.color);
          // Small delay for render
          await new Promise((resolve) => setTimeout(resolve, 100));
          const framedResult = await sendCanvas(
            canvas,
            hash,
            `Framed${variant.name}-${hash}.png`
          );
          results.framed.push(framedResult);
          console.log(`Framed ${variant.name} sent:`, framedResult);
        }
      }

      return results;
    } catch (error) {
      console.error('Error in sendAllExports:', error);
      throw error;
    }
  }

  /**
   * Notify parent window that generation is complete
   * (For iframe-embedded generators)
   * @param {object} data - Data to send (hash, blueprints, thumbnailDataUrl)
   */
  function notifyGenerationComplete(data) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        { type: 'GENERATION_COMPLETE', data },
        '*'
      );
    }
  }

  /**
   * Notify parent window of an error
   * @param {string} message - Error message
   */
  function notifyGenerationError(message) {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        { type: 'GENERATION_ERROR', data: { message } },
        '*'
      );
    }
  }

  /**
   * Listen for generation trigger from parent window
   * @param {function} callback - Called when parent requests generation
   */
  function onGenerateRequest(callback) {
    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'GENERATE') {
        callback(event.data);
      }
    });
  }

  /**
   * Check if running in server-side generation mode (skart=1)
   * When true, the generator should auto-run and call signalComplete() when done
   * @returns {boolean}
   */
  function isSkartMode() {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('skart') === '1';
    } catch {
      return false;
    }
  }

  /**
   * Signal that generation is complete (for server-side execution)
   * This logs a message that Puppeteer listens for to know generation is done
   * @param {boolean} [success=true] - Whether generation succeeded
   * @param {string} [error=null] - Error message if failed
   */
  function signalComplete(success = true, error = null) {
    if (success) {
      console.log('[GENERATION_COMPLETE]');
    } else {
      console.log(`[GENERATION_ERROR] ${error || 'Unknown error'}`);
    }
    // Also notify parent window (for iframe mode)
    notifyGenerationComplete({ success, error });
  }

  /**
   * Get the hash from URL parameters (convenience method)
   * Supports both 'fxhash' and 'hash' parameter names
   * @returns {string|null}
   */
  function getHashFromUrl() {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('fxhash') || params.get('hash') || null;
    } catch {
      return null;
    }
  }

  // Expose API
  global.studioAPI = {
    setApiBase,
    getApiBase,
    sendFeatures,
    sendCanvas,
    sendSVG,
    sendText,
    sendAllExports,
    notifyGenerationComplete,
    notifyGenerationError,
    onGenerateRequest,
    isSkartMode,
    signalComplete,
    getHashFromUrl,
  };
})(typeof window !== 'undefined' ? window : this);
