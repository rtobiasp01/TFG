export type ProductType = 'simple' | 'variable' | 'virtual' | 'custom-personalized';

export interface CustomImagePlacement {
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
}

export interface CustomizationConfig {
  allowImage: boolean;
  enableBackgroundRemoval?: boolean;
  allowText: boolean;
  maxImageSize: number;
  maxTextLength: number;
  imageFormats: string[];
  textPlaceholder?: string;
  imagePlacement?: CustomImagePlacement;
}

export interface UserCustomization {
  uploadedImageUrl?: string | null;
  customText?: string | null;
  timestamp?: number;
  metadata?: Record<string, unknown>;
}
