import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { scale, scaleFont } from "../game/responsive";

export default function YourTurnBanner({ visible }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: visible ? 180 : 280,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  return (
    <Animated.View style={[styles.container, { opacity }]} pointerEvents="none">
      <View style={styles.banner}>
        <Text style={styles.title}>Your Turn!</Text>
        <Text style={styles.subtitle}>Make your move</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
  },
  banner: {
    backgroundColor: "rgba(10, 8, 32, 0.93)",
    borderRadius: scale(16),
    borderWidth: 2,
    borderColor: "#e94560",
    paddingVertical: scale(20),
    paddingHorizontal: scale(40),
    alignItems: "center",
    gap: scale(6),
    shadowColor: "#e94560",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  title: {
    color: "#ffffff",
    fontSize: scaleFont(28),
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  subtitle: {
    color: "#c4c4d4",
    fontSize: scaleFont(13),
  },
});
