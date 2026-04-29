import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  useWindowDimensions,
} from "react-native";

export default function HomeScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isSmallScreen = width < 380;
  const isTablet = width >= 768;

  const titleSize = isSmallScreen ? 34 : isTablet ? 56 : 44;
  const subtitleSize = isSmallScreen ? 14 : 16;
  const buttonHorizontal = isSmallScreen ? 22 : isTablet ? 56 : 44;
  const buttonVertical = isSmallScreen ? 14 : 18;
  const buttonTextSize = isSmallScreen ? 18 : 20;
  const containerPadding = isSmallScreen ? 16 : 20;
  const contentMaxWidth = isTablet ? 520 : 440;

  const [profileName, setProfileName] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [draftName, setDraftName] = useState("");

  function openModal() {
    setDraftName(profileName);
    setModalVisible(true);
  }

  function handleSave() {
    setProfileName(draftName.trim());
    setModalVisible(false);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { padding: containerPadding },
        ]}
      >
        <View style={[styles.content, { maxWidth: contentMaxWidth }]}>
          <Text style={[styles.title, { fontSize: titleSize }]}>
            🎴 Card Night
          </Text>
          <Text style={[styles.subtitle, { fontSize: subtitleSize }]}>
            Play with friends, anywhere
          </Text>

          <TouchableOpacity
            style={[
              styles.singlePlayerButton,
              {
                paddingVertical: buttonVertical,
                paddingHorizontal: buttonHorizontal,
              },
            ]}
            onPress={() => navigation.navigate("SinglePlayerSetup", { profileName })}
          >
            <Text
              style={[
                styles.singlePlayerButtonText,
                { fontSize: buttonTextSize },
              ]}
            >
              Single Player
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.primaryButton,
              {
                paddingVertical: buttonVertical,
                paddingHorizontal: buttonHorizontal,
              },
            ]}
            onPress={() => navigation.navigate("HostSetup", { profileName })}
          >
            <Text
              style={[styles.primaryButtonText, { fontSize: buttonTextSize }]}
            >
              Host a Game
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.secondaryButton,
              {
                paddingVertical: buttonVertical,
                paddingHorizontal: buttonHorizontal,
              },
            ]}
            onPress={() => navigation.navigate("Join", { profileName })}
          >
            <Text
              style={[styles.secondaryButtonText, { fontSize: buttonTextSize }]}
            >
              Join a Game
            </Text>
          </TouchableOpacity>

          <View style={styles.bottomLinks}>
            <TouchableOpacity
              style={styles.bottomLink}
              onPress={() => navigation.navigate("HowToPlay")}
            >
              <Text style={styles.linkText}>📖 How to Play</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bottomLink}
              onPress={() => navigation.navigate("Settings")}
            >
              <Text style={styles.linkText}>⚙️ Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Floating profile avatar */}
      <TouchableOpacity style={styles.avatarBtn} onPress={openModal}>
        <View style={[styles.avatarCircle, profileName ? styles.avatarCircleSet : null]}>
          <Text style={styles.avatarText}>
            {profileName ? profileName[0].toUpperCase() : "?"}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Profile modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Your Profile</Text>

            <View style={styles.photoRow}>
              <View style={styles.photoCircle}>
                <Text style={styles.photoEmoji}>📷</Text>
              </View>
              <Text style={styles.photoHint}>Photo coming soon</Text>
            </View>

            <TextInput
              style={styles.modalInput}
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Enter your name"
              placeholderTextColor="#555"
              maxLength={20}
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  },
  content: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    color: "#b0b0c0",
    textAlign: "center",
    marginBottom: 36,
  },
  singlePlayerButton: {
    backgroundColor: "transparent",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#4caf50",
    marginBottom: 16,
    width: "100%",
    alignItems: "center",
    maxWidth: 420,
  },
  singlePlayerButtonText: {
    color: "#4caf50",
    fontWeight: "bold",
  },
  primaryButton: {
    backgroundColor: "#e94560",
    borderRadius: 12,
    marginBottom: 16,
    width: "100%",
    alignItems: "center",
    maxWidth: 420,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#e94560",
    width: "100%",
    alignItems: "center",
    maxWidth: 420,
  },
  secondaryButtonText: {
    color: "#e94560",
    fontWeight: "bold",
  },
  bottomLinks: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    marginTop: 32,
  },
  bottomLink: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  linkText: {
    color: "#b0b0c0",
    fontSize: 16,
  },

  // ── Floating avatar ─────────────────────────────────────────────────────────
  avatarBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#334455",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarCircleSet: {
    backgroundColor: "#e94560",
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },

  // ── Profile modal ───────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalBox: {
    backgroundColor: "#16213e",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 360,
  },
  modalTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  photoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 20,
  },
  photoCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#0d1b2a",
    borderWidth: 1.5,
    borderColor: "#334",
    alignItems: "center",
    justifyContent: "center",
  },
  photoEmoji: {
    fontSize: 22,
  },
  photoHint: {
    color: "#666666",
    fontSize: 13,
  },
  modalInput: {
    backgroundColor: "#0d1b2a",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#ffffff",
    fontSize: 17,
    borderWidth: 1.5,
    borderColor: "#334",
    marginBottom: 16,
  },
  saveBtn: {
    backgroundColor: "#e94560",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  saveBtnText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 10,
  },
  cancelBtnText: {
    color: "#b0b0c0",
    fontSize: 15,
  },
});
