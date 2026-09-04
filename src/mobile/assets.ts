import { assetUrl } from "../assetUrl";

export const mobileAssets = {
  iphoneBezel: assetUrl("assets/iphone/Bezel.png"),
  iphoneKeyboard: assetUrl("assets/iphone/Keyboard.png"),
  androidKeyboard: assetUrl("assets/android/Keyboard.png"),
  pixel10Bezel: assetUrl("assets/android/Pixel10.png"),
} as const;
