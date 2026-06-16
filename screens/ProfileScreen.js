import React, { useCallback, useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  HapticTouchable as TouchableOpacity,
  HapticPressable as Pressable,
} from "../components/Haptic";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useFocusEffect } from "@react-navigation/native";
import { THEMES_LIST } from "../game/cardTheme";
import {
  loadProfile,
  saveProfile,
  hasProfileName,
  subscribeProfile,
} from "../game/profile";
import { getCoins, resetCoins as resetWalletCoins } from "../game/wallet";
import { warn } from "../game/logger";
import { scale, scaleFont } from "../game/responsive";
import { AVATAR_CHOICES, getAvatarChoice } from "../game/avatars";

function getThemeLabel(themeId) {
  return THEMES_LIST.find(([key]) => key === themeId)?.[1]?.name || "Classic";
}

async function cropImageToSquareAsync(uri, width, height) {
  const side = Math.min(width || 0, height || 0);

  if (!side) {
    return uri;
  }

  const originX = Math.max(0, Math.floor(((width || 0) - side) / 2));
  const originY = Math.max(0, Math.floor(((height || 0) - side) / 2));

  const result = await ImageManipulator.manipulateAsync(
    uri,
    [
      {
        crop: {
          originX,
          originY,
          width: side,
          height: side,
        },
      },
      {
        resize: {
          width: 512,
        },
      },
    ],
    {
      compress: 0.92,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );

  return result.uri;
}

export default function ProfileScreen({ navigation, route }) {
  const welcomeMessage = route?.params?.welcomeMessage || null;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [nameDraft, setNameDraft] = useState("");
  const [showPhotoActions, setShowPhotoActions] = useState(false);
  const [showAvatarGrid, setShowAvatarGrid] = useState(false);
  const [coins, setCoins] = useState(null);

  // Refresh coin balance every time this screen comes into focus.
  // useFocusEffect fires on mount AND whenever you navigate back to this screen.
  useFocusEffect(
    useCallback(() => {
      getCoins().then(setCoins);
    }, []),
  );

  async function handleResetCoins() {
    Alert.alert(
      "Reset Coins?",
      "This will reset your coin balance back to 1000. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            await resetWalletCoins();
            setCoins(1000);
          },
        },
      ],
    );
  }

  useEffect(() => {
    let isMounted = true;

    async function bootstrapProfile() {
      const loadedProfile = await loadProfile();

      if (!isMounted) {
        return;
      }

      setProfile(loadedProfile);
      setNameDraft(loadedProfile.name || "");
      setIsLoading(false);
    }

    bootstrapProfile();

    const unsubscribeProfile = subscribeProfile((updatedProfile) => {
      setProfile(updatedProfile);
    });

    return () => {
      isMounted = false;
      unsubscribeProfile();
    };
  }, []);

  const currentAvatar = useMemo(() => {
    if (!profile || profile.photoType !== "avatar" || !profile.photoValue) {
      return null;
    }

    return getAvatarChoice(profile.photoValue);
  }, [profile]);

  const hasName = hasProfileName(profile);

  async function persistProfile(nextProfile) {
    setIsSaving(true);

    try {
      const savedProfile = await saveProfile(nextProfile);
      setProfile(savedProfile);
      setNameDraft(savedProfile.name || "");
      return savedProfile;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveName() {
    const trimmedName = nameDraft.trim();

    if (!trimmedName) {
      Alert.alert("Enter your name", "Please type a name before continuing.");
      return;
    }

    if (!profile) {
      return;
    }

    await persistProfile({
      ...profile,
      name: trimmedName,
    });

    if (navigation?.reset) {
      navigation.reset({
        index: 0,
        routes: [{ name: "Home" }],
      });
    } else {
      navigation.navigate("Home");
    }
  }

  async function handleChooseAvatar(avatar) {
    if (!profile) {
      return;
    }

    await persistProfile({
      ...profile,
      name: nameDraft.trim() || profile.name || "",
      photoType: "avatar",
      photoValue: avatar.id,
    });

    setShowAvatarGrid(false);
    setShowPhotoActions(false);
  }

  async function handlePickFromLibrary() {
    if (!profile) {
      return;
    }

    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        if (permissionResult.canAskAgain === false) {
          Alert.alert(
            "Photo access required",
            "Photo library access is required. Please enable it in your device Settings > Apps > Card Night > Permissions.",
          );
        } else {
          Alert.alert(
            "Photo permission needed",
            "Please allow access to your photo library to choose a picture.",
          );
        }
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      const croppedUri = await cropImageToSquareAsync(
        asset.uri,
        asset.width,
        asset.height,
      );

      await persistProfile({
        ...profile,
        name: nameDraft.trim() || profile.name || "",
        photoType: "custom",
        photoValue: croppedUri,
      });

      setShowPhotoActions(false);
      setShowAvatarGrid(false);
    } catch (err) {
      warn(
        "[ProfileScreen] handlePickFromLibrary error:",
        err?.message,
        err?.code,
        err,
      );
      Alert.alert("Error", "Could not open photo library. Please try again.");
    }
  }

  async function handleTakePhoto() {
    if (!profile) {
      return;
    }

    try {
      const permissionResult =
        await ImagePicker.requestCameraPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          "Camera permission needed",
          "Please allow camera access to take a photo for your profile.",
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 1,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      const croppedUri = await cropImageToSquareAsync(
        asset.uri,
        asset.width,
        asset.height,
      );

      await persistProfile({
        ...profile,
        name: nameDraft.trim() || profile.name || "",
        photoType: "custom",
        photoValue: croppedUri,
      });

      setShowPhotoActions(false);
      setShowAvatarGrid(false);
    } catch (err) {
      warn("[ProfileScreen] handleTakePhoto error:", err);
      Alert.alert("Error", "Could not open camera. Please try again.");
    }
  }

  function handlePhotoPress() {
    setShowPhotoActions((current) => !current);
    setShowAvatarGrid(false);
  }

  function renderPhotoContent() {
    if (profile?.photoType === "custom" && profile.photoValue) {
      return (
        <Image source={{ uri: profile.photoValue }} style={styles.photoImage} />
      );
    }

    if (currentAvatar) {
      return (
        <View
          style={[styles.avatarBadge, { backgroundColor: currentAvatar.color }]}
        >
          <Text style={styles.avatarEmoji}>{currentAvatar.emoji}</Text>
        </View>
      );
    }

    return <Text style={styles.photoPlaceholder}>+</Text>;
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#7fb3ff" size="large" />
          <Text style={styles.loadingText}>Loading your profile…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Profile</Text>
          {welcomeMessage ? (
            <Text style={styles.subtitle}>{welcomeMessage}</Text>
          ) : null}

          {!hasName && (
            <View style={styles.banner}>
              <Text style={styles.bannerText}>
                Set your name first so you can join games.
              </Text>
            </View>
          )}

          <Pressable
            onPress={handlePhotoPress}
            style={({ pressed }) => [
              styles.photoButton,
              pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
          >
            {renderPhotoContent()}
          </Pressable>

          <Text style={styles.photoHint}>Tap your photo to change it</Text>

          {showPhotoActions && (
            <View style={styles.photoActions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => setShowAvatarGrid((current) => !current)}
                accessibilityRole="button"
                accessibilityLabel="Choose an avatar"
              >
                <Text style={styles.actionBtnText}>Choose Avatar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handleTakePhoto}
                accessibilityRole="button"
                accessibilityLabel="Take a new photo"
              >
                <Text style={styles.actionBtnText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handlePickFromLibrary}
                accessibilityRole="button"
                accessibilityLabel="Pick a photo from your library"
              >
                <Text style={styles.actionBtnText}>
                  Choose from Camera Roll
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {showAvatarGrid && (
            <View style={styles.avatarGridWrap}>
              <Text style={styles.sectionLabel}>Pick an avatar</Text>
              <View style={styles.avatarGrid}>
                {AVATAR_CHOICES.map((avatar) => {
                  const isSelected =
                    profile?.photoType === "avatar" &&
                    profile.photoValue === avatar.id;

                  return (
                    <TouchableOpacity
                      key={avatar.id}
                      style={[
                        styles.avatarOption,
                        { backgroundColor: avatar.color },
                        isSelected && styles.avatarOptionSelected,
                      ]}
                      onPress={() => handleChooseAvatar(avatar)}
                    >
                      <Text style={styles.avatarOptionEmoji}>
                        {avatar.emoji}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <View style={styles.formCard}>
            <Text style={styles.sectionLabel}>Name</Text>
            <TextInput
              style={styles.nameInput}
              value={nameDraft}
              onChangeText={setNameDraft}
              placeholder="Enter your name"
              placeholderTextColor="#555570"
              maxLength={20}
              returnKeyType="done"
              onSubmitEditing={handleSaveName}
            />
            <TouchableOpacity
              style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
              onPress={handleSaveName}
              disabled={isSaving}
              accessibilityRole="button"
              accessibilityLabel="Save name"
            >
              <Text style={styles.saveBtnText}>
                {isSaving ? "Saving…" : "Save Name"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.themeCard}>
            <Text style={styles.sectionLabel}>Card Theme</Text>
            <View style={styles.themeRow}>
              <View style={styles.themeInfo}>
                <Text style={styles.themeName}>
                  {getThemeLabel(profile?.cardTheme)}
                </Text>
                <Text style={styles.themeHint}>Choose your card art style</Text>
              </View>
              <TouchableOpacity
                style={styles.themeBtn}
                onPress={() => navigation.navigate("CardThemes")}
                accessibilityRole="button"
                accessibilityLabel="Change card theme"
              >
                <Text style={styles.themeBtnText}>Open</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.walletCard}>
            <Text style={styles.sectionLabel}>Coins</Text>
            <View style={styles.walletRow}>
              <Text style={styles.coinDisplay}>
                🪙 {coins !== null ? coins.toLocaleString() : "—"}
              </Text>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={handleResetCoins}
                accessibilityRole="button"
                accessibilityLabel="Reset coins to 1000"
              >
                <Text style={styles.resetBtnText}>Reset to 1000</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.statsCard}>
            <Text style={styles.sectionLabel}>More</Text>
            <TouchableOpacity
              style={styles.moreRow}
              onPress={() => navigation.navigate("Stats")}
              accessibilityRole="button"
              accessibilityLabel="Stats"
            >
              <Text style={styles.moreRowText}>📊 Stats</Text>
              <Text style={styles.moreRowArrow}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.moreRow, styles.moreRowLast]}
              onPress={() => navigation.navigate("About")}
              accessibilityRole="button"
              accessibilityLabel="About Card Night"
            >
              <Text style={styles.moreRowText}>ℹ️ About Card Night</Text>
              <Text style={styles.moreRowArrow}>›</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backBtnText}>
              {hasName ? "Back to Home" : "Stay here until your name is saved"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  container: {
    flexGrow: 1,
    backgroundColor: "#1a1a2e",
    alignItems: "center",
    justifyContent: "center",
    padding: scale(24),
  },
  content: {
    width: "100%",
    maxWidth: 520,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a1a2e",
  },
  loadingText: {
    marginTop: scale(12),
    color: "#c4c4d4",
    fontSize: scaleFont(15),
  },
  title: {
    color: "#ffffff",
    fontSize: scaleFont(30),
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: scale(10),
  },
  subtitle: {
    color: "#c4c4d4",
    fontSize: scaleFont(16),
    textAlign: "center",
    marginBottom: scale(18),
  },
  banner: {
    backgroundColor: "#16213e",
    borderWidth: 1.5,
    borderColor: "#e94560",
    borderRadius: scale(14),
    padding: scale(14),
    marginBottom: scale(18),
  },
  bannerText: {
    color: "#ffffff",
    fontSize: scaleFont(14),
    textAlign: "center",
    lineHeight: scale(20),
  },
  photoButton: {
    alignSelf: "center",
    width: scale(140),
    height: scale(140),
    borderRadius: scale(70),
    backgroundColor: "#16213e",
    borderWidth: 2,
    borderColor: "#334",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: scale(10),
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  avatarBadge: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEmoji: {
    fontSize: scaleFont(56),
  },
  photoPlaceholder: {
    color: "#ffffff",
    fontSize: scaleFont(56),
    fontWeight: "bold",
  },
  photoHint: {
    color: "#9090a8",
    fontSize: scaleFont(13),
    textAlign: "center",
    marginBottom: scale(12),
  },
  photoActions: {
    backgroundColor: "#16213e",
    borderRadius: scale(14),
    padding: scale(14),
    marginBottom: scale(16),
  },
  actionBtn: {
    backgroundColor: "#1f2a44",
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: "#334",
    paddingVertical: scale(12),
    paddingHorizontal: scale(16),
    alignItems: "center",
    marginBottom: scale(10),
  },
  actionBtnText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: scaleFont(15),
  },
  avatarGridWrap: {
    marginBottom: scale(18),
  },
  sectionLabel: {
    color: "#c4c4d4",
    fontSize: scaleFont(12),
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: scale(10),
  },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(10),
  },
  avatarOption: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  avatarOptionSelected: {
    borderColor: "#ffffff",
  },
  avatarOptionEmoji: {
    fontSize: scaleFont(26),
  },
  formCard: {
    backgroundColor: "#16213e",
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(16),
  },
  nameInput: {
    width: "100%",
    backgroundColor: "#0d1b2a",
    borderRadius: scale(10),
    borderWidth: 1.5,
    borderColor: "#334",
    color: "#ffffff",
    fontSize: scaleFont(18),
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    marginBottom: scale(12),
  },
  saveBtn: {
    backgroundColor: "#e94560",
    borderRadius: scale(10),
    paddingVertical: scale(14),
    alignItems: "center",
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    color: "#ffffff",
    fontSize: scaleFont(16),
    fontWeight: "bold",
  },
  themeCard: {
    backgroundColor: "#16213e",
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(16),
  },
  themeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: scale(16),
  },
  themeInfo: {
    flex: 1,
  },
  themeName: {
    color: "#ffffff",
    fontSize: scaleFont(18),
    fontWeight: "bold",
    marginBottom: scale(4),
  },
  themeHint: {
    color: "#c4c4d4",
    fontSize: scaleFont(13),
  },
  themeBtn: {
    backgroundColor: "#e94560",
    borderRadius: scale(10),
    paddingVertical: scale(10),
    paddingHorizontal: scale(16),
    minWidth: scale(88),
    alignItems: "center",
  },
  themeBtnText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  walletCard: {
    backgroundColor: "#16213e",
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(16),
  },
  walletRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: scale(16),
  },
  coinDisplay: {
    color: "#ffffff",
    fontSize: scaleFont(24),
    fontWeight: "bold",
  },
  resetBtn: {
    backgroundColor: "#1f2a44",
    borderRadius: scale(10),
    borderWidth: 1.5,
    borderColor: "#e94560",
    paddingVertical: scale(10),
    paddingHorizontal: scale(14),
    alignItems: "center",
  },
  resetBtnText: {
    color: "#e94560",
    fontWeight: "bold",
    fontSize: scaleFont(14),
  },
  statsCard: {
    backgroundColor: "#16213e",
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(18),
  },
  moreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: "#22223a",
  },
  moreRowLast: {
    borderBottomWidth: 0,
  },
  moreRowText: {
    color: "#c0c0d4",
    fontSize: scaleFont(15),
  },
  moreRowArrow: {
    color: "#9090a8",
    fontSize: scaleFont(18),
  },
  backBtn: {
    alignItems: "center",
    paddingVertical: scale(10),
  },
  backBtnText: {
    color: "#c4c4d4",
    fontSize: scaleFont(15),
  },
});
