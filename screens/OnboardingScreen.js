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
  BackHandler,
  useWindowDimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  HapticTouchable as TouchableOpacity,
  HapticPressable as Pressable,
} from "../components/Haptic";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { loadProfile, saveProfile } from "../game/profile";
import {
  THEMES_LIST,
  getThemePreviewImage,
  getThemePrice,
  setTheme,
  getTheme,
} from "../game/cardTheme";
import { updateProfile } from "../game/profile";
import { AVATAR_CHOICES } from "../game/avatars";
import { scale, scaleFont } from "../game/responsive";
import SuitBackground from "../components/SuitBackground";

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

// Survives a kill-and-relaunch mid-flow. The profile isn't written until the
// card-style step finishes, so without this a user who backgrounds the app
// after typing their name comes back to an empty field.
const NAME_DRAFT_KEY = "@cardnight:onboarding:nameDraft";

// Game roster grouped by mode, shown on the post-setup info screen. Keep these
// in step with the Choose Game grid (SinglePlayerSetupScreen) and the
// multiplayer picker — a new player counts them.
const SOLO_GAMES = [
  "Blackjack",
  "Solitaire",
  "Go Fish",
  "Rummy",
  "Conquián",
  "Poker",
  "Last Card",
  "Memory Match",
];
const MP_GAMES = [
  "Go Fish",
  "Rummy",
  "Conquián",
  "Poker",
  "Last Card",
  "Who Am I?",
];

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
    AsyncStorage.getItem(NAME_DRAFT_KEY)
      .then((saved) => {
        if (saved) setNameDraft(saved);
      })
      .catch(() => {});
  }, []);

  // ── Step navigation ─────────────────────────────────────────────────────────

  // This flow used to move in one direction only — every setStep call advanced,
  // there was no back control, and the profile wasn't written until the card
  // step finished. A mistyped name was uncorrectable, and Android's hardware
  // Back (this is the stack's root route, with no handler) quit the app and
  // discarded everything typed so far.
  function goBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  useEffect(() => {
    const onHardwareBack = () => {
      // The summary step is past the point of no return — the profile is
      // already saved, so Back there means "enter the app", not "undo".
      if (step >= 4) return false;
      if (step === 0) return false; // let Back exit from the welcome screen
      goBack();
      return true;
    };
    const sub = BackHandler.addEventListener(
      "hardwareBackPress",
      onHardwareBack,
    );
    return () => sub.remove();
  }, [step]);

  function handleNameChange(text) {
    setNameDraft(text);
    AsyncStorage.setItem(NAME_DRAFT_KEY, text).catch(() => {});
  }

  function handleNameNext() {
    if (!nameDraft.trim()) return; // the button is disabled; belt and braces
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

      // Apply the selected card theme — ONLY if it's actually free.
      //
      // This carousel used to hand out whatever was on screen, and five of the
      // seven decks cost 3,000 coins each. Because isThemeUnlocked grandfathers
      // whatever deck is currently active, that made the giveaway permanent:
      // 15,000 coins of inventory — the single largest sink in an earned-only
      // economy — gone before the player had earned one. Locked decks are still
      // shown here, as something to play towards.
      const [key] = THEMES_LIST[themeIndex];
      if (getThemePrice(key) === 0) {
        setTheme(key);
        await updateProfile({ cardTheme: key });
      }

      await AsyncStorage.removeItem(NAME_DRAFT_KEY).catch(() => {});
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
      return <Image source={{ uri: photoUri }} style={styles.photoPreview} />;
    }
    if (photoType === "avatar" && photoValue) {
      const avatar = AVATAR_CHOICES.find((a) => a.id === photoValue);
      if (avatar) {
        return (
          <View
            style={[
              styles.photoPreview,
              {
                backgroundColor: avatar.color,
                alignItems: "center",
                justifyContent: "center",
              },
            ]}
          >
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

  const selectedThemeKey = THEMES_LIST[themeIndex]?.[0];
  const selectedThemeLocked =
    !!selectedThemeKey && getThemePrice(selectedThemeKey) !== 0;

  // Every setup step gets a way back. Without it the only exit was the hardware
  // Back button, which quit the app.
  function renderBackLink() {
    return (
      <TouchableOpacity
        style={styles.backLink}
        onPress={goBack}
        accessibilityRole="button"
        accessibilityLabel="Go back to the previous step"
      >
        <Text style={styles.backLinkText}>← Back</Text>
      </TouchableOpacity>
    );
  }

  // ── Steps ────────────────────────────────────────────────────────────────────

  if (step === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <SuitBackground />
        <ScrollView
          contentContainerStyle={[
            styles.stepContainer,
            styles.welcomeContainer,
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Image
            source={APP_ICON}
            style={styles.welcomeIcon}
            resizeMode="contain"
          />
          <Text style={styles.welcomeTitle}>Welcome to Card Night!</Text>
          <Text style={styles.welcomeText}>
            Your home for classic card games — play solo against the computer or
            gather friends for multiplayer. Let's set up your profile.
          </Text>

          <TouchableOpacity
            style={[styles.primaryBtn, styles.welcomeBtn]}
            onPress={() => setStep(1)}
            accessibilityRole="button"
            accessibilityLabel="Get started"
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
        <SuitBackground />
        <ScrollView
          contentContainerStyle={styles.stepContainer}
          keyboardShouldPersistTaps="handled"
        >
          {renderBackLink()}
          <Text style={styles.stepLabel}>STEP 1 OF 3</Text>
          <Text style={styles.title}>What's your name?</Text>
          <Text style={styles.subtitle}>
            This is how you'll appear in games.
          </Text>

          <TextInput
            style={styles.nameInput}
            value={nameDraft}
            onChangeText={handleNameChange}
            placeholder="Enter your name"
            placeholderTextColor="#8a8aa0"
            maxLength={20}
            autoFocus
            returnKeyType="next"
            onSubmitEditing={handleNameNext}
            accessibilityLabel="Your name"
          />

          {/* Dimmed AND disabled. It used to be dimmed but still pressable,
              firing an alert — a control that looks dead and isn't. */}
          <TouchableOpacity
            style={[styles.primaryBtn, !nameDraft.trim() && styles.btnDimmed]}
            onPress={handleNameNext}
            disabled={!nameDraft.trim()}
            accessibilityRole="button"
            accessibilityLabel="Next"
            accessibilityState={{ disabled: !nameDraft.trim() }}
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
        <SuitBackground />
        <ScrollView
          contentContainerStyle={styles.stepContainer}
          keyboardShouldPersistTaps="handled"
        >
          {renderBackLink()}
          <Text style={styles.stepLabel}>STEP 2 OF 3</Text>
          <Text style={styles.title}>Add a profile photo</Text>
          <Text style={styles.subtitle}>
            Optional — you can change this later.
          </Text>

          <View style={styles.photoRow}>{renderPhotoPreview()}</View>

          {!showAvatarGrid ? (
            <View style={styles.photoActions}>
              <TouchableOpacity
                style={styles.photoBtn}
                onPress={handleTakePhoto}
                accessibilityRole="button"
                accessibilityLabel="Take a photo with the camera"
              >
                <Text style={styles.photoBtnText}>📷 Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.photoBtn}
                onPress={handlePickFromLibrary}
                accessibilityRole="button"
                accessibilityLabel="Choose a photo from your library"
              >
                <Text style={styles.photoBtnText}>🖼️ Choose from Library</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.photoBtn}
                onPress={() => setShowAvatarGrid(true)}
                accessibilityRole="button"
                accessibilityLabel="Pick an emoji avatar instead"
              >
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
                  accessibilityRole="button"
                  accessibilityLabel={`${avatar.emoji} avatar`}
                  accessibilityState={{ selected: photoValue === avatar.id }}
                >
                  <Text style={styles.avatarEmoji}>{avatar.emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* One button, not two. Skip and Next both called setStep(3) — two
              controls offering one outcome, which reads as a trap. The label
              now tells the truth about what tapping does. */}
          <TouchableOpacity
            style={[styles.primaryBtn, styles.navPrimaryBtn]}
            onPress={() => setStep(3)}
            accessibilityRole="button"
            accessibilityLabel={photoType ? "Next" : "Skip adding a photo"}
          >
            <Text style={styles.primaryBtnText}>
              {photoType ? "Next →" : "Skip for now →"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Step 3: Card style
  if (step === 3) {
    return (
      <SafeAreaView style={styles.safe}>
        <SuitBackground />
        <View style={styles.cardStepHeader}>
          {renderBackLink()}
          <Text style={styles.stepLabel}>STEP 3 OF 3</Text>
          <Text style={styles.title}>Choose your card style</Text>
          <Text style={styles.subtitle}>
            Optional — you can change this later.
          </Text>
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
          renderItem={({ item: [key, theme] }) => {
            const locked = getThemePrice(key) !== 0;
            return (
              <View style={[styles.themePage, { width }]}>
                <Image
                  source={getThemePreviewImage(key)}
                  style={{
                    width: previewW,
                    height: previewH,
                    borderRadius: 12,
                    opacity: locked ? 0.55 : 1,
                  }}
                  resizeMode="contain"
                  accessibilityLabel={`${theme.name} card deck${locked ? ", locked" : ""}`}
                />
                <Text style={styles.themeName}>{theme.name}</Text>
                {locked ? (
                  <Text style={styles.themeLocked}>
                    🔒 {getThemePrice(key).toLocaleString()} 🪙 — earn coins by
                    playing to unlock
                  </Text>
                ) : (
                  <Text style={styles.themeFree}>Free</Text>
                )}
                <Text style={styles.swipeHint}>← swipe to browse →</Text>
              </View>
            );
          }}
        />

        <View style={styles.dotsRow}>
          {THEMES_LIST.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === themeIndex && styles.dotActive]}
            />
          ))}
        </View>

        {/* One button, not two — Skip and Next both called handleFinish. When the
          visible deck is locked, say so plainly rather than appearing to grant
          it and silently falling back. */}
        <View style={styles.navRow}>
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              styles.navPrimaryBtn,
              isSaving && styles.btnDimmed,
            ]}
            onPress={handleFinish}
            disabled={isSaving}
            accessibilityRole="button"
            accessibilityLabel={
              isSaving
                ? "Saving"
                : selectedThemeLocked
                  ? "Continue with the Classic deck"
                  : "Use this deck and continue"
            }
          >
            <Text style={styles.primaryBtnText}>
              {isSaving
                ? "Saving…"
                : selectedThemeLocked
                  ? "Continue with Classic →"
                  : "Use This Deck →"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Step 4: Game info (after profile setup) — what you can play, by mode.
  return (
    <SafeAreaView style={styles.safe}>
      <SuitBackground />
      <ScrollView
        contentContainerStyle={styles.stepContainer}
        keyboardShouldPersistTaps="handled"
      >
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

        <Text style={styles.comingSoon}>
          ✨ New games are added regularly — check back for more!
        </Text>

        <TouchableOpacity
          style={[styles.primaryBtn, styles.welcomeBtn]}
          onPress={handleEnterApp}
          accessibilityRole="button"
          accessibilityLabel="Start playing"
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
  comingSoon: {
    color: "#aab",
    fontSize: scaleFont(14),
    textAlign: "center",
    marginTop: scale(4),
    marginBottom: scale(8),
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
  backLink: {
    alignSelf: "flex-start",
    paddingVertical: scale(8),
    paddingRight: scale(16),
    minHeight: scale(48),
    justifyContent: "center",
  },
  backLinkText: {
    color: "#9aa4c4",
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
  themeName: {
    color: "#ffffff",
    fontSize: scaleFont(20),
    fontWeight: "700",
  },
  themeFree: {
    color: "#7fb3ff",
    fontSize: scaleFont(14),
    fontWeight: "600",
  },
  themeLocked: {
    color: "#ffd700",
    fontSize: scaleFont(14),
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: scale(24),
  },
  // Was #444 on #1a1a2e — about 1.4:1, effectively invisible, and it is the
  // carousel's only affordance.
  swipeHint: {
    color: "#9aa4c4",
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
