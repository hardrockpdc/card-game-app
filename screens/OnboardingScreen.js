import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Image,
  FlatList,
  ScrollView,
  Alert,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  HapticTouchable as TouchableOpacity,
  HapticPressable as Pressable,
} from "../components/Haptic";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import {
  loadProfile,
  saveProfile,
} from "../game/profile";
import {
  THEMES_LIST,
  getThemePreviewImage,
  setTheme,
  getTheme,
} from "../game/cardTheme";
import { updateProfile } from "../game/profile";
import { AVATAR_CHOICES } from "../game/avatars";
import { scale, scaleFont } from "../game/responsive";

async function cropToSquare(uri, width, height) {
  const side = Math.min(width || 0, height || 0);
  if (!side) return uri;
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [
      {
        crop: {
          originX: Math.max(0, Math.floor(((width || 0) - side) / 2)),
          originY: Math.max(0, Math.floor(((height || 0) - side) / 2)),
          width: side,
          height: side,
        },
      },
      { resize: { width: 512 } },
    ],
    { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG },
  );
  return result.uri;
}

// Onboarding flow: welcome intro → name → photo → card style → game info → Home.
const APP_ICON = require("../assets/icon.png");

// Game roster grouped by mode, shown on the post-setup info screen.
const SOLO_GAMES = ["Blackjack", "Solitaire", "Go Fish", "Rummy", "Conquián", "Poker", "Last Card"];
const MP_GAMES = ["Go Fish", "Rummy", "Conquián", "Poker", "Last Card", "Who Am I?"];

