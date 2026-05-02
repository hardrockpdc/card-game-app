import React, { useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { THEMES_LIST } from "../game/cardTheme";
import { loadProfile, saveProfile, hasProfileName, subscribeProfile } from "../game/profile";

const AVATAR_CHOICES = [
  { id: "avatar_01", emoji: "🐶", color: "#ff8a80" },
  { id: "avatar_02", emoji: "🐱", color: "#ffab91" },
  { id: "avatar_03", emoji: "🐰", color: "#ffd180" },
  { id: "avatar_04", emoji: "🐼", color: "#ffe57f" },
  { id: "avatar_05", emoji: "🦊", color: "#c5e1a5" },
  { id: "avatar_06", emoji: "🐨", color: "#b2dfdb" },
  { id: "avatar_07", emoji: "🐯", color: "#81d4fa" },
  { id: "avatar_08", emoji: "🦁", color: "#90caf9" },
  { id: "avatar_09", emoji: "🐮", color: "#b39ddb" },
  { id: "avatar_10", emoji: "🐷", color: "#f48fb1" },
  { id: "avatar_11", emoji: "🐸", color: "#a5d6a7" },
  { id: "avatar_12", emoji: "🐵", color: "#bcaaa4" },
  { id: "avatar_13", emoji: "🐔", color: "#fff59d" },
  { id: "avatar_14", emoji: "🦄", color: "#ce93d8" },
  { id: "avatar_15", emoji: "🐙", color: "#80cbc4" },
  { id: "avatar_16", emoji: "🦋", color: "#4dd0e1" },
  { id: "avatar_17", emoji: "🐝", color: "#fff176" },
  { id: "avatar_18", emoji: "🐢", color: "#aed581" },
  { id: "avatar_19", emoji: "🦉", color: "#ffcc80" },
  { id: "avatar_20", emoji: "🐬", color: "#64b5f6" },
];

function getThemeLabel(themeId) {
  return THEMES_LIST.find(([key]) => key === themeId)?.[1]?.name || "Neon";
}

function getAvatarChoice(avatarId) {
  return AVATAR_CHOICES.find((choice) => choice.id === avatarId) || null;
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

    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert(
        "Photo permission needed",
        "Please allow access to your photo library to choose a picture.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
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
  }

  async function handleTakePhoto() {
    if (!profile) {
      return;
    }

    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

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
          <ActivityIndicator color="#e94560" size="large" />
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

          <TouchableOpacity
            style={styles.photoButton}
            onPress={handlePhotoPress}
          >
            {renderPhotoContent()}
          </TouchableOpacity>

          <Text style={styles.photoHint}>Tap your photo to change it</Text>

          {showPhotoActions && (
            <View style={styles.photoActions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => setShowAvatarGrid((current) => !current)}
              >
                <Text style={styles.actionBtnText}>Choose Avatar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handleTakePhoto}
              >
                <Text style={styles.actionBtnText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={handlePickFromLibrary}
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
              >
                <Text style={styles.themeBtnText}>Open</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.statsCard}>
            <Text style={styles.sectionLabel}>Stats</Text>
            <Text style={styles.statsComingSoon}>Coming soon</Text>
          </View>

          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
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
    padding: 24,
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
    marginTop: 12,
    color: "#b0b0c0",
    fontSize: 15,
  },
  title: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    color: "#b0b0c0",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 18,
  },
  banner: {
    backgroundColor: "#16213e",
    borderWidth: 1.5,
    borderColor: "#e94560",
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },
  bannerText: {
    color: "#ffffff",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  photoButton: {
    alignSelf: "center",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#16213e",
    borderWidth: 2,
    borderColor: "#334",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 10,
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
    fontSize: 56,
  },
  photoPlaceholder: {
    color: "#ffffff",
    fontSize: 56,
    fontWeight: "bold",
  },
  photoHint: {
    color: "#666680",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 12,
  },
  photoActions: {
    backgroundColor: "#16213e",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  actionBtn: {
    backgroundColor: "#1f2a44",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#334",
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 10,
  },
  actionBtnText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 15,
  },
  avatarGridWrap: {
    marginBottom: 18,
  },
  sectionLabel: {
    color: "#b0b0c0",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  avatarOption: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  avatarOptionSelected: {
    borderColor: "#ffffff",
  },
  avatarOptionEmoji: {
    fontSize: 26,
  },
  formCard: {
    backgroundColor: "#16213e",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  nameInput: {
    width: "100%",
    backgroundColor: "#0d1b2a",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#334",
    color: "#ffffff",
    fontSize: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  saveBtn: {
    backgroundColor: "#e94560",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  themeCard: {
    backgroundColor: "#16213e",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  themeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  themeInfo: {
    flex: 1,
  },
  themeName: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  themeHint: {
    color: "#b0b0c0",
    fontSize: 13,
  },
  themeBtn: {
    backgroundColor: "#e94560",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    minWidth: 88,
    alignItems: "center",
  },
  themeBtnText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  statsCard: {
    backgroundColor: "#16213e",
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },
  statsComingSoon: {
    color: "#b0b0c0",
    fontSize: 15,
  },
  backBtn: {
    alignItems: "center",
    paddingVertical: 10,
  },
  backBtnText: {
    color: "#b0b0c0",
    fontSize: 15,
  },
});
