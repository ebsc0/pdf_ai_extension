// Gemini API integration module
class GeminiAPI {
  constructor(apiKey, model = 'gemini-2.5-flash') {
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1/models';
    
    // Log the model being used for debugging
    console.log('Initializing GeminiAPI with model:', model);
  }
  
  async generateContent(prompt, options = {}) {
    const { context, threadHistory, temperature = 0.7, maxTokens = 1000 } = options;
    
    // Build the full prompt with context
    let fullPrompt = '';
    
    if (context) {
      fullPrompt += `Context (highlighted PDF text):\n"${context}"\n\n`;
    }
    
    if (threadHistory && threadHistory.length > 0) {
      fullPrompt += 'Previous conversation:\n';
      threadHistory.forEach(comment => {
        fullPrompt += `${comment.timestamp}: ${comment.text}\n`;
      });
      fullPrompt += '\n';
    }
    
    fullPrompt += `User question: ${prompt}`;
    
    const requestBody = {
      contents: [{
        parts: [{
          text: fullPrompt
        }]
      }],
      generationConfig: {
        temperature: temperature,
        maxOutputTokens: maxTokens,
        topK: 40,
        topP: 0.95
      }
    };
    
    try {
      const url = `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`;
      console.log('Making request to:', url.replace(this.apiKey, '[REDACTED]'));
      console.log('Request body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        let errorMessage = `API error: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error.message || errorData.error.status || errorMessage;
            console.error('API Error details:', errorData.error);
          }
        } catch (e) {
          // If we can't parse the error response, use the status text
          errorMessage = `API error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      console.log('Gemini API response:', JSON.stringify(data, null, 2));
      
      // Check if the response has the expected structure
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No response generated from Gemini API');
      }
      
      const candidate = data.candidates[0];
      
      // Extract text content from the response
      let content = null;
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        // v1 API structure
        content = candidate.content.parts[0].text;
      } else {
        console.error('Unexpected response structure:', candidate);
        throw new Error('Invalid response structure from Gemini API');
      }
      
      if (!content) {
        throw new Error('No text content in Gemini API response');
      }
      
      return {
        success: true,
        content: content,
        usage: data.usageMetadata || {}
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  async testConnection() {
    try {
      const response = await this.generateContent('Hello, please respond with "Connection successful"', {
        maxTokens: 50
      });
      
      return response;
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Get available models
  async listModels() {
    try {
      const response = await fetch(
        `${this.baseUrl}?key=${this.apiKey}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      return {
        success: true,
        models: data.models.filter(model => 
          model.supportedGenerationMethods.includes('generateContent')
        )
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// Export for use in background script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GeminiAPI;
}