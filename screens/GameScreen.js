import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { createDeck, shuffleDeck, calculateHandValue } from '../game/deck';
import Card from '../components/Card';
import { scale, scaleFont } from '../game/responsive';

export default function GameScreen() {
  // State
  const [deck, setDeck] = useState([]);
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [gameStatus, setGameStatus] = useState('playing');
  // gameStatus: 'playing' | 'bust' | 'dealerTurn' | 'finished'
  const [result, setResult] = useState('');
  // result: '' | 'win' | 'lose' | 'push'

  // Deal opening hand when screen first loads
  useEffect(() => {
    startNewGame();
  }, []);

  function startNewGame() {
    const newDeck = shuffleDeck(createDeck());
    const playerCards = [newDeck[0], newDeck[2]];
    const dealerCards = [newDeck[1], newDeck[3]];
    const remainingDeck = newDeck.slice(4);

    setDeck(remainingDeck);
    setPlayerHand(playerCards);
    setDealerHand(dealerCards);
    setGameStatus('playing');
    setResult('');
  }

  // HIT: add one card from the deck to the player's hand
  function handleHit() {
    const newCard = deck[0];
    const remainingDeck = deck.slice(1);
    const newHand = [...playerHand, newCard];

    setPlayerHand(newHand);
    setDeck(remainingDeck);

    const newTotal = calculateHandValue(newHand);
    if (newTotal > 21) {
      setGameStatus('bust');
      setResult('lose');
    }
  }

  // STAND: player is done, dealer's turn begins
  function handleStand() {
    setGameStatus('dealerTurn');
    playDealerTurn();
  }

  // DEALER: reveal and keep hitting until 17+
  function playDealerTurn() {
    let currentDealerHand = [...dealerHand];
    let currentDeck = [...deck];

    // Dealer keeps hitting while under 17
    while (calculateHandValue(currentDealerHand) < 17) {
      const nextCard = currentDeck[0];
      currentDealerHand.push(nextCard);
      currentDeck = currentDeck.slice(1);
    }

    // Update state
    setDealerHand(currentDealerHand);
    setDeck(currentDeck);

    // Decide the winner
    const playerTotal = calculateHandValue(playerHand);
    const dealerTotal = calculateHandValue(currentDealerHand);

    if (dealerTotal > 21) {
      setResult('win'); // dealer busted
    } else if (playerTotal > dealerTotal) {
      setResult('win');
    } else if (dealerTotal > playerTotal) {
      setResult('lose');
    } else {
      setResult('push');
    }

    setGameStatus('finished');
  }

  // Calculate totals for display
  const playerTotal = calculateHandValue(playerHand);

  // Show dealer's full total only after they've played; otherwise show visible card
  const showFullDealerHand = gameStatus === 'dealerTurn' || gameStatus === 'finished' || gameStatus === 'bust';
  const dealerDisplayTotal = showFullDealerHand
    ? calculateHandValue(dealerHand)
    : (dealerHand.length > 0 ? calculateHandValue([dealerHand[0]]) : 0);

  // Build the status message
  let statusMessage = '';
  let statusColor = '#ffd700';
  if (gameStatus === 'bust') {
    statusMessage = '💥 Bust! You lose.';
    statusColor = '#ff6b6b';
  } else if (gameStatus === 'finished') {
    if (result === 'win') {
      statusMessage = '🎉 You win!';
      statusColor = '#4ade80';
    } else if (result === 'lose') {
      statusMessage = '😞 Dealer wins.';
      statusColor = '#ff6b6b';
    } else if (result === 'push') {
      statusMessage = '🤝 Push (tie).';
      statusColor = '#ffd700';
    }
  }

  const canPlay = gameStatus === 'playing';
  const gameOver = gameStatus === 'bust' || gameStatus === 'finished';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Dealer section */}
      <View style={styles.section}>
        <Text style={styles.label}>
          Dealer — {showFullDealerHand ? 'total:' : 'shows'} {dealerDisplayTotal}
        </Text>
        <View style={styles.hand}>
          {dealerHand.map((card, index) => (
            <Card
              key={card.id}
              rank={card.rank}
              suit={card.suit}
              // Hide second card ONLY while player is still playing
              faceDown={index === 1 && !showFullDealerHand}
            />
          ))}
        </View>
      </View>

      {/* Player section */}
      <View style={styles.section}>
        <Text style={styles.label}>You — total: {playerTotal}</Text>
        <View style={styles.hand}>
          {playerHand.map((card) => (
            <Card
              key={card.id}
              rank={card.rank}
              suit={card.suit}
            />
          ))}
        </View>
      </View>

      {/* Status message */}
      {statusMessage !== '' && (
        <Text style={[styles.status, { color: statusColor }]}>{statusMessage}</Text>
      )}

      {/* Hit and Stand buttons */}
      {!gameOver && (
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, styles.hitButton, !canPlay && styles.disabled]}
            onPress={handleHit}
            disabled={!canPlay}
          >
            <Text style={styles.buttonText}>Hit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.standButton, !canPlay && styles.disabled]}
            onPress={handleStand}
            disabled={!canPlay}
          >
            <Text style={styles.buttonText}>Stand</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Play Again button (only when game is over) */}
      {gameOver && (
        <TouchableOpacity
          style={styles.playAgainButton}
          onPress={startNewGame}
        >
          <Text style={styles.playAgainText}>🔄 Play Again</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0d5c2e',
    alignItems: 'center',
    padding: scale(20),
  },
  section: {
    alignItems: 'center',
    marginVertical: scale(20),
  },
  label: {
    color: '#ffffff',
    fontSize: scaleFont(18),
    fontWeight: 'bold',
    marginBottom: scale(10),
  },
  hand: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  status: {
    fontSize: scaleFont(24),
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: scale(15),
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: scale(20),
  },
  button: {
    paddingVertical: scale(15),
    paddingHorizontal: scale(40),
    borderRadius: scale(10),
    marginHorizontal: scale(10),
  },
  hitButton: {
    backgroundColor: '#e94560',
  },
  standButton: {
    backgroundColor: '#2980b9',
  },
  disabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: scaleFont(18),
    fontWeight: 'bold',
  },
  playAgainButton: {
    marginTop: scale(30),
    backgroundColor: '#e94560',
    paddingVertical: scale(15),
    paddingHorizontal: scale(50),
    borderRadius: scale(10),
  },
  playAgainText: {
    color: '#ffffff',
    fontSize: scaleFont(18),
    fontWeight: 'bold',
  },
});