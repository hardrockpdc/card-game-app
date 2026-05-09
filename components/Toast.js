import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { playSound } from "../game/sounds";

export function useToast() {
  const [state, setState] = useState({ message: "", revision: 0 });
  const show = useCallback((message) => {
    setState((prev) => ({ message, revision: prev.revision + 1 }));
  }, []);
  return { show, message: state.message, revision: state.revision };
}

export default function Toast({ message, revision }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);

  useEffect(() => {
    if (!message) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    playSound("error");

    Animated.timing(opacity, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();

    timerRef.current = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }).start();
    }, 2000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [revision]);

  if (!message) return null;

  return (
    <Animated.View style={[styles.toast, { opacity }]} pointerEvents="none">
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    bottom: 100,
    alignSelf: "center",
    backgroundColor: "rgba(20,20,35,0.92)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#334",
    paddingHorizontal: 18,
    paddingVertical: 10,
    maxWidth: "80%",
  },
  text: {
    color: "#f0f0ff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
