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
import QuitButton from "../components/QuitButton";
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
        <Text style={styles.emptyCardText}>{label}</Text>
      )}
    </Pressable>
  );
}

function StockSlot({ label, onPress, disabled = false }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.stockSlot,
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

  const [showHeaderDetails, setShowHeaderDetails] = useState(false);
  const { width } = useWindowDimensions();
  const spiderBoardWidth = Math.max(width - 28, 500);

  const [state, dispatch] = useReducer(solitaireReducerWithRestore, null, () =>
    createSolitaireState(routeVariantId, { spiderMode: routeSpiderMode }),
  );
  const coinRewardedRef = useRef(false);
  const [coinsEarned, setCoinsEarned] = useState(0);
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

  const variant = useMemo(
    () => getVariantOption(state.variantId),
    [state.variantId],
  );
  const canGoBack =
    typeof navigation?.canGoBack === "function"
      ? navigation.canGoBack()
      : false;

  const headerText = variant.description;

  const restart = () => {
    coinRewardedRef.current = false;
    setCoinsEarned(0);
    clearGame(solitaireSaveKey(state.variantId || routeVariantId));
    dispatch(newGameAction(state.variantId, { spiderMode: state.spiderMode }));
  };

  const renderHeader = () => (
    <View
      style={[
        styles.headerCard,
        !showHeaderDetails && styles.headerCardCollapsed,
      ]}
    >
      <Pressable
        onPress={() => setShowHeaderDetails((value) => !value)}
        style={({ pressed }) => [
          styles.headerToggleRow,
          pressed && styles.headerButtonPressed,
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.kicker}>Solitaire</Text>
          <Text style={styles.title}>{variant.label}</Text>
          {showHeaderDetails ? (
            <Text style={styles.subtitle}>{headerText}</Text>
          ) : null}
        </View>

        <Text style={styles.headerToggleText}>
          {showHeaderDetails ? "Hide" : "Show"}
        </Text>
      </Pressable>

      {showHeaderDetails ? (
        <>
          <View style={styles.headerTopRow}>
            <View style={{ flex: 1 }} />
            <View style={styles.headerActions}>
              <Pressable
                onPress={restart}
                style={({ pressed }) => [
                  styles.headerButton,
                  pressed && styles.headerButtonPressed,
                ]}
              >
                <Text style={styles.headerButtonText}>New Game</Text>
              </Pressable>

              {canGoBack ? (
                <Pressable
                  onPress={() => navigation.goBack()}
                  style={({ pressed }) => [
                    styles.headerButton,
                    pressed && styles.headerButtonPressed,
                  ]}
                >
                  <Text style={styles.headerButtonText}>Back</Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <Text style={styles.metaPillLabel}>Moves</Text>
              <Text style={styles.metaPillValue}>{state.moves}</Text>
            </View>
            {state.variantId === "spider" ? (
              <View style={styles.metaPill}>
                <Text style={styles.metaPillLabel}>Spider</Text>
                <Text style={styles.metaPillValue}>
                  {state.spiderMode}-suit
                </Text>
              </View>
            ) : null}
          </View>

          {state.variantId === "spider" ? (
            <View style={styles.modeBlock}>
              <Text style={styles.modeTitle}>Spider suits</Text>
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
            </View>
          ) : null}

          <Text style={styles.selectionHint}>
            Tap cards, piles, and the stock to play.
          </Text>
        </>
      ) : null}
    </View>
  );

  const renderKlondike = () => {
    const wasteTop = getTopCard(state.waste);

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

          <View style={styles.foundationRow}>
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
                  style={styles.slotCard}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.tableauRow}>
          {state.tableau.map((pile, pileIndex) => (
            <View key={`klondike-${pileIndex}`} style={styles.tableauColumn}>
              {pile.length === 0 ? (
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
      <ScrollView contentContainerStyle={styles.content}>
        {renderHeader()}
        {state.status === "won" && (
          <View style={styles.winBanner}>
            <Text style={styles.winBannerTitle}>🏆 You Won!</Text>
            {coinsEarned > 0 && (
              <Text style={styles.winBannerCoins}>+{coinsEarned} coins!</Text>
            )}
          </View>
        )}
        {state.variantId === "klondike" ? renderKlondike() : null}
        {state.variantId === "spider" ? renderSpider() : null}
        {state.variantId === "freecell" ? renderFreeCell() : null}
        {state.variantId === "pyramid" ? renderPyramid() : null}
        {state.variantId === "tripeaks" ? renderTriPeaks() : null}
      </ScrollView>
      <QuitButton onQuit={() => { clearGame(solitaireSaveKey(state.variantId || routeVariantId)); navigation.navigate("Home"); }} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  winBanner: {
    backgroundColor: "#16213e",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#ffd700",
    padding: 18,
    alignItems: "center",
    gap: 6,
  },
  winBannerTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "bold",
  },
  winBannerCoins: {
    color: "#ffd700",
    fontSize: 18,
    fontWeight: "bold",
  },
  content: {
    padding: 14,
    gap: 14,
  },
  headerCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#243042",
    backgroundColor: "#151a24",
    padding: 16,
    gap: 12,
  },
  headerCardCollapsed: {
    paddingVertical: 12,
    gap: 8,
  },
  headerToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerToggleText: {
    color: "#f5f7fb",
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.9,
    borderWidth: 1,
    borderColor: "#2f3c55",
    backgroundColor: "#1d2637",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  spiderScrollContent: {
    paddingBottom: 2,
  },
  spiderTableauRow: {
    minWidth: 500,
    justifyContent: "flex-start",
    gap: 0,
  },
  headerTopRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  headerActions: {
    gap: 8,
    alignItems: "flex-end",
  },
  kicker: {
    color: "#7fb3ff",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontSize: 12,
    fontWeight: "800",
  },
  title: {
    color: "#f5f7fb",
    fontSize: 30,
    fontWeight: "900",
    marginTop: 2,
  },
  subtitle: {
    color: "#a4b1c4",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  headerButton: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#2f3c55",
    backgroundColor: "#1d2637",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerButtonPressed: {
    opacity: 0.9,
  },
  headerButtonText: {
    color: "#edf2fa",
    fontSize: 13,
    fontWeight: "800",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
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
  modeBlock: {
    gap: 8,
  },
  modeTitle: {
    color: "#dce5f2",
    fontSize: 14,
    fontWeight: "800",
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
  selectionHint: {
    color: "#95a4bb",
    fontSize: 13,
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
    fontSize: 11,
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
    width: "100%",
    minHeight: 26,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyColumnText: {
    color: "#71809a",
    fontSize: 11,
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
