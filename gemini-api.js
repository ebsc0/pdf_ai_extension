// Gemini API integration module
class GeminiAPI {
  constructor(apiKey, model = 'gemini-pro') {
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
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
      const response = await fetch(
        `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        }
      );
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.candidates && data.candidates.length > 0) {
        const content = data.candidates[0].content.parts[0].text;
        return {
          success: true,
          content: content,
          usage: data.usageMetadata
        };
      } else {
        throw new Error('No response generated');
      }
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