import { Injectable } from '@nestjs/common';

export type PassportOcrResult = { errorMessage: string };

@Injectable()
export class PassportOcrService {
  extract(): Promise<PassportOcrResult> {
    const provider = process.env.PASSPORT_OCR_PROVIDER ?? 'manual';
    return Promise.resolve({
      errorMessage:
        provider === 'manual'
          ? 'OCR is not configured. Enter passport values manually to continue.'
          : 'The configured OCR provider is unavailable. Enter passport values manually to continue.',
    });
  }
}
