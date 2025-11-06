import { NativeModules, Platform } from "react-native";

const MODULE_NAME = "ProximityReaderDiscovery";
const nativeDiscoveryModule = NativeModules?.[MODULE_NAME] ?? null;

const canUseNativeDiscovery = Platform.OS === "ios" && !!nativeDiscoveryModule;

export const isProximityReaderDiscoveryAvailable = async () => {
  if (
    !canUseNativeDiscovery ||
    !nativeDiscoveryModule ||
    typeof nativeDiscoveryModule.isAvailable !== "function"
  ) {
    return false;
  }

  try {
    const result = await nativeDiscoveryModule.isAvailable();
    if (typeof result === "boolean") {
      return result;
    }
    if (result && typeof result.available === "boolean") {
      return result.available;
    }
    return Boolean(result);
  } catch {
    return false;
  }
};

export const presentHowToTapGuidance = async () => {
  if (
    !canUseNativeDiscovery ||
    !nativeDiscoveryModule ||
    typeof nativeDiscoveryModule.presentHowToTap !== "function"
  ) {
    throw new Error("Tap to Pay guidance is not available on this device.");
  }

  const result = await nativeDiscoveryModule.presentHowToTap();
  if (result && typeof result.success === "boolean") {
    return result.success;
  }
  return true;
};
