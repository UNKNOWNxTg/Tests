import axios, { AxiosRequestConfig } from 'axios';
import envConfig from '../../config/env';
import proxyManager from './proxyManager';

export interface GenerationOptions {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  seed?: number;
  model?: string;
  nologo?: boolean;
  enhance?: boolean;
}

export interface GenerationResult {
  success: boolean;
  imageUrl?: string;
  imageBuffer?: Buffer;
  error?: string;
  metadata?: {
    model: string;
    seed: number;
    width: number;
    height: number;
    prompt: string;
    negativePrompt?: string;
    generationTime: number;
  };
}

const MODELS = {
  'flux-realism': 'Flux Realism',
  'any-dark': 'Any Dark',
  'flux-anime': 'Flux Anime',
  'flux-3d': 'Flux 3D',
  'turbo': 'Turbo',
  'any-light': 'Any Light',
  'deliberate': 'Deliberate',
  'midjourney': 'Midjourney Style',
  'anime-pastel-dream': 'Anime Pastel Dream',
  'stable-diffusion-xl': 'SDXL',
};

class PollinationsService {
  private readonly baseUrl = 'https://image.pollinations.ai';
  private readonly maxRetries = envConfig.MAX_RETRIES;
  private readonly timeout = envConfig.REQUEST_TIMEOUT;

  getAvailableModels(): Record<string, string> {
    return MODELS;
  }

  private async makeRequest(
    url: string,
    options: AxiosRequestConfig = {},
    retryCount = 0
  ): Promise<Buffer> {
    const startTime = Date.now();
    
    try {
      const config: AxiosRequestConfig = {
        ...options,
        responseType: 'arraybuffer',
        timeout: this.timeout,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          ...options.headers,
        },
      };

      // Try with proxy first if available
      const proxy = proxyManager.getProxy();
      
      const response = await axios({
        ...config,
        url,
        // Proxy support can be added here with https-proxy-agent
      });

      const responseTime = Date.now() - startTime;
      
      if (proxy) {
        proxyManager.markProxySuccess(proxy, responseTime);
      }

      return Buffer.from(response.data);
    } catch (error: any) {
      const proxy = proxyManager.getProxy();
      if (proxy) {
        proxyManager.markProxyFailed(proxy);
      }

      // Retry logic
      if (retryCount < this.maxRetries) {
        console.log(`🔄 Retrying request (${retryCount + 1}/${this.maxRetries})...`);
        await this.delay(1000 * (retryCount + 1)); // Exponential backoff
        return this.makeRequest(url, options, retryCount + 1);
      }

      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async generateImage(options: GenerationOptions): Promise<GenerationResult> {
    const startTime = Date.now();
    
    try {
      const {
        prompt,
        negativePrompt,
        width = 1024,
        height = 1024,
        seed = Math.floor(Math.random() * 1000000),
        model = 'flux-realism',
        nologo = true,
        enhance = true,
      } = options;

      // Validate prompt
      if (!prompt || prompt.trim().length === 0) {
        return {
          success: false,
          error: 'Prompt is required',
        };
      }

      // Build URL for Pollinations API
      const encodedPrompt = encodeURIComponent(prompt.trim());
      let imageUrl = `${this.baseUrl}/prompt/${encodedPrompt}`;
      
      // Add parameters
      const params: string[] = [
        `width=${width}`,
        `height=${height}`,
        `seed=${seed}`,
        `model=${model}`,
        `nologo=${nologo}`,
        `enhance=${enhance}`,
      ];

      if (negativePrompt && negativePrompt.trim()) {
        params.push(`negative_prompt=${encodeURIComponent(negativePrompt.trim())}`);
      }

      imageUrl += `?${params.join('&')}`;

      console.log(`🎨 Generating image: ${prompt.substring(0, 50)}...`);
      console.log(`📷 Model: ${model}, Size: ${width}x${height}, Seed: ${seed}`);

      // Fetch the image
      const imageBuffer = await this.makeRequest(imageUrl);

      const generationTime = Date.now() - startTime;

      console.log(`✅ Image generated in ${generationTime}ms`);

      return {
        success: true,
        imageBuffer,
        imageUrl: `${this.baseUrl}/prompt/${encodedPrompt}?${params.join('&')}`,
        metadata: {
          model,
          seed,
          width,
          height,
          prompt: prompt.trim(),
          negativePrompt: negativePrompt?.trim(),
          generationTime,
        },
      };
    } catch (error: any) {
      console.error('❌ Image generation failed:', error.message);
      
      return {
        success: false,
        error: error.message || 'Failed to generate image',
      };
    }
  }

  async getImageURL(options: GenerationOptions): Promise<string> {
    const {
      prompt,
      negativePrompt,
      width = 1024,
      height = 1024,
      seed = Math.floor(Math.random() * 1000000),
      model = 'flux-realism',
      nologo = true,
      enhance = true,
    } = options;

    const encodedPrompt = encodeURIComponent(prompt.trim());
    let imageUrl = `${this.baseUrl}/prompt/${encodedPrompt}`;
    
    const params: string[] = [
      `width=${width}`,
      `height=${height}`,
      `seed=${seed}`,
      `model=${model}`,
      `nologo=${nologo}`,
      `enhance=${enhance}`,
    ];

    if (negativePrompt && negativePrompt.trim()) {
      params.push(`negative_prompt=${encodeURIComponent(negativePrompt.trim())}`);
    }

    return `${imageUrl}?${params.join('&')}`;
  }

  async upscaleImage(imageBuffer: Buffer, scale: number = 2): Promise<Buffer> {
    try {
      // Note: In production, you would use a real upscaling service
      // This is a placeholder that returns the original image
      console.log(`🔍 Upscaling image by ${scale}x`);
      return imageBuffer;
    } catch (error: any) {
      console.error('❌ Upscaling failed:', error.message);
      throw error;
    }
  }

  async createVariation(
    imageBuffer: Buffer,
    options: Omit<GenerationOptions, 'prompt'>
  ): Promise<GenerationResult> {
    // Create variation by using similar prompt with slight modifications
    // In production, you would use img2img or similar technology
    return this.generateImage({
      ...options,
      seed: Math.floor(Math.random() * 1000000),
    });
  }
}

export const pollinationsService = new PollinationsService();
export default pollinationsService;
