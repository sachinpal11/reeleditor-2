import { HeadlineResponse, WordStyle, StyledSegment } from '../../../shared/types';
import { getConfigStore } from '../storage/configStore';
import { headlinePrompt } from '../../../../prompts/headlinePrompt';
import * as https from 'https';

export class HeadlineAnalyzer {
  public async analyze(
    ocrText: string,
    options?: {
      customPrompt?: string;
      aiModel?: string;
      aiService?: 'gemini' | 'openrouter' | 'local';
    }
  ): Promise<HeadlineResponse> {
    if (!ocrText || ocrText.trim() === '') {
      return { headline: '', lines: [] };
    }

    const config = getConfigStore().getConfig();
    const service = options?.aiService || config.aiMode;
    const rawPrompt = options?.customPrompt || headlinePrompt;
    const prompt = rawPrompt + '\n' + ocrText;

    if (service === 'gemini') {
      const apiKey = config.geminiApiKey;
      const model = options?.aiModel || config.geminiModel || 'gemini-1.5-flash';
      if (apiKey && apiKey.trim() !== '') {
        try {
          console.log(`Analyzing headline with Gemini AI (model: ${model})...`);
          return await this.analyzeWithGeminiWithRetry(prompt, model, apiKey);
        } catch (err) {
          console.error('Gemini headline analysis failed, returning fallback:', err);
          return this.getFallbackResponse(ocrText);
        }
      }
    } else if (service === 'openrouter') {
      const apiKey = config.openrouterApiKey;
      const model = options?.aiModel || config.openrouterModel || 'google/gemini-2.5-flash';
      if (apiKey && apiKey.trim() !== '') {
        try {
          console.log(`Analyzing headline with OpenRouter AI (model: ${model})...`);
          return await this.analyzeWithOpenRouterWithRetry(prompt, model, apiKey);
        } catch (err) {
          console.error('OpenRouter headline analysis failed, returning fallback:', err);
          return this.getFallbackResponse(ocrText);
        }
      }
    }

    console.log('Skipping AI analysis (local mode or no API credentials), returning fallback.');
    return this.getFallbackResponse(ocrText);
  }

  private async analyzeWithGeminiWithRetry(prompt: string, model: string, apiKey: string): Promise<HeadlineResponse> {
    try {
      return await this.analyzeWithGemini(prompt, model, apiKey);
    } catch (firstError) {
      console.warn('First Gemini attempt failed, retrying once...', firstError);
      try {
        return await this.analyzeWithGemini(prompt, model, apiKey);
      } catch (retryError) {
        console.error('Retry Gemini attempt also failed:', retryError);
        throw retryError;
      }
    }
  }

  private analyzeWithGemini(prompt: string, model: string, apiKey: string): Promise<HeadlineResponse> {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 250,
        },
      });

      const options = {
        hostname: 'generativelanguage.googleapis.com',
        path: `/v1beta/models/${model}:generateContent?key=${apiKey}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          try {
            if (res.statusCode !== 200) {
              reject(new Error(`Gemini API returned status code ${res.statusCode}: ${body}`));
              return;
            }

            const response = JSON.parse(body);
            let generatedText = response.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!generatedText) {
              reject(new Error(`Unexpected response structure: ${body}`));
              return;
            }

            const parsed = this.parseAndMapResponse(generatedText);
            resolve(parsed);
          } catch (e: any) {
            reject(new Error(`Failed to parse Gemini API response: ${e.message}`));
          }
        });
      });

      req.on('error', (e) => {
        reject(new Error(`Network error calling Gemini API: ${e.message}`));
      });

      req.write(postData);
      req.end();
    });
  }

  private async analyzeWithOpenRouterWithRetry(prompt: string, model: string, apiKey: string): Promise<HeadlineResponse> {
    try {
      return await this.analyzeWithOpenRouter(prompt, model, apiKey);
    } catch (firstError) {
      console.warn('First OpenRouter attempt failed, retrying once...', firstError);
      try {
        return await this.analyzeWithOpenRouter(prompt, model, apiKey);
      } catch (retryError) {
        console.error('Retry OpenRouter attempt also failed:', retryError);
        throw retryError;
      }
    }
  }

  private analyzeWithOpenRouter(prompt: string, model: string, apiKey: string): Promise<HeadlineResponse> {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2
      });

      const options = {
        hostname: 'openrouter.ai',
        path: '/api/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'ReelEditor',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          try {
            if (res.statusCode !== 200) {
              reject(new Error(`OpenRouter API returned status code ${res.statusCode}: ${body}`));
              return;
            }

            const response = JSON.parse(body);
            let generatedText = response.choices?.[0]?.message?.content;

            if (!generatedText) {
              reject(new Error(`Unexpected OpenRouter response structure: ${body}`));
              return;
            }

            const parsed = this.parseAndMapResponse(generatedText);
            resolve(parsed);
          } catch (e: any) {
            reject(new Error(`Failed to parse OpenRouter API response: ${e.message}`));
          }
        });
      });

      req.on('error', (e) => {
        reject(new Error(`Network error calling OpenRouter API: ${e.message}`));
      });

      req.write(postData);
      req.end();
    });
  }

  private parseAndMapResponse(generatedText: string): HeadlineResponse {
    generatedText = generatedText.trim();
    // Clean up any markdown code fencing if outputted despite instructions
    if (generatedText.startsWith('```')) {
      generatedText = generatedText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
    }

    const data = JSON.parse(generatedText);
    if (!this.validateResponse(data)) {
      throw new Error(`Invalid JSON schema in response: ${generatedText}`);
    }

    const mappedLines: StyledSegment[][] = [];
    let wordIdx = 0;
    for (const lineText of data.lines) {
      const lineWords = lineText.trim().split(/\s+/).filter(Boolean);
      const lineSegments: StyledSegment[] = [];
      for (const lw of lineWords) {
        let style: WordStyle = 'Regular';
        if (wordIdx < data.words.length) {
          style = data.words[wordIdx].style as WordStyle;
          wordIdx++;
        }
        lineSegments.push({ text: lw, style });
      }
      mappedLines.push(lineSegments);
    }

    return {
      headline: data.headline,
      lines: mappedLines,
    };
  }

  private validateResponse(data: any): boolean {
    if (!data || typeof data.headline !== 'string') return false;
    if (!Array.isArray(data.lines)) return false;
    for (const line of data.lines) {
      if (typeof line !== 'string') return false;
    }
    if (!Array.isArray(data.words)) return false;
    for (const item of data.words) {
      if (!item || typeof item.word !== 'string') return false;
      if (item.style !== 'Regular' && item.style !== 'Bold' && item.style !== 'Brand') return false;
    }
    return true;
  }

  private cleanTextFallback(text: string): string {
    return text
      .replace(/@\w+/g, '') // remove handles
      .replace(/\b\d{1,2}:\d{2}\b/g, '') // remove timestamps
      .replace(/[^a-zA-Z0-9\s,.\-!?'"]/g, '') // remove weird symbols
      .replace(/\s+/g, ' ') // normalize whitespace
      .trim();
  }

  private getFallbackResponse(ocrText: string): HeadlineResponse {
    const cleaned = this.cleanTextFallback(ocrText) || 'Untitled Reel';
    return {
      headline: cleaned,
      lines: [
        [
          { text: cleaned, style: 'Regular' }
        ]
      ]
    };
  }
}

let instance: HeadlineAnalyzer | null = null;
export function getHeadlineAnalyzer(): HeadlineAnalyzer {
  if (!instance) {
    instance = new HeadlineAnalyzer();
  }
  return instance;
}
