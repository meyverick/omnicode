/**
 * MinerU API Client Integration
 * 
 * Provides concurrent, non-blocking interaction with the MinerU API
 * for complex document structural extraction.
 */

const API_BASE = 'https://mineru.net/api/v4';
const MAX_RETRIES = 3;

/**
 * Helper to sleep for a given number of milliseconds
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch wrapper with built-in retry logic for 5xx errors and timeouts.
 */
async function fetchWithRetry(url, options, retries = MAX_RETRIES) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            // We set an AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // Handle quota exhaustion or invalid key explicitly (do not retry)
            if (response.status === 401 || response.status === 402) {
                const error = new Error(`MinerU API rejected request: HTTP ${response.status}`);
                error.status = response.status;
                throw error;
            }

            // If 5xx error, throw so it can be caught and retried
            if (response.status >= 500 && response.status < 600) {
                throw new Error(`MinerU API returned 5xx error: HTTP ${response.status}`);
            }

            if (!response.ok) {
                throw new Error(`MinerU API error: HTTP ${response.status}`);
            }

            return response;
        } catch (error) {
            // If it's a 401/402, bubble it up immediately
            if (error.status === 401 || error.status === 402) {
                throw error;
            }

            if (attempt === retries) {
                throw new Error(`MinerU API request failed after ${retries} attempts: ${error.message}`);
            }
            
            // Exponential backoff
            await sleep(attempt * 2000);
        }
    }
}

/**
 * Submit a document to the MinerU extraction API.
 * @param {Buffer} fileBuffer - The binary content of the file.
 * @param {string} fileName - The name of the file (e.g. for extension extraction).
 * @param {string} apiKey - The MINERU_API_KEY.
 * @returns {Promise<string>} The MinerU task ID.
 */
export async function submitExtractionTask(fileBuffer, fileName, apiKey) {
    const formData = new FormData();
    // Wrap buffer in a Blob for FormData
    const blob = new Blob([fileBuffer]);
    formData.append('file', blob, fileName);
    formData.append('language', 'en');
    formData.append('is_ocr', 'true');

    const response = await fetchWithRetry(`${API_BASE}/extract/task`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`
            // Note: browser/node fetch automatically sets the proper multipart boundary 
            // when passing a FormData object.
        },
        body: formData
    });

    const data = await response.json();
    if (!data || !data.taskId) {
        throw new Error('Invalid response from MinerU API: missing taskId');
    }

    return data.taskId;
}

/**
 * Poll the MinerU API for task completion and download the extraction result.
 * @param {string} taskId - The task ID returned from submission.
 * @param {string} apiKey - The MINERU_API_KEY.
 * @returns {Promise<string>} The extracted markdown content.
 */
export async function pollAndDownloadExtraction(taskId, apiKey) {
    const pollInterval = 5000; // 5 seconds
    const maxWaitTime = 300000; // 5 minutes max wait
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
        const response = await fetchWithRetry(`${API_BASE}/extract/task/${taskId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        const data = await response.json();
        
        // Assuming status 'done' or 'completed'
        if (data.status === 'completed' || data.status === 'done') {
            if (!data.downloadUrl) {
                throw new Error('MinerU API reported completion but no downloadUrl was provided.');
            }
            
            // Download the extracted result
            const downloadResponse = await fetchWithRetry(data.downloadUrl, {
                method: 'GET'
            });
            
            // Assuming the result is directly markdown text or a JSON payload containing the markdown
            // We try to parse it as JSON first, if it fails, treat as text
            const textResponse = await downloadResponse.text();
            try {
                const jsonPayload = JSON.parse(textResponse);
                return jsonPayload.markdown || jsonPayload.content || textResponse;
            } catch (e) {
                return textResponse; // Was just plain text/markdown
            }
        }

        if (data.status === 'failed' || data.status === 'error') {
            throw new Error(`MinerU API extraction failed: ${data.errorMessage || 'Unknown error'}`);
        }

        // Wait before polling again
        await sleep(pollInterval);
    }

    throw new Error('MinerU API polling timed out');
}

/**
 * High-level orchestration function to process a complex document.
 * @param {Buffer} fileBuffer 
 * @param {string} fileName 
 * @param {string} apiKey 
 * @returns {Promise<string>} The markdown result.
 */
export async function processComplexDocument(fileBuffer, fileName, apiKey) {
    const taskId = await submitExtractionTask(fileBuffer, fileName, apiKey);
    const markdown = await pollAndDownloadExtraction(taskId, apiKey);
    return markdown;
}
