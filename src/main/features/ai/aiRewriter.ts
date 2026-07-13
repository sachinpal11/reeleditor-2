import { IAiRewriter } from '../../../core/ports/IAiRewriter';
import { RewriteMode } from '../../../shared/types';
import { getConfigStore } from '../storage/configStore';
import * as https from 'https';

export class AiRewriter implements IAiRewriter {
  public async rewrite(text: string, mode: RewriteMode): Promise<string> {
    if (!text || text.trim() === '') return '';

    const config = getConfigStore().getConfig();
    const apiKey = config.geminiApiKey;

    if (config.aiMode === 'gemini' && apiKey && apiKey.trim() !== '') {
      try {
        console.log(`Rewriting headline using Gemini AI in mode: ${mode}`);
        return await this.rewriteWithGemini(text, mode, apiKey);
      } catch (err) {
        console.error('Gemini rewrite failed, falling back to local rewriter:', err);
        return this.rewriteLocally(text, mode);
      }
    } else {
      console.log(`Rewriting headline locally (no API key or local mode) in mode: ${mode}`);
      return this.rewriteLocally(text, mode);
    }
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

  private rewriteWithGemini(text: string, mode: RewriteMode, apiKey: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let prompt = '';
      switch (mode) {
        case 'Original':
          resolve(text);
          return;
        case 'Rewrite':
          prompt = `Paraphrase this short headline to make it more engaging and clear: "${text}". Keep it short (under 8 words). Respond with only the rewritten headline.`;
          break;
        case 'Short':
          prompt = `Shorten this headline to 3-5 punchy words: "${text}". Respond with only the shortened headline.`;
          break;
        case 'Curiosity':
          prompt = `Rewrite this headline to create massive curiosity/mystery: "${text}". Keep it under 8 words. Respond with only the rewritten headline.`;
          break;
        case 'Viral':
          prompt = `Rewrite this headline to make it a viral hook with an emoji: "${text}". Keep it punchy and under 8 words. Respond with only the rewritten headline.`;
          break;
        case 'Question':
          prompt = `Turn this headline into an engaging question: "${text}". Keep it under 8 words. Respond with only the question.`;
          break;
        default:
          prompt = `Clean up and format this headline: "${text}". Respond with only the cleaned headline.`;
      }

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
        path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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
              // Strip quotes and trim whitespace/newlines
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
}

// Singleton
let instance: AiRewriter | null = null;
export function getAiRewriter(): AiRewriter {
  if (!instance) {
    instance = new AiRewriter();
  }
  return instance;
}
