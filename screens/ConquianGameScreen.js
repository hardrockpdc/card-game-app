import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView,
} from 'react-native';
import Card from '../components/Card';
import {
  deal, doSelectPassCard, doDrawFromStock,
  doLayDownMeld, doExtendMeldFromHand,
  doTakeActiveCard, doTakeWithBorrow, doPassActiveCard, doDiscardCard,
  isValidMeld, canExtendMeld,
  aiMostIsolated, aiBestHandMeld, aiCanTake,
  meldedCount,
} from '../game/conquian';

// Phase A: single-player vs AI only. No networking, no Priority Chain, no borrowing.

export default function ConquianGameScreen({ navigation, route }) {
  const { role, myName, players: initialPlayers } = route.params;
  const isSinglePlayer = role === 'singleplayer';
  const myPid = 'host';

  const fullRef = useRef(null);
  const [gameState, setGameState] = useState(null);
  const [myHand, setMyHand] = useState([]);
  const [selectedHandIds, setSelectedHandIds] = useState(new Set());
  const [selectedMeldIdx, setSelectedMeldIdx] = useState(null);
  const [passCardId, setPassCardId] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

  // Borrow mode state
  const [borrowMode, setBorrowMode] = useState(false);
  const [borrowGroups, setBorrowGroups] = useState([]);  // Card[][]
  const [borrowPool, setBorrowPool] = useState([]);       // Card[] — unassigned
  const [borrowSelCardId, setBorrowSelCardId] = useState(null);

  // ─── State management ────────────────────────────────────────────────────────

  function applyState(next) {
    fullRef.current = next;
    setMyHand(next.hands[myPid] ?? []);
    setGameState(next);
    setSelectedHandIds(new Set());
    setSelectedMeldIdx(null);
    setStatusMsg('');
    scheduleAI(next);
  }

  function scheduleAI(state) {
    if (!isSinglePlayer || state.phase !== 'playing') return;
    const cp = state.players[state.currentPlayerIndex];
    if (!cp?.isAI) return;
    setTimeout(() => {
      const s = fullRef.current;
      if (!s || s.phase !== 'playing') return;
      const cp2 = s.players[s.currentPlayerIndex];
      if (!cp2?.isAI) return;
      runAITurn(s);
    }, 700 + Math.random() * 500);
  }

  function runAITurn(state) {
    const cp = state.players[state.currentPlayerIndex];
    if (!cp?.isAI) return;
    const aiPid = String(cp.id);

    if (state.turnPhase === 'draw') {
      applyState(doDrawFromStock(state));
      return;
    }

    if (state.turnPhase === 'action') {
      const isDrawTurn = state.currentPlayerIndex === state.originalDrawerIndex &&
        state.chainPassedPids.length === 0;

      let s = state;
      if (isDrawTurn) {
        // Draw-turn: lay free hand melds before deciding on the active card
        let meldIds = aiBestHandMeld(s.hands[aiPid]);
        while (meldIds) {
          const next = doLayDownMeld(s, aiPid, meldIds);
          if (next === s) break;
          s = next;
          if (s.phase === 'results') { applyState(s); return; }
          meldIds = aiBestHandMeld(s.hands[aiPid]);
        }
      }

      // Decide on the active card (same logic for draw-turn and chain offer)
      const meldAction = aiCanTake(s, aiPid);
      if (meldAction && Math.random() > 0.15) {
        applyState(doTakeActiveCard(s, aiPid, meldAction));
      } else {
        applyState(doPassActiveCard(s));
      }
      return;
    }

    if (state.turnPhase === 'discard') {
      const cardId = aiMostIsolated(state.hands[aiPid] ?? []);
      if (cardId) applyState(doDiscardCard(state, aiPid, cardId));
      return;
    }
  }

  // ─── Initialization ──────────────────────────────────────────────────────────

  useEffect(() => {
    applyState(deal(initialPlayers));
  }, []);

  // ─── Handlers ────────────────────────────────────────────────────────────────

  function handleConfirmPass() {
    if (!passCardId) return;
    let s = doSelectPassCard(fullRef.current, myPid, passCardId);
    // Resolve all AI pass selections simultaneously
    for (const p of initialPlayers) {
      if (p.isAI) {
        const cardId = aiMostIsolated(s.hands[String(p.id)] ?? []);
        if (cardId) s = doSelectPassCard(s, String(p.id), cardId);
        if (s.phase === 'playing') break;
      }
    }
    setPassCardId(null);
    applyState(s);
  }

  function handleDraw() {
    const s = fullRef.current;
    if (!s) return;
    applyState(doDrawFromStock(s));
  }

  function toggleHandCard(cardId) {
    setSelectedHandIds(prev => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId); else next.add(cardId);
      return next;
    });
    setStatusMsg('');
  }

  function handleLayMeld() {
    const s = fullRef.current;
    if (!s) return;
    const next = doLayDownMeld(s, myPid, [...selectedHandIds]);
    if (next === s) { setStatusMsg('Invalid meld — select 3+ cards forming a valid set or run'); return; }
    applyState(next);
  }

  function handleAddToMeld() {
    const s = fullRef.current;
    if (!s || selectedMeldIdx === null) return;
    const next = doExtendMeldFromHand(s, myPid, selectedMeldIdx, [...selectedHandIds]);
    if (next === s) { setStatusMsg('Invalid extension'); return; }
    applyState(next);
  }

  function handleTakeMeld() {
    const s = fullRef.current;
    if (!s || !s.activeCard) return;
    const next = doTakeActiveCard(s, myPid, { type: 'new', handCardIds: [...selectedHandIds] });
    if (next === s) { setStatusMsg('Invalid meld — active card + selected must form a valid set or run'); return; }
    applyState(next);
  }

  function handleTakeExtend() {
    const s = fullRef.current;
    if (!s || !s.activeCard || selectedMeldIdx === null) return;
    const next = doTakeActiveCard(s, myPid, { type: 'extend', meldIdx: selectedMeldIdx });
    if (next === s) { setStatusMsg('Cannot extend that meld with the active card'); return; }
    applyState(next);
  }

  function handlePass() {
    applyState(doPassActiveCard(fullRef.current));
  }

  function handleDiscard(cardId) {
    const s = fullRef.current;
    if (!s) return;
    const next = doDiscardCard(s, myPid, cardId);
    if (next !== s) applyState(next);
  }

  function handlePlayAgain() {
    setPassCardId(null);
    applyState(deal(initialPlayers));
  }

  // ─── Borrow mode handlers ─────────────────────────────────────────────────────

  function enterBorrowMode() {
    const s = fullRef.current;
    if (!s?.activeCard) return;
    // Groups start as current melds; pool starts as activeCard + hand cards
    setBorrowGroups((s.melds[myPid] ?? []).map(m => [...m]));
    setBorrowPool([s.activeCard, ...(s.hands[myPid] ?? [])]);
    setBorrowSelCardId(null);
    setStatusMsg('');
    setBorrowMode(true);
  }

  function exitBorrowMode() {
    setBorrowMode(false);
    setBorrowGroups([]);
    setBorrowPool([]);
    setBorrowSelCardId(null);
    setStatusMsg('');
  }

  function borrowSelectCard(cardId) {
    setBorrowSelCardId(prev => prev === cardId ? null : cardId);
  }

  function borrowMoveToGroup(groupIdx) {
    if (!borrowSelCardId) return;
    const card = borrowPool.find(c => c.id === borrowSelCardId);
    if (!card) return;
    setBorrowPool(prev => prev.filter(c => c.id !== borrowSelCardId));
    setBorrowGroups(prev => prev.map((g, i) => i === groupIdx ? [...g, card] : g));
    setBorrowSelCardId(null);
  }

  function borrowReturnToPool(cardId, groupIdx) {
    const card = borrowGroups[groupIdx]?.find(c => c.id === cardId);
    if (!card) return;
    setBorrowGroups(prev => prev.map((g, i) => i === groupIdx ? g.filter(c => c.id !== cardId) : g));
    setBorrowPool(prev => [...prev, card]);
  }

  function handleConfirmBorrow() {
    const s = fullRef.current;
    if (!s) return;
    const nonEmpty = borrowGroups.filter(g => g.length > 0);
    const next = doTakeWithBorrow(s, myPid, nonEmpty);
    if (next === s) {
      setStatusMsg('Invalid — every group must be a valid meld and the active card must be placed');
      return;
    }
    exitBorrowMode();
    applyState(next);
  }

  // ─── Guards ──────────────────────────────────────────────────────────────────

  if (!gameState) {
    return <SafeAreaView style={styles.loading}><Text style={styles.loadingText}>Dealing…</Text></SafeAreaView>;
  }

  if (borrowMode) {
    const s = fullRef.current;
    const ac = s?.activeCard;
    const nonEmpty = borrowGroups.filter(g => g.length > 0);
    const allValid = nonEmpty.every(g => isValidMeld(g));
    const hasActive = nonEmpty.some(g => g.some(c => c.id === ac?.id));
    const canConfirm = allValid && hasActive && nonEmpty.length > 0;

    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.borrowTitle}>Borrow Mode</Text>
          <Text style={styles.borrowSubtitle}>
            {hasActive ? '✓ Active card placed' : '⚠ Active card must be placed in a group'}
          </Text>

          {/* Active card reminder */}
          {ac && (
            <View style={styles.borrowActiveRow}>
              <Text style={styles.sectionLabel}>Active Card</Text>
              <Card rank={ac.rank} suit={ac.suit} />
            </View>
          )}

          {/* Proposed meld groups */}
          <Text style={styles.sectionLabel}>
            Your Melds — tap a group to add selected card · tap a card to return it to pool
          </Text>
          {borrowGroups.map((group, idx) => {
            const valid = group.length >= 3 && isValidMeld(group);
            const invalid = group.length > 0 && !isValidMeld(group);
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.borrowGroup, valid && styles.borrowGroupValid, invalid && styles.borrowGroupInvalid]}
                onPress={() => borrowMoveToGroup(idx)}
                activeOpacity={borrowSelCardId ? 0.6 : 1}
              >
                <Text style={styles.borrowGroupLabel}>
                  Group {idx + 1} {group.length === 0 ? '— tap to add selected card' : valid ? '✓' : '✗ not valid yet'}
                </Text>
                <View style={styles.handRow}>
                  {group.map(card => (
                    <TouchableOpacity key={card.id} onPress={() => borrowReturnToPool(card.id, idx)}>
                      <Card rank={card.rank} suit={card.suit} small />
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity style={styles.addGroupBtn} onPress={() => setBorrowGroups(p => [...p, []])}>
            <Text style={styles.addGroupText}>+ New Group</Text>
          </TouchableOpacity>

          {/* Pool */}
          <Text style={styles.sectionLabel}>
            Available Pool — tap to select{borrowSelCardId ? ', then tap a group above' : ''}
          </Text>
          <View style={styles.handRow}>
            {borrowPool.map(card => (
              <TouchableOpacity key={card.id} onPress={() => borrowSelectCard(card.id)}>
                <View style={[
                  borrowSelCardId === card.id ? styles.selectedWrapper : null,
                  card.id === ac?.id ? styles.activeCardInPool : null,
                ]}>
                  <Card rank={card.rank} suit={card.suit} />
                </View>
              </TouchableOpacity>
            ))}
            {borrowPool.length === 0 && <Text style={styles.emptyHint}>All cards placed</Text>}
          </View>

          {statusMsg ? <Text style={styles.errorMsg}>{statusMsg}</Text> : null}

          <View style={[styles.actionBtnRow, { marginTop: 16 }]}>
            <TouchableOpacity style={[styles.actionBtn, styles.passBtn]} onPress={exitBorrowMode}>
              <Text style={styles.actionBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.takeBtn, !canConfirm && styles.actionBtnDisabled]}
              onPress={handleConfirmBorrow}
              disabled={!canConfirm}
            >
              <Text style={styles.actionBtnText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Derived values ──────────────────────────────────────────────────────────

  const { phase, turnPhase, activeCard, stock, deadPile, winTarget } = gameState;
  const isMyTurn = gameState.players[gameState.currentPlayerIndex]?.id === myPid;
  const myMelds = gameState.melds[myPid] ?? [];
  const myMelded = meldedCount(gameState, myPid);
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const opponents = gameState.players.filter(p => String(p.id) !== myPid);
  const selectedHandArr = myHand.filter(c => selectedHandIds.has(c.id));

  // Free melds (lay/add) are only available on the original drawer's own turn, not during chain offers
  const isDrawTurnFreeAction = isMyTurn && turnPhase === 'action' &&
    gameState.currentPlayerIndex === gameState.originalDrawerIndex &&
    gameState.chainPassedPids.length === 0;

  const canLayMeld = isDrawTurnFreeAction && isValidMeld(selectedHandArr);
  const canAddToMeld = isDrawTurnFreeAction &&
    selectedMeldIdx !== null && selectedHandArr.length >= 1 &&
    isValidMeld([...(myMelds[selectedMeldIdx] ?? []), ...selectedHandArr]);
  const canTakeMeld = isMyTurn && turnPhase === 'action' &&
    !!activeCard && isValidMeld([activeCard, ...selectedHandArr]);
  const canTakeExtend = isMyTurn && turnPhase === 'action' &&
    !!activeCard && selectedMeldIdx !== null &&
    canExtendMeld(myMelds[selectedMeldIdx] ?? [], activeCard);

  // ─── Results screen ──────────────────────────────────────────────────────────

  if (phase === 'results') {
    const { winner, tie } = gameState;
    const iWon = winner?.id === myPid;
    return (
      <SafeAreaView style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>
          {tie ? "It's a Tie!" : iWon ? 'You Win!' : `${winner?.name} Wins!`}
        </Text>
        <TouchableOpacity style={styles.playAgainBtn} onPress={handlePlayAgain}>
          <Text style={styles.playAgainText}>Play Again</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.homeBtn} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.homeBtnText}>Home</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // ─── Main game screen ─────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
    <ScrollView contentContainerStyle={styles.container}>

      {/* Opponents */}
      {opponents.map(p => {
        const opPid = String(p.id);
        const isCurrent = currentPlayer?.id === p.id;
        const opMelds = gameState.melds[opPid] ?? [];
        return (
          <View key={opPid} style={[styles.opponentCard, isCurrent && styles.opponentCardActive]}>
            <View style={styles.opponentHeader}>
              <Text style={styles.opponentName}>{p.name}</Text>
              <Text style={styles.opponentStats}>
                {(gameState.hands[opPid] ?? []).length} in hand · {meldedCount(gameState, opPid)}/{winTarget} melded
                {isCurrent ? '  thinking…' : ''}
              </Text>
            </View>
            {opMelds.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.opponentMeldScroll}>
                <View style={styles.meldRow}>
                  {opMelds.map((meld, idx) => (
                    <View key={idx} style={styles.meldGroup}>
                      {meld.map(card => (
                        <Card key={card.id} rank={card.rank} suit={card.suit} small />
                      ))}
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        );
      })}

      {/* Center — stock / active slot / dead pile + status */}
      <View style={styles.centerSection}>
        <View style={styles.pileRow}>
          <View style={styles.pileBox}>
            <Text style={styles.pileLabel}>Stock</Text>
            <Text style={styles.pileCount}>{stock.length}</Text>
          </View>

          <View style={styles.activeSlotBox}>
            <Text style={styles.pileLabel}>Active</Text>
            {activeCard
              ? <Card rank={activeCard.rank} suit={activeCard.suit} />
              : <View style={styles.emptySlot}><Text style={styles.emptySlotText}>—</Text></View>
            }
          </View>

          <View style={styles.pileBox}>
            <Text style={styles.pileLabel}>Dead</Text>
            <Text style={styles.pileCount}>{deadPile.length}</Text>
          </View>
        </View>

        <Text style={styles.myProgress}>
          You: {myHand.length} in hand · {myMelded}/{winTarget} melded
        </Text>

        {phase === 'initialPass' && (
          <Text style={styles.phaseLabel}>Pick 1 card to pass clockwise</Text>
        )}
        {phase === 'playing' && isMyTurn && turnPhase === 'draw' && (
          <Text style={styles.phaseLabel}>Your turn — draw from stock</Text>
        )}
        {phase === 'playing' && isMyTurn && turnPhase === 'action' && isDrawTurnFreeAction && (
          <Text style={styles.phaseLabel}>
            Your turn — take/pass the drawn card, or select hand cards to meld
            {selectedHandArr.length > 0 ? ` · ${selectedHandArr.length} selected` : ''}
            {selectedMeldIdx !== null ? ` · meld ${selectedMeldIdx + 1} targeted` : ''}
          </Text>
        )}
        {phase === 'playing' && isMyTurn && turnPhase === 'action' && !isDrawTurnFreeAction && (
          <Text style={styles.phaseLabel}>
            Chain offer — Take or Pass
            {selectedHandArr.length > 0 ? ` · ${selectedHandArr.length} selected` : ''}
            {selectedMeldIdx !== null ? ` · meld ${selectedMeldIdx + 1} targeted` : ''}
          </Text>
        )}
        {phase === 'playing' && isMyTurn && turnPhase === 'discard' && (
          <Text style={styles.phaseLabel}>Tap a card in your hand to discard</Text>
        )}
        {phase === 'playing' && !isMyTurn && turnPhase !== 'discard' && (
          <Text style={styles.phaseLabel}>
            {gameState.chainPassedPids.length > 0
              ? `Chain: ${currentPlayer?.name} deciding…`
              : `${currentPlayer?.name}'s turn…`}
          </Text>
        )}
        {phase === 'playing' && !isMyTurn && turnPhase === 'discard' && (
          <Text style={styles.phaseLabel}>{currentPlayer?.name} is discarding…</Text>
        )}
        {statusMsg ? <Text style={styles.errorMsg}>{statusMsg}</Text> : null}
      </View>

      {/* My melds */}
      {myMelds.length > 0 && (
        <View style={styles.meldSection}>
          <Text style={styles.sectionLabel}>Your Melds</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.meldRow}>
              {myMelds.map((meld, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.meldGroup, selectedMeldIdx === idx && styles.meldGroupSelected]}
                  onPress={() => {
                    if (turnPhase !== 'action' || !isMyTurn) return;
                    setSelectedMeldIdx(prev => prev === idx ? null : idx);
                    setStatusMsg('');
                  }}
                >
                  {meld.map(card => (
                    <Card key={card.id} rank={card.rank} suit={card.suit} small />
                  ))}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* My hand */}
      <View style={styles.handSection}>
        <Text style={styles.sectionLabel}>
          {phase === 'initialPass' ? 'Your Hand — tap to select 1 card to pass' : `Your Hand (${myHand.length})`}
        </Text>
        <View style={styles.handRow}>
          {myHand.map(card => {
            const isSelected = phase === 'initialPass'
              ? passCardId === card.id
              : selectedHandIds.has(card.id);
            const tappable = phase === 'initialPass' ||
              (turnPhase === 'action' && isMyTurn) ||
              (turnPhase === 'discard' && isMyTurn);
            return (
              <TouchableOpacity
                key={card.id}
                disabled={!tappable}
                onPress={() => {
                  if (phase === 'initialPass') {
                    setPassCardId(prev => prev === card.id ? null : card.id);
                    return;
                  }
                  if (turnPhase === 'discard' && isMyTurn) { handleDiscard(card.id); return; }
                  if (turnPhase === 'action' && isMyTurn) toggleHandCard(card.id);
                }}
              >
                <View style={isSelected ? styles.selectedWrapper : null}>
                  <Card rank={card.rank} suit={card.suit} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Action bar */}
      <View style={styles.actionBar}>
        {phase === 'initialPass' && (
          <TouchableOpacity
            style={[styles.actionBtn, !passCardId && styles.actionBtnDisabled]}
            onPress={handleConfirmPass}
            disabled={!passCardId}
          >
            <Text style={styles.actionBtnText}>Confirm Pass</Text>
          </TouchableOpacity>
        )}

        {phase === 'playing' && isMyTurn && turnPhase === 'draw' && (
          <TouchableOpacity style={styles.actionBtn} onPress={handleDraw}>
            <Text style={styles.actionBtnText}>Draw from Stock</Text>
          </TouchableOpacity>
        )}

        {phase === 'playing' && isMyTurn && turnPhase === 'action' && (
          <>
            <View style={styles.actionBtnRow}>
              {canLayMeld && (
                <TouchableOpacity style={styles.actionBtn} onPress={handleLayMeld}>
                  <Text style={styles.actionBtnText}>Lay Meld</Text>
                </TouchableOpacity>
              )}
              {canAddToMeld && (
                <TouchableOpacity style={styles.actionBtn} onPress={handleAddToMeld}>
                  <Text style={styles.actionBtnText}>Add to Meld</Text>
                </TouchableOpacity>
              )}
              {canTakeMeld && (
                <TouchableOpacity style={[styles.actionBtn, styles.takeBtn]} onPress={handleTakeMeld}>
                  <Text style={styles.actionBtnText}>Take + Meld</Text>
                </TouchableOpacity>
              )}
              {canTakeExtend && (
                <TouchableOpacity style={[styles.actionBtn, styles.takeBtn]} onPress={handleTakeExtend}>
                  <Text style={styles.actionBtnText}>Take + Extend</Text>
                </TouchableOpacity>
              )}
              {!!activeCard && (
                <TouchableOpacity style={[styles.actionBtn, styles.borrowBtn]} onPress={enterBorrowMode}>
                  <Text style={styles.actionBtnText}>Borrow</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.actionBtn, styles.passBtn]} onPress={handlePass}>
                <Text style={styles.actionBtnText}>Pass</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.hintText}>
              Tap hand cards to select · tap a meld above to target it · Borrow to rearrange melds
            </Text>
          </>
        )}

        {phase === 'playing' && isMyTurn && turnPhase === 'discard' && (
          <Text style={styles.discardHint}>Tap a card in your hand to discard</Text>
        )}

        {phase === 'playing' && !isMyTurn && (
          <Text style={styles.waitText}>
            {gameState.chainPassedPids.length > 0
              ? `Chain → ${currentPlayer?.name} deciding…`
              : `${currentPlayer?.name} is playing…`}
          </Text>
        )}
      </View>

    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#fff', fontSize: 20 },

  safeArea: { flex: 1, backgroundColor: '#1a1a2e' },
  container: { backgroundColor: '#1a1a2e', paddingTop: 12, paddingBottom: 16 },

  resultsContainer: { flex: 1, backgroundColor: '#1a1a2e', alignItems: 'center', justifyContent: 'center', padding: 32 },
  resultsTitle: { color: '#fff', fontSize: 34, fontWeight: 'bold', textAlign: 'center', marginBottom: 40 },
  playAgainBtn: { backgroundColor: '#4caf50', paddingHorizontal: 48, paddingVertical: 18, borderRadius: 12, marginBottom: 16 },
  playAgainText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  homeBtn: { backgroundColor: '#16213e', paddingHorizontal: 48, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#334' },
  homeBtnText: { color: '#b0b0c0', fontSize: 16 },

  opponentCard: { marginHorizontal: 12, marginBottom: 6, backgroundColor: '#16213e', borderRadius: 10, padding: 10, borderWidth: 1.5, borderColor: '#334' },
  opponentCardActive: { borderColor: '#e94560' },
  opponentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  opponentName: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  opponentStats: { color: '#b0b0c0', fontSize: 11 },
  opponentMeldScroll: { marginTop: 2 },

  centerSection: { paddingHorizontal: 12, marginBottom: 6 },
  pileRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  pileBox: { alignItems: 'center', backgroundColor: '#16213e', borderRadius: 10, padding: 10, minWidth: 68 },
  pileLabel: { color: '#b0b0c0', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  pileCount: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  activeSlotBox: { alignItems: 'center' },
  emptySlot: { width: 70, height: 100, borderRadius: 8, borderWidth: 2, borderColor: '#334', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  emptySlotText: { color: '#555', fontSize: 20 },
  myProgress: { color: '#4caf50', fontSize: 13, textAlign: 'center', marginBottom: 2 },
  phaseLabel: { color: '#b0b0c0', fontSize: 12, textAlign: 'center' },
  errorMsg: { color: '#e94560', fontSize: 13, textAlign: 'center', marginTop: 4 },

  meldSection: { paddingHorizontal: 12, marginBottom: 6 },
  sectionLabel: { color: '#b0b0c0', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  meldRow: { flexDirection: 'row', gap: 10 },
  meldGroup: { flexDirection: 'row', borderRadius: 8, borderWidth: 2, borderColor: 'transparent', padding: 2 },
  meldGroupSelected: { borderColor: '#e94560' },

  handSection: { paddingHorizontal: 12, marginBottom: 6 },
  handRow: { flexDirection: 'row', flexWrap: 'wrap' },
  selectedWrapper: { borderRadius: 10, borderWidth: 3, borderColor: '#4caf50', transform: [{ translateY: -10 }] },

  actionBar: { backgroundColor: '#16213e', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginHorizontal: 12, marginTop: 6 },
  actionBtnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  actionBtn: { backgroundColor: '#4caf50', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, alignItems: 'center', flex: 1, minWidth: 100 },
  actionBtnDisabled: { backgroundColor: '#2d5c35' },
  takeBtn: { backgroundColor: '#1565c0' },
  passBtn: { backgroundColor: '#b71c1c' },
  borrowBtn: { backgroundColor: '#6a1b9a' },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold', textAlign: 'center' },
  hintText: { color: '#666', fontSize: 11, textAlign: 'center' },
  discardHint: { color: '#e94560', fontSize: 14, textAlign: 'center', paddingVertical: 6 },
  waitText: { color: '#b0b0c0', fontSize: 14, textAlign: 'center', paddingVertical: 6 },

  // Borrow mode
  borrowTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  borrowSubtitle: { color: '#b0b0c0', fontSize: 13, textAlign: 'center', marginBottom: 12 },
  borrowActiveRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, marginBottom: 8 },
  borrowGroup: {
    marginHorizontal: 12, marginBottom: 8, borderRadius: 10,
    borderWidth: 2, borderColor: '#334', backgroundColor: '#16213e', padding: 8,
  },
  borrowGroupValid: { borderColor: '#4caf50' },
  borrowGroupInvalid: { borderColor: '#e94560' },
  borrowGroupLabel: { color: '#b0b0c0', fontSize: 12, marginBottom: 6 },
  addGroupBtn: {
    marginHorizontal: 12, marginBottom: 12, padding: 12, borderRadius: 10,
    borderWidth: 1.5, borderColor: '#6a1b9a', borderStyle: 'dashed', alignItems: 'center',
  },
  addGroupText: { color: '#b090c8', fontSize: 14, fontWeight: 'bold' },
  activeCardInPool: { borderRadius: 10, borderWidth: 2, borderColor: '#ffa000' },
  emptyHint: { color: '#555', fontSize: 13, padding: 8 },
});
