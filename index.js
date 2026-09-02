/**
 * Fetches a URL with automatic retries and timeout.
 * @param {string} url - The URL to fetch.
 * @param {Object} options - Fetch options and retry/timeout configuration.
 * @param {number} options.retries - Number of retry attempts (default: 3).
 * @param {number} options.delay - Initial delay in ms (default: 1000).
 * @param {number} options.timeout - Timeout for each request in ms (default: 5000).
 */
async function fetchWithRetry(url, options = {}) {
    const { retries = 3, delay = 1000, timeout = 5000, ...fetchOptions } = options;
    
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        
        try {
            const response = await fetch(url, {
                ...fetchOptions,
                signal: controller.signal
            });
            
            clearTimeout(id);
            
            if (response.ok) {
                return response;
            }
            throw new Error(`HTTP Error: ${response.status}`);
        } catch (error) {
            clearTimeout(id);
            
            let errorMessage = error.message;
            if (error.name === 'AbortError') {
                errorMessage = `Request timed out after ${timeout}ms`;
            }

            if (attempt > retries) {
                throw new Error(`Failed after ${retries} retries. Last error: ${errorMessage}`);
            }
            
            const backoff = delay * Math.pow(2, attempt - 1);
            console.log(`Attempt ${attempt} failed (${errorMessage}). Retrying in ${backoff}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoff));
        }
    }
}

module.exports = { fetchWithRetry };