export default function OnboardingScreen({ navigation }) {
  const { width, height } = useWindowDimensions();

  const [step, setStep] = useState(0); // 0=welcome, 1=name, 2=photo, 3=cardStyle, 4=gameInfo
  const [profile, setProfile] = useState(null);
  const [nameDraft, setNameDraft] = useState("");
  const [photoUri, setPhotoUri] = useState(null);
  const [photoType, setPhotoType] = useState(null);
  const [photoValue, setPhotoValue] = useState(null);
  const [showAvatarGrid, setShowAvatarGrid] = useState(false);
  const [themeIndex, setThemeIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const flatListRef = useRef(null);
  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setThemeIndex(viewableItems[0].index);
    }
  }, []);
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  useEffect(() => {
    loadProfile().then(setProfile);
  }, []);

  // ── Step navigation ─────────────────────────────────────────────────────────

  function handleNameNext() {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      Alert.alert("Enter your name", "Please type a name to continue.");
      return;
    }
    setStep(2);
  }

  // Save profile + theme, then advance to the game-info screen (not Home yet).
  async function handleFinish() {
    setIsSaving(true);
    try {
      const base = profile || {};
      const next = {
        ...base,
        name: nameDraft.trim(),
        ...(photoType ? { photoType, photoValue } : {}),
      };
      await saveProfile(next);

      // Apply the selected card theme
      const [key] = THEMES_LIST[themeIndex];
      setTheme(key);
      await updateProfile({ cardTheme: key });

      setStep(4);
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleEnterApp() {
    navigation.reset({ index: 0, routes: [{ name: "Home" }] });
  }

  // ── Photo helpers ────────────────────────────────────────────────────────────

  async function handlePickFromLibrary() {
    // Uses the Android system photo picker — no media-library permission needed
    // (avoids READ_MEDIA_IMAGES, which Google Play flags for non-gallery apps).
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const uri = await cropToSquare(asset.uri, asset.width, asset.height);
      setPhotoUri(uri);
      setPhotoType("custom");
      setPhotoValue(uri);
      setShowAvatarGrid(false);
    }
  }

  async function handleTakePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Allow camera access to take a photo.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const uri = await cropToSquare(asset.uri, asset.width, asset.height);
      setPhotoUri(uri);
      setPhotoType("custom");
      setPhotoValue(uri);
      setShowAvatarGrid(false);
    }
  }

  function handleChooseAvatar(avatar) {
    setPhotoType("avatar");
    setPhotoValue(avatar.id);
    setPhotoUri(null);
    setShowAvatarGrid(false);
  }

  // ── Render helpers ───────────────────────────────────────────────────────────

  function renderPhotoPreview() {
    if (photoType === "custom" && photoUri) {
      return (
        <Image source={{ uri: photoUri }} style={styles.photoPreview} />
      );
    }
    if (photoType === "avatar" && photoValue) {
      const avatar = AVATAR_CHOICES.find((a) => a.id === photoValue);
      if (avatar) {
        return (
          <View style={[styles.photoPreview, { backgroundColor: avatar.color, alignItems: "center", justifyContent: "center" }]}>
            <Text style={{ fontSize: scale(52) }}>{avatar.emoji}</Text>
          </View>
        );
      }
    }
    return (
      <View style={[styles.photoPreview, styles.photoPlaceholder]}>
        <Text style={styles.photoPlaceholderIcon}>👤</Text>
      </View>
    );
  }

  const previewH = Math.min(height * 0.38, 320);
  const previewW = previewH * 0.7;

  // ── Steps ────────────────────────────────────────────────────────────────────

  if (step === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={[styles.stepContainer, styles.welcomeContainer]}
          keyboardShouldPersistTaps="handled"
        >
          <Image source={APP_ICON} style={styles.welcomeIcon} resizeMode="contain" />
          <Text style={styles.welcomeTitle}>Welcome to Card Night!</Text>
          <Text style={styles.welcomeText}>
            Your home for classic card games — play solo against the computer
            or gather friends for multiplayer. Let's set up your profile.
          </Text>

          <TouchableOpacity
            style={[styles.primaryBtn, styles.welcomeBtn]}
            onPress={() => setStep(1)}
          >
            <Text style={styles.primaryBtnText}>Get Started →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (step === 1) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.stepContainer} keyboardShouldPersistTaps="handled">
          <Text style={styles.stepLabel}>STEP 1 OF 3</Text>
          <Text style={styles.title}>What's your name?</Text>
          <Text style={styles.subtitle}>This is how you'll appear in games.</Text>

          <TextInput
            style={styles.nameInput}
            value={nameDraft}
            onChangeText={setNameDraft}
            placeholder="Enter your name"
            placeholderTextColor="#555"
            maxLength={20}
            autoFocus
            returnKeyType="next"
            onSubmitEditing={handleNameNext}
          />

          <TouchableOpacity
            style={[styles.primaryBtn, !nameDraft.trim() && styles.btnDimmed]}
            onPress={handleNameNext}
          >
            <Text style={styles.primaryBtnText}>Next →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (step === 2) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.stepContainer} keyboardShouldPersistTaps="handled">
          <Text style={styles.stepLabel}>STEP 2 OF 3</Text>
          <Text style={styles.title}>Add a profile photo</Text>
          <Text style={styles.subtitle}>Optional — you can change this later.</Text>

          <View style={styles.photoRow}>
            {renderPhotoPreview()}
          </View>

          {!showAvatarGrid ? (
            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.photoBtn} onPress={handleTakePhoto}>
                <Text style={styles.photoBtnText}>📷 Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoBtn} onPress={handlePickFromLibrary}>
                <Text style={styles.photoBtnText}>🖼️ Choose from Library</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoBtn} onPress={() => setShowAvatarGrid(true)}>
                <Text style={styles.photoBtnText}>😀 Pick an Emoji Avatar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.avatarGrid}>
              {AVATAR_CHOICES.map((avatar) => (
                <TouchableOpacity
                  key={avatar.id}
                  style={[
                    styles.avatarCell,
                    { backgroundColor: avatar.color },
                    photoValue === avatar.id && styles.avatarCellSelected,
                  ]}
                  onPress={() => handleChooseAvatar(avatar)}
                >
                  <Text style={styles.avatarEmoji}>{avatar.emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.navRow}>
            <TouchableOpacity style={styles.skipBtn} onPress={() => setStep(3)}>
              <Text style={styles.skipBtnText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryBtn, styles.navPrimaryBtn]}
              onPress={() => setStep(3)}
            >
              <Text style={styles.primaryBtnText}>Next →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Step 3: Card style
  if (step === 3) {
    return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.cardStepHeader}>
        <Text style={styles.stepLabel}>STEP 3 OF 3</Text>
        <Text style={styles.title}>Choose your card style</Text>
        <Text style={styles.subtitle}>Optional — you can change this later.</Text>
      </View>

      <FlatList
        ref={flatListRef}
        data={THEMES_LIST}
        keyExtractor={([key]) => key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        initialScrollIndex={themeIndex}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        renderItem={({ item: [key] }) => (
          <View style={[styles.themePage, { width }]}>
            <Image
              source={getThemePreviewImage(key)}
              style={{ width: previewW, height: previewH, borderRadius: 12 }}
              resizeMode="contain"
            />
            <Text style={styles.swipeHint}>← swipe to browse →</Text>
          </View>
        )}
      />

      <View style={styles.dotsRow}>
        {THEMES_LIST.map((_, i) => (
          <View key={i} style={[styles.dot, i === themeIndex && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.navRow}>
        <TouchableOpacity style={styles.skipBtn} onPress={handleFinish} disabled={isSaving}>
          <Text style={styles.skipBtnText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryBtn, styles.navPrimaryBtn, isSaving && styles.btnDimmed]}
          onPress={handleFinish}
          disabled={isSaving}
        >
          <Text style={styles.primaryBtnText}>
            {isSaving ? "Saving…" : "Next →"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
    );
  }

  // Step 4: Game info (after profile setup) — what you can play, by mode.
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.stepContainer} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>You're all set! 🎉</Text>
        <Text style={styles.subtitle}>Here's what you can play.</Text>

        <View style={styles.modeCard}>
          <Text style={styles.modeTitle}>🧑‍💻 Solo vs. the computer</Text>
          <Text style={styles.modeGames}>{SOLO_GAMES.join(" · ")}</Text>
        </View>

        <View style={styles.modeCard}>
          <Text style={styles.modeTitle}>👥 With friends (multiplayer)</Text>
          <Text style={styles.modeGames}>{MP_GAMES.join(" · ")}</Text>
          <Text style={styles.modeHint}>
            Play on the same network or online with a room code.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, styles.welcomeBtn]}
          onPress={handleEnterApp}
        >
          <Text style={styles.primaryBtnText}>Let's Play! 🎉</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#1a1a2e",
  },
  stepContainer: {
    flexGrow: 1,
    paddingHorizontal: scale(24),
    paddingTop: scale(32),
    paddingBottom: scale(24),
  },
  welcomeContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  welcomeIcon: {
    width: scale(120),
    height: scale(120),
    borderRadius: scale(28),
    marginBottom: scale(28),
  },
  welcomeTitle: {
    color: "#ffffff",
    fontSize: scaleFont(28),
    fontWeight: "800",
    marginBottom: scale(12),
    textAlign: "center",
  },
  welcomeText: {
    color: "#aab",
    fontSize: scaleFont(15),
    lineHeight: scaleFont(22),
    textAlign: "center",
  },
  welcomeBtn: {
    alignSelf: "stretch",
    marginTop: scale(36),
  },
  modeCard: {
    backgroundColor: "#16213e",
    borderWidth: 1,
    borderColor: "#334",
    borderRadius: scale(14),
    padding: scale(18),
    marginBottom: scale(16),
  },
  modeTitle: {
    color: "#ffffff",
    fontSize: scaleFont(17),
    fontWeight: "700",
    marginBottom: scale(8),
  },
  modeGames: {
    color: "#c4c4d4",
    fontSize: scaleFont(15),
    lineHeight: scaleFont(23),
  },
  modeHint: {
    color: "#7fb3ff",
    fontSize: scaleFont(13),
    marginTop: scale(10),
  },
  stepLabel: {
    color: "#7fb3ff",
    fontSize: scaleFont(12),
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: scale(8),
  },
  title: {
    color: "#ffffff",
    fontSize: scaleFont(28),
    fontWeight: "800",
    marginBottom: scale(8),
  },
  subtitle: {
    color: "#888",
    fontSize: scaleFont(15),
    marginBottom: scale(32),
  },
  nameInput: {
    backgroundColor: "#16213e",
    borderWidth: 1.5,
    borderColor: "#334",
    borderRadius: scale(12),
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
    color: "#ffffff",
    fontSize: scaleFont(20),
    marginBottom: scale(24),
  },
  primaryBtn: {
    backgroundColor: "#7fb3ff",
    borderRadius: scale(12),
    paddingVertical: scale(16),
    alignItems: "center",
  },
  // In the Skip/Next row, the primary button fills the space beside Skip
  navPrimaryBtn: {
    flex: 1,
  },
  primaryBtnText: {
    color: "#08111f",
    fontSize: scaleFont(17),
    fontWeight: "800",
  },
  btnDimmed: {
    opacity: 0.4,
  },
  photoRow: {
    alignItems: "center",
    marginBottom: scale(24),
  },
  photoPreview: {
    width: scale(120),
    height: scale(120),
    borderRadius: scale(60),
    overflow: "hidden",
  },
  photoPlaceholder: {
    backgroundColor: "#1e2a3a",
    borderWidth: 2,
    borderColor: "#334",
    alignItems: "center",
    justifyContent: "center",
  },
  photoPlaceholderIcon: {
    fontSize: scale(48),
  },
  photoActions: {
    gap: scale(12),
    marginBottom: scale(24),
  },
  photoBtn: {
    backgroundColor: "#16213e",
    borderWidth: 1,
    borderColor: "#334",
    borderRadius: scale(12),
    paddingVertical: scale(14),
    paddingHorizontal: scale(16),
    alignItems: "center",
  },
  photoBtnText: {
    color: "#c4c4d4",
    fontSize: scaleFont(16),
  },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(10),
    justifyContent: "center",
    marginBottom: scale(24),
  },
  avatarCell: {
    width: scale(54),
    height: scale(54),
    borderRadius: scale(27),
    alignItems: "center",
    justifyContent: "center",
  },
  avatarCellSelected: {
    borderWidth: 3,
    borderColor: "#7fb3ff",
  },
  avatarEmoji: {
    fontSize: scale(28),
  },
  navRow: {
    flexDirection: "row",
    gap: scale(12),
    paddingHorizontal: scale(24),
    paddingBottom: scale(24),
    paddingTop: scale(8),
  },
  skipBtn: {
    borderWidth: 1.5,
    borderColor: "#334",
    borderRadius: scale(12),
    paddingVertical: scale(16),
    paddingHorizontal: scale(20),
    alignItems: "center",
  },
  skipBtnText: {
    color: "#888",
    fontSize: scaleFont(16),
  },
  cardStepHeader: {
    paddingHorizontal: scale(24),
    paddingTop: scale(32),
    paddingBottom: scale(8),
  },
  themePage: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: scale(16),
  },
  swipeHint: {
    color: "#444",
    fontSize: scaleFont(13),
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    paddingVertical: scale(12),
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#334",
  },
  dotActive: {
    width: 22,
    backgroundColor: "#7fb3ff",
    borderRadius: 4,
  },
});
