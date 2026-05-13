import React, { useEffect, useMemo, useReducer, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import Card from "../components/Card";
import GameHeader from "../components/GameHeader";
import EndOfRoundModal from "../components/EndOfRoundModal";
import StatsStrip from "../components/StatsStrip";
import {
  SPIDER_MODE_OPTIONS,
  createSolitaireState,
  getTopCard,
  getVariantOption,
  newGameAction,
  setSpiderModeAction,
  solitaireReducer,
  tapAction,
} from "../game/solitaire";
import { addCoins } from "../game/wallet";
import { recordWin } from "../game/profile";
import { saveGame, loadGame, clearGame } from "../game/gameSaves";
import { getTableTheme } from "../game/tableThemes";
import { scale } from "../game/responsive";

const BG = getTableTheme("solitaire").table;

function solitaireSaveKey(variantId) {
  return `@cardnight:save:solitaire:${variantId}`;
}

// Wraps the official reducer to allow full state restoration without
// modifying the game logic file.
function solitaireReducerWithRestore(state, action) {
  if (action.type === "__RESTORE__") return action.payload;
  return solitaireReducer(state, action);
}

function sameTarget(selected, target) {
  if (!selected || !target) {
    return false;
  }

  return (
    selected.type === target.type &&
    selected.index === target.index &&
    selected.row === target.row &&
    selected.col === target.col &&
    selected.cardIndex === target.cardIndex
  );
}

function isTableauSelection(selected, pileIndex, cardIndex) {
  return (
    selected?.type === "tableau" &&
    selected.index === pileIndex &&
    typeof selected.cardIndex === "number" &&
    cardIndex >= selected.cardIndex
  );
}

function isSpiderSelection(selected, pileIndex, cardIndex) {
  return (
    selected?.type === "tableau" &&
    selected.index === pileIndex &&
    typeof selected.cardIndex === "number" &&
    cardIndex >= selected.cardIndex
  );
}

function isPyramidSelection(selected, row, col) {
  return (
    selected?.type === "pyramid" && selected.row === row && selected.col === col
  );
}

function isTriPeaksSelection(selected, row, col) {
  return (
    selected?.type === "tripeaks" &&
    selected.row === row &&
    selected.col === col
  );
}

function CardSlot({
  card,
  label,
  onPress,
  selected = false,
  disabled = false,
  small = true,
  sizeScale = 1.1,
  style,
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        card ? styles.cardTouch : styles.emptyCard,
        style,
        selected && styles.cardTouchSelected,
        pressed && !disabled && styles.cardTouchPressed,
        disabled && styles.cardTouchDisabled,
      ]}
    >
      {card ? (
        <Card
          rank={card.rankLabel}
          suit={card.symbol}
          faceDown={!card.faceUp}
          small={small}
          sizeScale={sizeScale}
        />
      ) : (
        <Text
          style={styles.emptyCardText}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

function StockSlot({ label, onPress, disabled = false, style }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.stockSlot,
        style,
        pressed && !disabled && styles.cardTouchPressed,
      ]}
    >
      <Text style={styles.stockLabel}>{label}</Text>
    </Pressable>
  );
}

