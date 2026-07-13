import { IAiRewriter } from '../../../core/ports/IAiRewriter';
import { RewriteMode } from '../../../shared/types';
import { getConfigStore } from '../storage/configStore';
import * as https from 'https';

export class AiRewriter implements IAiRewriter {
  public async rewrite(
    text: string,
    mode: RewriteMode,
    options?: {
      aiModel?: string;
      aiService?: 'gemini' | 'openrouter' | 'local';
    }
  ): Promise<string> {
    if (!text || text.trim() === '') return '';

    const config = getConfigStore().getConfig();
    const service = options?.aiService || config.aiMode;

    if (service === 'gemini') {
      const apiKey = config.geminiApiKey;
      const model = options?.aiModel || config.geminiModel || 'gemini-1.5-flash';
      if (apiKey && apiKey.trim() !== '') {
        try {
          console.log(`Rewriting headline using Gemini AI (model: ${model}) in mode: ${mode}`);
          return await this.rewriteWithGemini(text, mode, model, apiKey);
        } catch (err) {
          console.error('Gemini rewrite failed, falling back to local rewriter:', err);
          return this.rewriteLocally(text, mode);
        }
      }
    } else if (service === 'openrouter') {
      const apiKey = config.openrouterApiKey;
      const model = options?.aiModel || config.openrouterModel || 'google/gemini-2.5-flash';
      if (apiKey && apiKey.trim() !== '') {
        try {
          console.log(`Rewriting headline using OpenRouter AI (model: ${model}) in mode: ${mode}`);
          return await this.rewriteWithOpenRouter(text, mode, model, apiKey);
        } catch (err) {
          console.error('OpenRouter rewrite failed, falling back to local rewriter:', err);
          return this.rewriteLocally(text, mode);
        }
      }
    }

    console.log(`Rewriting headline locally (local mode or no API credentials) in mode: ${mode}`);
    return this.rewriteLocally(text, mode);
  }

  private rewriteLocally(text: string, mode: RewriteMode): string {
    const cleanText = text.trim();
    switch (mode) {
      case 'Original':
        return cleanText;
      case 'Rewrite':
        return `How to ${cleanText.toLowerCase()} for maximum results`;
      case 'Short':
        return cleanText.split(' ').slice(0, 5).join(' ') + '...';
      case 'Curiosity':
        return `The truth about ${cleanText.toLowerCase()} they won't tell you`;
      case 'Viral':
        return `🤯 THIS changes everything: ${cleanText}`;
      case 'Question':
        return `Are you still ${cleanText.toLowerCase()}?`;
      default:
        return cleanText;
    }
  }

  private getPromptForMode(text: string, mode: RewriteMode): string {
    switch (mode) {
      case 'Original':
        return text;
      case 'Rewrite':
        return `Paraphrase this short headline to make it more engaging and clear: "${text}". Keep it short (under 8 words). Respond with only the rewritten headline.`;
      case 'Short':
        return `Shorten this headline to 3-5 punchy words: "${text}". Respond with only the shortened headline.`;
      case 'Curiosity':
        return `Rewrite this headline to create massive curiosity/mystery: "${text}". Keep it under 8 words. Respond with only the rewritten headline.`;
      case 'Viral':
        return `Rewrite this headline to make it a viral hook with an emoji: "${text}". Keep it punchy and under 8 words. Respond with only the rewritten headline.`;
      case 'Question':
        return `Turn this headline into an engaging question: "${text}". Keep it under 8 words. Respond with only the question.`;
      default:
        return `Clean up and format this headline: "${text}". Respond with only the cleaned headline.`;
    }
  }

  private rewriteWithGemini(text: string, mode: RewriteMode, model: string, apiKey: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (mode === 'Original') {
        resolve(text);
        return;
      }

      const prompt = this.getPromptForMode(text, mode);
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
          temperature: 0.7,
          maxOutputTokens: 50,
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
            const generatedText = response.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (generatedText) {
              resolve(generatedText.replace(/^["']|["']$/g, '').trim());
            } else {
              reject(new Error(`Unexpected response structure: ${body}`));
            }
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

  private rewriteWithOpenRouter(text: string, mode: RewriteMode, model: string, apiKey: string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (mode === 'Original') {
        resolve(text);
        return;
      }

      const prompt = this.getPromptForMode(text, mode);
      const postData = JSON.stringify({
        model: model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7
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
            const generatedText = response.choices?.[0]?.message?.content;
            
            if (generatedText) {
              resolve(generatedText.replace(/^["']|["']$/g, '').trim());
            } else {
              reject(new Error(`Unexpected response structure: ${body}`));
            }
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
}

// Singleton
let instance: AiRewriter | null = null;
export function getAiRewriter(): AiRewriter {
  if (!instance) {
    instance = new AiRewriter();
  }
  return instance;
}
