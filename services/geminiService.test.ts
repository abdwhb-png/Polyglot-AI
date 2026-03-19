import { describe, it, expect, vi, beforeEach } from 'vitest';
import { translateTextStream } from './geminiService';
import { GoogleGenAI } from '@google/genai';

// Mock the GoogleGenAI library
vi.mock('@google/genai', () => {
  const mockGenerateContentStream = vi.fn();
  const mockGenerateContent = vi.fn();
  
  return {
    GoogleGenAI: vi.fn(() => ({
      models: {
        generateContentStream: mockGenerateContentStream,
        generateContent: mockGenerateContent,
      }
    })),
    Type: { OBJECT: 'OBJECT', STRING: 'STRING' }
  };
});

describe('geminiService Speed Optimizations', () => {
  let aiInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Get the mock instance
    aiInstance = new GoogleGenAI({ apiKey: 'test' });
  });

  it('should configure thinkingBudget to 0 for maximum speed in translateTextStream', async () => {
    const text = "Hello world";
    const targetLanguage = "French";
    
    // Mock return value for stream
    const mockStream = {
      async *[Symbol.asyncIterator]() {
        yield { text: "Bonjour" };
        yield { text: " le monde" };
      }
    };
    
    aiInstance.models.generateContentStream.mockResolvedValue(mockStream);

    const stream = translateTextStream(text, targetLanguage);
    
    // Consume stream
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    // Check if called with correct config
    expect(aiInstance.models.generateContentStream).toHaveBeenCalledWith(expect.objectContaining({
      model: 'gemini-3-flash-preview',
      contents: text,
      config: expect.objectContaining({
        // Verify Thinking is disabled
        thinkingConfig: { thinkingBudget: 0 },
        // Verify System Instruction is used
        systemInstruction: expect.stringContaining("specialized translation engine"),
        // Verify default temperature
        temperature: 0.5
      })
    }));

    expect(chunks.join('')).toBe("Bonjour le monde");
  });

  it('should handle stream errors gracefully', async () => {
    aiInstance.models.generateContentStream.mockRejectedValue(new Error("API Error"));

    await expect(async () => {
      const stream = translateTextStream("fail", "fr");
      for await (const _ of stream) {}
    }).rejects.toThrow("API Error");
  });
});