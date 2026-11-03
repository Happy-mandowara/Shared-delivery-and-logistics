import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { DESIGN_TOKENS } from "@nationx/shared";

export default function MobileRootScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>NationX Delivery Partner</Text>
      <Text style={styles.subtitle}>Khammam Pilot — Offline-First Engine</Text>
      <View style={styles.card}>
        <Text style={styles.cardText}>
          Connected via /api/v1 REST Endpoints
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DESIGN_TOKENS.colors.lightSurface,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: DESIGN_TOKENS.colors.primaryTeal,
  },
  subtitle: {
    fontSize: 14,
    color: "#555",
    marginTop: 6,
  },
  card: {
    marginTop: 20,
    padding: 16,
    borderRadius: DESIGN_TOKENS.ergonomics.borderRadius,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e5e5",
    minHeight: DESIGN_TOKENS.ergonomics.minTouchTargetDp,
    justifyContent: "center",
  },
  cardText: {
    fontSize: 14,
    color: "#333",
  },
});

