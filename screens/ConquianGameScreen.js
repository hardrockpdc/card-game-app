import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert,
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
import {
  setServerListeners, broadcastToClients, sendToClient,
  setClientListeners, sendToHost,
} from '../game/GameNetwork';

function toPublic(state) {
  return {
    phase: state.phase,
    players: state.players,
    winTarget: state.winTarget,
    stockSize: state.stock.length,
    deadPileSize: state.deadPile.length,
    activeCard: state.activeCard,
    melds: state.melds,
    handSizes: Object.fromEntries(Object.entries(state.hands).map(([id, h]) => [id, h.length])),
    passSelectionsStatus: Object.fromEntries(
      Object.entries(state.passSelections).map(([id, v]) => [id, v !== null])
    ),
    currentPlayerIndex: state.currentPlayerIndex,
    turnPhase: state.turnPhase,
    winner: state.winner,
    tie: state.tie,
    originalDrawerIndex: state.originalDrawerIndex,
    activeCardSourcePid: state.activeCardSourcePid,
    chainPassedPids: state.chainPassedPids,
  };
}

export default function ConquianGameScreen({ navigation, route }) {
  const { role, myName, players: initialPlayers, difficulty = 'medium' } = route.params;
  const isSinglePlayer = role === 'singleplayer';
  const isHost = role === 'host' || isSinglePlayer;

  const PASS_RATES = { easy: 0.50, medium: 0.15, hard: 0.03 };
  const myPid = isHost
    ? 'host'
    : String(initialPlayers.find(p => p.name === myName)?.id ?? myName);

  const fullRef = useRef(null);
  const [gameState, setGameState] = useState(null);
  const [myHand, setMyHand] = useState([]);
  const [selectedHandIds, setSelectedHandIds] = useState(new Set());
  const [selectedMeldIdx, setSelectedMeldIdx] = useState(null);
  const [passCardId, setPassCardId] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

  // Borrow mode state
  const [borrowMode, setBorrowMode] = useState(false);
  const [borrowGroups, setBorrowGroups] = useState([]);
  const [borrowPool, setBorrowPool] = useState([]);
  const [borrowSelCardId, setBorrowSelCardId] = useState(null);

  // Reset passCardId when phase changes (handles new game deal for clients)
  useEffect(() => {
    if (gameState?.phase !== 'initialPass') setPassCardId(null);
  }, [gameState?.phase]);

  // ─── State management ────────────────────────────────────────────────────────

  function applyState(next) {
    fullRef.current = next;
    setMyHand(next.hands[myPid] ?? []);
    const pub = toPublic(next);
    setGameState(pub);
    setSelectedHandIds(new Set());
    setSelectedMeldIdx(null);
    setStatusMsg('');
    if (!isSinglePlayer) {
      broadcastToClients({ type: 'GAME_STATE', ...pub });
      next.players.forEach((p) => {
        if (String(p.id) !== 'host') {
          sendToClient(p.id, { type: 'PRIVATE_HAND', hand: next.hands[String(p.id)] ?? [] });
        }
      });
    }
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
      // Easy AI skips proactive free melding — medium/hard lay everything they can
      if (isDrawTurn && difficulty !== 'easy') {
        let meldIds = aiBestHandMeld(s.hands[aiPid]);
        while (meldIds) {
          const next = doLayDownMeld(s, aiPid, meldIds);
          if (next === s) break;
          s = next;
          if (s.phase === 'results') { applyState(s); return; }
          meldIds = aiBestHandMeld(s.hands[aiPid]);
        }
      }

      const passRate = PASS_RATES[difficulty] ?? 0.15;
      const meldAction = aiCanTake(s, aiPid);
      if (meldAction && Math.random() > passRate) {
        applyState(doTakeActiveCard(s, aiPid, meldAction));
      } else {
        applyState(doPassActiveCard(s));
      }
      return;
    }

    if (state.turnPhase === 'discard') {
      const hand = state.hands[aiPid] ?? [];
      // Easy AI discards randomly; medium/hard discard most isolated card
      const cardId = difficulty === 'easy'
        ? hand[Math.floor(Math.random() * hand.length)]?.id
        : aiMostIsolated(hand);
      if (cardId) applyState(doDiscardCard(state, aiPid, cardId));
      return;
    }
  }

  // ─── Initialization ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isHost) return;
    applyState(deal(initialPlayers));
    if (!isSinglePlayer) {
      setServerListeners({
        onMessage: (msg, clientId) => {
          const s = fullRef.current;
          if (!s || msg.type !== 'ACTION') return;
          handleClientAction(s, String(clientId), msg);
        },
      });
    }
  }, []);

  useEffect(() => {
    if (isHost) return;
    setClientListeners({
      onMessage: (msg) => {
        if (msg.type === 'GAME_STATE') {
          setGameState(msg);
          setSelectedHandIds(new Set());
          setSelectedMeldIdx(null);
          setStatusMsg('');
        }
        if (msg.type === 'PRIVATE_HAND') {
          setMyHand(msg.hand);
        }
      },
      onDisconnected: () =>
        Alert.alert('Disconnected', 'Lost connection to the host.', [
          { text: 'OK', onPress: () => navigation.navigate('Home') },
        ]),
    });
  }, []);

  // ─── Client action handler (host only) ───────────────────────────────────────

  function handleClientAction(s, clientPid, msg) {
    if (msg.action === 'selectPassCard') {
      applyState(doSelectPassCard(s, clientPid, msg.cardId));
      return;
    }
    // For all playing-phase actions, verify it's this client's turn
    if (String(s.players[s.currentPlayerIndex]?.id) !== clientPid) return;

    switch (msg.action) {
      case 'draw':
        applyState(doDrawFromStock(s));
        break;
      case 'layMeld':
        applyState(doLayDownMeld(s, clientPid, msg.cardIds));
        break;
      case 'extendMeld':
        applyState(doExtendMeldFromHand(s, clientPid, msg.meldIdx, msg.cardIds));
        break;
      case 'takeMeld':
        applyState(doTakeActiveCard(s, clientPid, { type: 'new', handCardIds: msg.handCardIds }));
        break;
      case 'takeExtend':
        applyState(doTakeActiveCard(s, clientPid, { type: 'extend', meldIdx: msg.meldIdx }));
        break;
      case 'pass':
        applyState(doPassActiveCard(s));
        break;
      case 'discard':
        applyState(doDiscardCard(s, clientPid, msg.cardId));
        break;
      case 'borrow':
        applyState(doTakeWithBorrow(s, clientPid, msg.finalMelds));
        break;
    }
  }

  // ─── Handlers ────────────────────────────────────────────────────────────────

  function handleConfirmPass() {
    if (!passCardId) return;
    if (isHost) {
      let s = doSelectPassCard(fullRef.current, myPid, passCardId);
      if (isSinglePlayer) {
        for (const p of initialPlayers) {
          if (p.isAI) {
            const hand = s.hands[String(p.id)] ?? [];
            const cardId = difficulty === 'easy'
              ? hand[Math.floor(Math.random() * hand.length)]?.id
              : aiMostIsolated(hand);
            if (cardId) s = doSelectPassCard(s, String(p.id), cardId);
            if (s.phase === 'playing') break;
          }
        }
      }
      setPassCardId(null);
      applyState(s);
    } else {
      sendToHost({ type: 'ACTION', action: 'selectPassCard', cardId: passCardId });
      setPassCardId(null);
    }
  }

  function handleDraw() {
    if (isHost) {
      const s = fullRef.current;
      if (!s) return;
      applyState(doDrawFromStock(s));
    } else {
      sendToHost({ type: 'ACTION', action: 'draw' });
    }
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
    if (isHost) {
      const s = fullRef.current;
      if (!s) return;
      const next = doLayDownMeld(s, myPid, [...selectedHandIds]);
      if (next === s) { setStatusMsg('Invalid meld — select 3+ cards forming a valid set or run'); return; }
      applyState(next);
    } else {
      sendToHost({ type: 'ACTION', action: 'layMeld', cardIds: [...selectedHandIds] });
      setSelectedHandIds(new Set());
    }
  }

  function handleAddToMeld() {
    if (selectedMeldIdx === null) return;
    if (isHost) {
      const s = fullRef.current;
      if (!s) return;
      const next = doExtendMeldFromHand(s, myPid, selectedMeldIdx, [...selectedHandIds]);
      if (next === s) { setStatusMsg('Invalid extension'); return; }
      applyState(next);
    } else {
      sendToHost({ type: 'ACTION', action: 'extendMeld', meldIdx: selectedMeldIdx, cardIds: [...selectedHandIds] });
      setSelectedHandIds(new Set());
      setSelectedMeldIdx(null);
    }
  }

  function handleTakeMeld() {
    if (isHost) {
      const s = fullRef.current;
      if (!s || !s.activeCard) return;
      const next = doTakeActiveCard(s, myPid, { type: 'new', handCardIds: [...selectedHandIds] });
      if (next === s) { setStatusMsg('Invalid meld — active card + selected must form a valid set or run'); return; }
      applyState(next);
    } else {
      sendToHost({ type: 'ACTION', action: 'takeMeld', handCardIds: [...selectedHandIds] });
      setSelectedHandIds(new Set());
    }
  }

  function handleTakeExtend() {
    if (selectedMeldIdx === null) return;
    if (isHost) {
      const s = fullRef.current;
      if (!s || !s.activeCard) return;
      const next = doTakeActiveCard(s, myPid, { type: 'extend', meldIdx: selectedMeldIdx });
      if (next === s) { setStatusMsg('Cannot extend that meld with the active card'); return; }
      applyState(next);
    } else {
      sendToHost({ type: 'ACTION', action: 'takeExtend', meldIdx: selectedMeldIdx });
      setSelectedMeldIdx(null);
    }
  }

  function handlePass() {
    if (isHost) {
      applyState(doPassActiveCard(fullRef.current));
    } else {
      sendToHost({ type: 'ACTION', action: 'pass' });
    }
  }

  function handleDiscard(cardId) {
    if (isHost) {
      const s = fullRef.current;
      if (!s) return;
      const next = doDiscardCard(s, myPid, cardId);
      if (next !== s) applyState(next);
    } else {
      sendToHost({ type: 'ACTION', action: 'discard', cardId });
    }
  }

  function handlePlayAgain() {
    if (!isHost) return;
    setPassCardId(null);
    applyState(deal(initialPlayers));
  }

  // ─── Borrow mode handlers ─────────────────────────────────────────────────────

  function enterBorrowMode() {
    const ac = gameState?.activeCard;
    if (!ac) return;
    const myMeldsNow = gameState?.melds?.[myPid] ?? [];
    setBorrowGroups(myMeldsNow.map(m => [...m]));
    setBorrowPool([ac, ...myHand]);
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
    const nonEmpty = borrowGroups.filter(g => g.length > 0);
    if (isHost) {
      const s = fullRef.current;
      if (!s) return;
      const next = doTakeWithBorrow(s, myPid, nonEmpty);
      if (next === s) {
        setStatusMsg('Invalid — every group must be a valid meld and the active card must be placed');
        return;
      }
      exitBorrowMode();
      applyState(next);
    } else {
      const allValid = nonEmpty.length > 0 && nonEmpty.every(g => isValidMeld(g));
      const ac = gameState?.activeCard;
      const hasActive = nonEmpty.some(g => g.some(c => c.id === ac?.id));
      if (!allValid || !hasActive) {
        setStatusMsg('Invalid — every group must be a valid meld and the active card must be placed');
        return;
      }
      sendToHost({ type: 'ACTION', action: 'borrow', finalMelds: nonEmpty });
      exitBorrowMode();
    }
  }

  // ─── Guards ──────────────────────────────────────────────────────────────────

  if (!gameState) {
    return <SafeAreaView style={styles.loading}><Text style={styles.loadingText}>Dealing…</Text></SafeAreaView>;
  }

  // ─── Borrow mode overlay ──────────────────────────────────────────────────────

  if (borrowMode) {
    const ac = gameState?.activeCard;
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

          {ac && (
            <View style={styles.borrowActiveRow}>
              <Text style={styles.sectionLabel}>Active Card</Text>
              <Card rank={ac.rank} suit={ac.suit} />
            </View>
          )}

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

  // ─── Derived values ───────────────────────────────────────────────────────────

  const { phase, turnPhase, activeCard, stockSize, deadPileSize, winTarget } = gameState;
  const isMyTurn = String(gameState.players[gameState.currentPlayerIndex]?.id) === String(myPid);
  const myMelds = gameState.melds?.[myPid] ?? [];
  const myMelded = meldedCount(gameState, myPid);
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const opponents = gameState.players.filter(p => String(p.id) !== String(myPid));
  const selectedHandArr = myHand.filter(c => selectedHandIds.has(c.id));
  const myHasSubmittedPass = gameState.passSelectionsStatus?.[myPid] === true;

  const isDrawTurnFreeAction = isMyTurn && turnPhase === 'action' &&
    gameState.currentPlayerIndex === gameState.originalDrawerIndex &&
    (gameState.chainPassedPids?.length ?? 0) === 0;

  const canLayMeld = isDrawTurnFreeAction && isValidMeld(selectedHandArr);
  const canAddToMeld = isDrawTurnFreeAction &&
    selectedMeldIdx !== null && selectedHandArr.length >= 1 &&
    isValidMeld([...(myMelds[selectedMeldIdx] ?? []), ...selectedHandArr]);
  const canTakeMeld = isMyTurn && turnPhase === 'action' &&
    !!activeCard && isValidMeld([activeCard, ...selectedHandArr]);
  const canTakeExtend = isMyTurn && turnPhase === 'action' &&
    !!activeCard && selectedMeldIdx !== null &&
    canExtendMeld(myMelds[selectedMeldIdx] ?? [], activeCard);

  // ─── Results screen ───────────────────────────────────────────────────────────

  if (phase === 'results') {
    const { winner, tie } = gameState;
    const iWon = String(winner?.id) === String(myPid);
    return (
      <SafeAreaView style={styles.resultsContainer}>
        <Text style={styles.resultsEmoji}>{tie ? '🤝' : iWon ? '🏆' : '👑'}</Text>
        <Text style={styles.resultsTitle}>
          {tie ? "It's a Tie!" : iWon ? 'You Win!' : `${winner?.name} Wins!`}
        </Text>

        <View style={styles.scoreBoard}>
          {gameState.players.map(p => {
            const pid = String(p.id);
            const melded = meldedCount(gameState, pid);
            const isWinner = !tie && String(winner?.id) === pid;
            const isMe = pid === String(myPid);
            const pct = Math.min(melded / winTarget, 1);
            return (
              <View key={pid} style={[styles.scoreRow, isWinner && styles.scoreRowWinner]}>
                <Text style={styles.scoreName} numberOfLines={1}>
                  {isWinner ? '★ ' : ''}{p.name}{isMe ? ' (you)' : ''}
                </Text>
                <View style={styles.scoreBarTrack}>
                  <View style={[styles.scoreBarFill, { width: `${pct * 100}%` }, isWinner && styles.scoreBarFillWinner]} />
                </View>
                <Text style={styles.scoreCount}>{melded}/{winTarget}</Text>
              </View>
            );
          })}
        </View>

        {isHost && (
          <TouchableOpacity style={styles.playAgainBtn} onPress={handlePlayAgain}>
            <Text style={styles.playAgainText}>Play Again</Text>
          </TouchableOpacity>
        )}
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

      {/* Opponents — single row across the top; cards wrap naturally */}
      <View style={styles.opponentsRow}>
        {opponents.map(p => {
          const opPid = String(p.id);
          const isCurrent = String(currentPlayer?.id) === opPid;
          const opMelds = gameState.melds?.[opPid] ?? [];
          return (
            <View
              key={opPid}
              style={[
                styles.opponentCard,
                isCurrent && styles.opponentCardActive,
                opponents.length > 1 && styles.opponentCardMulti,
              ]}
            >
              <View style={styles.opponentHeader}>
                <Text style={styles.opponentName} numberOfLines={1}>{p.name}</Text>
                {isCurrent && <Text style={styles.opponentTurnDot}>▶</Text>}
              </View>
              <Text style={styles.opponentStats}>
                {gameState.handSizes?.[opPid] ?? 0} cards · {meldedCount(gameState, opPid)}/{winTarget}
              </Text>
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
      </View>

      {/* Center — stock / active slot / dead pile + status */}
      <View style={styles.centerSection}>
        <View style={styles.pileRow}>
          <View style={styles.pileBox}>
            <Text style={styles.pileLabel}>Stock</Text>
            <Text style={styles.pileCount}>{stockSize}</Text>
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
            <Text style={styles.pileCount}>{deadPileSize}</Text>
          </View>
        </View>

        <Text style={styles.myProgress}>
          You: {myHand.length} in hand · {myMelded}/{winTarget} melded
        </Text>

        {phase === 'initialPass' && !myHasSubmittedPass && (
          <Text style={styles.phaseLabel}>Pick 1 card to pass clockwise</Text>
        )}
        {phase === 'initialPass' && myHasSubmittedPass && (
          <Text style={styles.phaseLabel}>Waiting for other players…</Text>
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
            {(gameState.chainPassedPids?.length ?? 0) > 0
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
          {phase === 'initialPass' && !myHasSubmittedPass
            ? 'Your Hand — tap to select 1 card to pass'
            : `Your Hand (${myHand.length})`}
        </Text>
        <View style={styles.handRow}>
          {myHand.map(card => {
            const isSelected = phase === 'initialPass'
              ? passCardId === card.id
              : selectedHandIds.has(card.id);
            const tappable = (phase === 'initialPass' && !myHasSubmittedPass) ||
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
        {phase === 'initialPass' && !myHasSubmittedPass && (
          <TouchableOpacity
            style={[styles.actionBtn, !passCardId && styles.actionBtnDisabled]}
            onPress={handleConfirmPass}
            disabled={!passCardId}
          >
            <Text style={styles.actionBtnText}>Confirm Pass</Text>
          </TouchableOpacity>
        )}

        {phase === 'initialPass' && myHasSubmittedPass && (
          <Text style={styles.waitText}>Waiting for other players…</Text>
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
            {(gameState.chainPassedPids?.length ?? 0) > 0
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
  resultsEmoji: { fontSize: 52, marginBottom: 8 },
  resultsTitle: { color: '#fff', fontSize: 30, fontWeight: 'bold', textAlign: 'center', marginBottom: 28 },
  scoreBoard: { width: '100%', marginBottom: 32, gap: 10 },
  scoreRow: { backgroundColor: '#16213e', borderRadius: 10, padding: 12, borderWidth: 1.5, borderColor: '#334' },
  scoreRowWinner: { borderColor: '#ffd700' },
  scoreName: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginBottom: 6 },
  scoreBarTrack: { height: 8, backgroundColor: '#0d1117', borderRadius: 4, marginBottom: 4, overflow: 'hidden' },
  scoreBarFill: { height: '100%', backgroundColor: '#4caf50', borderRadius: 4 },
  scoreBarFillWinner: { backgroundColor: '#ffd700' },
  scoreCount: { color: '#b0b0c0', fontSize: 12, textAlign: 'right' },
  playAgainBtn: { backgroundColor: '#4caf50', paddingHorizontal: 48, paddingVertical: 18, borderRadius: 12, marginBottom: 16 },
  playAgainText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  homeBtn: { backgroundColor: '#16213e', paddingHorizontal: 48, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#334' },
  homeBtnText: { color: '#b0b0c0', fontSize: 16 },

  opponentsRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 6 },
  opponentCard: { backgroundColor: '#16213e', borderRadius: 10, padding: 10, borderWidth: 1.5, borderColor: '#334', flex: 1 },
  opponentCardActive: { borderColor: '#e94560' },
  opponentCardMulti: { minWidth: 0 },
  opponentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  opponentName: { color: '#fff', fontSize: 13, fontWeight: 'bold', flex: 1 },
  opponentTurnDot: { color: '#e94560', fontSize: 11, marginLeft: 4 },
  opponentStats: { color: '#b0b0c0', fontSize: 11, marginBottom: 2 },
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
