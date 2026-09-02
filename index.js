/**
 * Fetches a URL with automatic retries on failure.
 * @param {string} url - The URL to fetch.
 * @param {Object} options - Fetch options and retry configuration.
 * @param {number} options.retries - Number of retry attempts (default: 3).
 * @param {number} options.delay - Initial delay in ms (default: 1000).
 */
async function fetchWithRetry(url, options = {}) {
    const { retries = 3, delay = 1000, ...fetchOptions } = options;
    
    for (let attempt = 1; attempt <= retries + 1; attempt++) {
        try {
            const response = await fetch(url, fetchOptions);
            if (response.ok) {
                return response;
            }
            throw new Error(`HTTP Error: ${response.status}`);
        } catch (error) {
            if (attempt > retries) {
                throw new Error(`Failed after ${retries} retries. Last error: ${error.message}`);
            }
            
            const backoff = delay * Math.pow(2, attempt - 1);
            console.log(`Attempt ${attempt} failed. Retrying in ${backoff}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoff));
        }
    }
}

module.exports = { fetchWithRetry };

// Example Usage (Commented out for library usage)
// (async () => {
//     try {
//         const resp = await fetchWithRetry('https://httpbin.org/status/500', { retries: 2 });
//         const data = await resp.json();
//         console.log(data);
//     } catch (e) {
//         console.error(e.message);
//     }
// })();