export default function SolitaireGameScreen({ navigation, route }) {
  const routeVariantId = route?.params?.variantId || "klondike";
  const routeSpiderMode = route?.params?.spiderMode || 4;

  const { width } = useWindowDimensions();
  const spiderBoardWidth = Math.max(width - 28, 500);
  // Top row (Klondike): 6 equal slots across boardCard inner width
  // outer padding 14*2=28, boardCard padding 12*2=24, 5 gaps of 4px = 20
  const topSlotW = Math.max(Math.floor((width - 28 - 24 - 20) / 6), 38);
  const topSlotH = Math.round(topSlotW * 1.4);

  const [state, dispatch] = useReducer(solitaireReducerWithRestore, null, () =>
    createSolitaireState(routeVariantId, { spiderMode: routeSpiderMode }),
  );
  const coinRewardedRef = useRef(false);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [showRoundModal, setShowRoundModal] = useState(false);
  const [showStats, setShowStats] = useState(false);
  // Tracks whether the initial mount already dispatched newGameAction so the
  // restore effect (which fires after) knows if it should override it.
  const initialGameDispatched = useRef(false);

  useEffect(() => {
    initialGameDispatched.current = true;
    dispatch(newGameAction(routeVariantId, { spiderMode: routeSpiderMode }));
    coinRewardedRef.current = false;
    setCoinsEarned(0);
  }, [routeVariantId, routeSpiderMode]);

  // Restore saved game on initial mount (fires after newGameAction effect above).
  useEffect(() => {
    async function checkResume() {
      if (!route?.params?.resumeFromSave) return;
      const saved = await loadGame(solitaireSaveKey(routeVariantId));
      if (saved?.state) {
        dispatch({ type: "__RESTORE__", payload: saved.state });
        coinRewardedRef.current = false;
        setCoinsEarned(0);
      }
    }
    checkResume();
  }, []);

  // Auto-save after every move; clear save on win.
  useEffect(() => {
    const key = solitaireSaveKey(state.variantId || routeVariantId);
    if (state.status === "won") {
      clearGame(key);
      return;
    }
    saveGame(key, { state });
  }, [state]);

  useEffect(() => {
    if (state.status === "won" && !coinRewardedRef.current) {
      coinRewardedRef.current = true;
      addCoins(250).then(() => setCoinsEarned(250));
      recordWin("solitaire");
    }
    if (state.status !== "won") {
      coinRewardedRef.current = false;
      setCoinsEarned(0);
    }
  }, [state.status]);

  useEffect(() => {
    if (state.status === "won") setShowRoundModal(true);
  }, [state.status]);

  const variant = useMemo(
    () => getVariantOption(state.variantId),
    [state.variantId],
  );

  const restart = () => {
    coinRewardedRef.current = false;
    setCoinsEarned(0);
    clearGame(solitaireSaveKey(state.variantId || routeVariantId));
    dispatch(newGameAction(state.variantId, { spiderMode: state.spiderMode }));
  };

  const menuItems = [
    { type: "restart", onRestart: restart },
    { type: "howto", gameId: "solitaire" },
    { type: "sound" },
    { type: "theme" },
    { type: "divider" },
    {
      type: "quit",
      onQuit: () => {
        clearGame(solitaireSaveKey(state.variantId || routeVariantId));
        navigation.navigate("Home");
      },
    },
  ];

  const renderStatsBar = () => (
    <View style={styles.statsBar}>
      <View style={styles.metaPill}>
        <Text style={styles.metaPillLabel}>Moves</Text>
        <Text style={styles.metaPillValue}>{state.moves}</Text>
      </View>
      {state.variantId === "spider" ? (
        <>
          <View style={styles.metaPill}>
            <Text style={styles.metaPillLabel}>Suits</Text>
            <Text style={styles.metaPillValue}>{state.spiderMode}</Text>
          </View>
          <View style={styles.modeRow}>
            {SPIDER_MODE_OPTIONS.map((option) => {
              const selected = option.id === state.spiderMode;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => dispatch(setSpiderModeAction(option.id))}
                  style={({ pressed }) => [
                    styles.modeChip,
                    selected && styles.modeChipSelected,
                    pressed && styles.modeChipPressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.modeChipText,
                      selected && styles.modeChipTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
    </View>
  );

  const renderKlondike = () => {
    const wasteTop = getTopCard(state.waste);

    return (
      <View style={styles.boardCard}>
        <View style={[styles.topRow, styles.klondikeTopRow]}>
          <StockSlot
            label={
              state.stock.length > 0 ? `Stock ${state.stock.length}` : "Recycle"
            }
            onPress={() => dispatch(tapAction({ type: "stock" }))}
            style={{ width: topSlotW, height: topSlotH }}
          />

          <CardSlot
            card={wasteTop}
            label="Waste"
            onPress={() => dispatch(tapAction({ type: "waste" }))}
            selected={sameTarget(state.selected, { type: "waste" })}
            style={{
              width: topSlotW,
              height: topSlotH,
              minWidth: topSlotW,
              minHeight: topSlotH,
            }}
          />

          {state.foundations.map((foundation, index) => {
            const top = getTopCard(foundation);
            const selected =
              state.selected?.type === "foundation" &&
              state.selected.index === index;
            return (
              <CardSlot
                key={`foundation-${index}`}
                card={top}
                label={`F${index + 1}`}
                onPress={() =>
                  dispatch(tapAction({ type: "foundation", index }))
                }
                selected={selected}
                style={{
                  width: topSlotW,
                  height: topSlotH,
                  minWidth: topSlotW,
                  minHeight: topSlotH,
                }}
              />
            );
          })}
        </View>

        <View style={styles.tableauRow}>
          {state.tableau.map((pile, pileIndex) => (
            <View key={`klondike-${pileIndex}`} style={styles.tableauColumn}>
              {pile.length === 0 ? (
                <>
                  <View style={styles.tableauTopSpacer} />
                  <Pressable
                    onPress={() =>
                      dispatch(tapAction({ type: "tableau", index: pileIndex }))
                    }
                    style={({ pressed }) => [
                      styles.emptyColumnSlot,
                      pressed && styles.cardTouchPressed,
                      {
                        width: topSlotW,
                        height: topSlotH,
                        minWidth: topSlotW,
                        minHeight: topSlotH,
                      },
                    ]}
                  >
                    <Text style={styles.emptyColumnText}>Empty</Text>
                  </Pressable>
                </>
              ) : (
                <View style={styles.tableauTopSpacer} />
              )}

              {pile.map((card, cardIndex) => {
                const selected = isTableauSelection(
                  state.selected,
                  pileIndex,
                  cardIndex,
                );

                return (
                  <CardSlot
                    key={card.id}
                    card={card}
                    label=""
                    onPress={() =>
                      dispatch(
                        tapAction({
                          type: "tableau",
                          index: pileIndex,
                          cardIndex,
                        }),
                      )
                    }
                    selected={selected}
                    disabled={!card.faceUp}
                    style={[
                      styles.stackCard,
                      cardIndex > 0 && styles.stackCardOverlap,
                    ]}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderSpider = () => (
    <View style={styles.boardCard}>
      <View style={styles.topRow}>
        <StockSlot
          label={
            state.stock.length > 0 ? `Deal ${state.stock.length}` : "No deal"
          }
          onPress={() => dispatch(tapAction({ type: "stock" }))}
        />

        <View style={styles.metaPill}>
          <Text style={styles.metaPillLabel}>Runs</Text>
          <Text style={styles.metaPillValue}>{state.completedRuns || 0}/8</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.spiderScrollContent}
      >
        <View
          style={[
            styles.tableauRow,
            styles.spiderTableauRow,
            { width: spiderBoardWidth },
          ]}
        >
          {state.tableau.map((pile, pileIndex) => (
            <View key={`spider-${pileIndex}`} style={styles.tableauColumn}>
              {pile.length === 0 ? (
                <Pressable
                  onPress={() =>
                    dispatch(
                      tapAction({
                        type: "tableau",
                        index: pileIndex,
                        cardIndex: 0,
                      }),
                    )
                  }
                  style={({ pressed }) => [
                    styles.emptyColumnSlot,
                    pressed && styles.cardTouchPressed,
                  ]}
                >
                  <Text style={styles.emptyColumnText}>Open</Text>
                </Pressable>
              ) : (
                <View style={styles.tableauTopSpacer} />
              )}

              {pile.map((card, cardIndex) => {
                const selected = isSpiderSelection(
                  state.selected,
                  pileIndex,
                  cardIndex,
                );

                return (
                  <CardSlot
                    key={card.id}
                    card={card}
                    label=""
                    onPress={() =>
                      dispatch(
                        tapAction({
                          type: "tableau",
                          index: pileIndex,
                          cardIndex,
                        }),
                      )
                    }
                    selected={selected}
                    disabled={!card.faceUp}
                    style={[
                      styles.stackCard,
                      cardIndex > 0 && styles.stackCardOverlapSpider,
                    ]}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  const renderFreeCell = () => (
    <View style={styles.boardCard}>
      <View style={[styles.topRow, styles.freeCellTopRow]}>
        <View style={[styles.freeCellGroup, styles.freeCellGroupSpaced]}>
          {state.freecells.map((card, index) => {
            const selected =
              state.selected?.type === "freecell" &&
              state.selected.index === index;

            return (
              <CardSlot
                key={`freecell-${index}`}
                card={card}
                label={`Free ${index + 1}`}
                onPress={() => dispatch(tapAction({ type: "freecell", index }))}
                selected={selected}
                style={styles.slotCard}
              />
            );
          })}
        </View>

        <View style={styles.foundationRow}>
          {state.foundations.map((foundation, index) => {
            const top = getTopCard(foundation);
            const selected =
              state.selected?.type === "foundation" &&
              state.selected.index === index;

            return (
              <CardSlot
                key={`freecell-foundation-${index}`}
                card={top}
                label={`F${index + 1}`}
                onPress={() =>
                  dispatch(tapAction({ type: "foundation", index }))
                }
                selected={selected}
                style={styles.slotCard}
              />
            );
          })}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.spiderScrollContent}
      >
        <View style={[styles.tableauRow, styles.freeCellTableauRow]}>
          {state.tableau.map((pile, pileIndex) => (
            <View key={`freecell-${pileIndex}`} style={styles.tableauColumn}>
              {pile.length === 0 ? (
                <>
                  <View style={styles.tableauTopSpacer} />
                  <Pressable
                    onPress={() =>
                      dispatch(tapAction({ type: "tableau", index: pileIndex }))
                    }
                    style={({ pressed }) => [
                      styles.emptyColumnSlot,
                      pressed && styles.cardTouchPressed,
                    ]}
                  >
                    <Text style={styles.emptyColumnText}>Empty</Text>
                  </Pressable>
                </>
              ) : (
                <View style={styles.tableauTopSpacer} />
              )}

              {pile.map((card, cardIndex) => {
                const selected = isTableauSelection(
                  state.selected,
                  pileIndex,
                  cardIndex,
                );

                return (
                  <CardSlot
                    key={card.id}
                    card={card}
                    label=""
                    onPress={() =>
                      dispatch(
                        tapAction({
                          type: "tableau",
                          index: pileIndex,
                          cardIndex,
                        }),
                      )
                    }
                    selected={selected}
                    style={[
                      styles.stackCard,
                      cardIndex > 0 && styles.stackCardOverlap,
                    ]}
                  />
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );

  const renderPyramid = () => {
    const wasteTop = getTopCard(state.waste);
    const cleared = state.pyramidRows
      ? state.pyramidRows.reduce(
          (sum, row) =>
            sum + row.reduce((inner, card) => inner + (card ? 0 : 1), 0),
          0,
        )
      : 0;

    return (
      <View style={styles.boardCard}>
        <View style={styles.topRow}>
          <StockSlot
            label={
              state.stock.length > 0 ? `Stock ${state.stock.length}` : "Recycle"
            }
            onPress={() => dispatch(tapAction({ type: "stock" }))}
          />

          <CardSlot
            card={wasteTop}
            label="Waste"
            onPress={() => dispatch(tapAction({ type: "waste" }))}
            selected={sameTarget(state.selected, { type: "waste" })}
            style={styles.slotCard}
          />

          <View style={styles.metaPill}>
            <Text style={styles.metaPillLabel}>Cleared</Text>
            <Text style={styles.metaPillValue}>{cleared}/28</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.spiderScrollContent}
        >
          <View style={styles.pyramidBoard}>
            {state.pyramidRows.map((row, rowIndex) => (
              <View
                key={`pyramid-row-${rowIndex}`}
                style={[styles.pyramidRow, { marginLeft: rowIndex * 18 }]}
              >
                {row.map((card, colIndex) => {
                  if (!card) {
                    return (
                      <View
                        key={`pyramid-empty-${rowIndex}-${colIndex}`}
                        style={styles.pyramidSpacer}
                      />
                    );
                  }

                  const selected = isPyramidSelection(
                    state.selected,
                    rowIndex,
                    colIndex,
                  );

                  return (
                    <CardSlot
                      key={card.id}
                      card={card}
                      label=""
                      onPress={() =>
                        dispatch(
                          tapAction({
                            type: "pyramid",
                            row: rowIndex,
                            col: colIndex,
                          }),
                        )
                      }
                      selected={selected}
                      disabled={!card.faceUp}
                      style={styles.slotCard}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  const renderTriPeaks = () => {
    const wasteTop = getTopCard(state.waste);
    const cleared = state.boardRows
      ? state.boardRows.reduce(
          (sum, row) =>
            sum + row.reduce((inner, card) => inner + (card ? 0 : 1), 0),
          0,
        )
      : 0;

    return (
      <View style={styles.boardCard}>
        <View style={styles.topRow}>
          <StockSlot
            label={
              state.stock.length > 0 ? `Stock ${state.stock.length}` : "Recycle"
            }
            onPress={() => dispatch(tapAction({ type: "stock" }))}
          />

          <CardSlot
            card={wasteTop}
            label="Waste"
            onPress={() => dispatch(tapAction({ type: "waste" }))}
            selected={sameTarget(state.selected, { type: "waste" })}
            style={styles.slotCard}
          />

          <View style={styles.metaPill}>
            <Text style={styles.metaPillLabel}>Cleared</Text>
            <Text style={styles.metaPillValue}>{cleared}/28</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.spiderScrollContent}
        >
          <View style={styles.triPeaksBoard}>
            {state.boardRows.map((row, rowIndex) => (
              <View
                key={`tripeaks-row-${rowIndex}`}
                style={[styles.triPeaksRow, { marginLeft: rowIndex * 12 }]}
              >
                {row.map((card, colIndex) => {
                  if (!card) {
                    return (
                      <View
                        key={`tripeaks-empty-${rowIndex}-${colIndex}`}
                        style={styles.triPeaksSpacer}
                      />
                    );
                  }

                  const selected = isTriPeaksSelection(
                    state.selected,
                    rowIndex,
                    colIndex,
                  );

                  return (
                    <CardSlot
                      key={card.id}
                      card={card}
                      label=""
                      onPress={() =>
                        dispatch(
                          tapAction({
                            type: "tripeaks",
                            row: rowIndex,
                            col: colIndex,
                          }),
                        )
                      }
                      selected={selected}
                      disabled={!card.faceUp}
                      style={styles.slotCard}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <GameHeader
        gameId="solitaire"
        title={variant.label}
        subtitle={variant.description}
        extraButton={
          <Pressable
            onPress={() => setShowStats((v) => !v)}
            style={({ pressed }) => [
              styles.statsToggleBtn,
              pressed && styles.statsToggleBtnPressed,
            ]}
          >
            <Text style={styles.statsToggleBtnText}>
              {showStats ? "HIDE" : "SHOW"}
            </Text>
          </Pressable>
        }
        menuItems={menuItems}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {showStats ? renderStatsBar() : null}
        <EndOfRoundModal
          visible={showRoundModal}
          title="🏆 You Won!"
          message={coinsEarned > 0 ? `+${coinsEarned} coins!` : ""}
          showContinue
          showLeave
          isGameOver
          onContinue={() => {
            setShowRoundModal(false);
            restart();
          }}
          onLeave={() => {
            clearGame(solitaireSaveKey(state.variantId || routeVariantId));
            navigation.navigate("Home");
          }}
          tableColor={BG}
        />
        {state.variantId === "klondike" ? renderKlondike() : null}
        {state.variantId === "spider" ? renderSpider() : null}
        {state.variantId === "freecell" ? renderFreeCell() : null}
        {state.variantId === "pyramid" ? renderPyramid() : null}
        {state.variantId === "tripeaks" ? renderTriPeaks() : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  content: {
    padding: 14,
    gap: 14,
  },
  statsBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: scale(8),
    paddingHorizontal: scale(4),
    paddingTop: scale(4),
    paddingBottom: scale(8),
  },

  // Button shown in GameHeader to toggle the stats bar on/off.
  statsToggleBtn: {
    backgroundColor: "rgba(24, 33, 49, 0.95)",
    borderWidth: 1,
    borderColor: "#2c3750",
    borderRadius: scale(12),
    paddingHorizontal: scale(12),
    paddingVertical: scale(10),
    alignItems: "center",
    justifyContent: "center",
  },
  statsToggleBtnPressed: {
    opacity: 0.85,
  },
  statsToggleBtnText: {
    color: "#eef4ff",
    fontSize: scale(12),
    fontWeight: "900",
  },

  spiderScrollContent: {
    paddingBottom: 2,
  },
  spiderTableauRow: {
    minWidth: 500,
    justifyContent: "flex-start",
    gap: 0,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#263146",
    backgroundColor: "#101521",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  metaPillLabel: {
    color: "#8799b8",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  metaPillValue: {
    color: "#eff4fb",
    fontSize: 12,
    fontWeight: "900",
  },
  modeRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  modeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#2c3750",
    backgroundColor: "#182131",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modeChipSelected: {
    borderColor: "#77aef7",
    backgroundColor: "#21314a",
  },
  modeChipPressed: {
    opacity: 0.9,
  },
  modeChipText: {
    color: "#d3dcec",
    fontSize: 12,
    fontWeight: "800",
  },
  modeChipTextSelected: {
    color: "#eef4ff",
  },
  boardCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#233047",
    backgroundColor: "#141a24",
    padding: 12,
    gap: 14,
  },
  topRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  klondikeTopRow: {
    gap: 4,
    flexWrap: "nowrap",
    justifyContent: "space-between",
  },
  stockSlot: {
    width: 70,
    height: 98,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a3650",
    backgroundColor: "#0f1520",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  stockLabel: {
    color: "#d9e3f3",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 16,
  },
  slotCard: {
    minWidth: 70,
    minHeight: 98,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTouch: {
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    padding: 2,
    borderWidth: 1,
    borderColor: "transparent",
  },
  cardTouchSelected: {
    shadowColor: "#7fb3ff",
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    backgroundColor: "rgba(127, 179, 255, 0.12)",
    borderColor: "#7fb3ff",
  },
  cardTouchPressed: {
    opacity: 0.92,
  },
  cardTouchDisabled: {
    opacity: 0.96,
  },
  emptyCard: {
    width: 70,
    height: 98,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#34425f",
    backgroundColor: "#101521",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  emptyCardText: {
    color: "#7f8ea8",
    fontSize: 8,
    textAlign: "center",
    fontWeight: "800",
  },
  foundationRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  freeCellTopRow: {
    justifyContent: "flex-start",
  },
  freeCellGroup: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  freeCellGroupSpaced: {
    gap: 12,
  },
  freeCellTableauRow: {
    gap: 12,
  },
  tableauRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  tableauColumn: {
    flex: 1,
    minWidth: 34,
    alignItems: "center",
  },
  tableauTopSpacer: {
    height: 16,
  },
  emptyColumnSlot: {
    width: 70,
    height: 98,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#34425f",
    backgroundColor: "#101521",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  emptyColumnText: {
    opacity: 0,
    fontSize: 1,
    fontWeight: "800",
  },
  stackCard: {
    marginTop: 0,
  },
  stackCardOverlap: {
    marginTop: -44,
  },
  stackCardOverlapSpider: {
    marginTop: -38,
  },
  pyramidBoard: {
    paddingTop: 4,
  },
  pyramidRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 4,
  },
  pyramidSpacer: {
    width: 70,
    height: 98,
  },
  triPeaksBoard: {
    paddingTop: 4,
  },
  triPeaksRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 4,
    marginTop: 4,
  },
  triPeaksSpacer: {
    width: 70,
    height: 98,
  },
});
