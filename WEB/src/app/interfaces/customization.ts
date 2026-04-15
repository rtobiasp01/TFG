export type ProductType = 'simple' | 'variable' | 'virtual' | 'custom-personalized';

export interface CustomizationConfig {
  allowImage: boolean;
  enableBackgroundRemoval?: boolean;
  allowText: boolean;
  maxImageSize: number;
  maxTextLength: number;
  imageFormats: string[];
  textPlaceholder?: string;
}

export interface UserCustomization {
  uploadedImageUrl?: string | null;
  customText?: string | null;
  timestamp?: number;
  metadata?: Record<string, unknown>;
}
