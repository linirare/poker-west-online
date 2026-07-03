const test = require('node:test');
const assert = require('node:assert/strict');
const game = require('../server/game');

function c(rank, suit) {
  return { id: `${rank}${suit}`, rank, suit };
}

test('evaluates royal flush as the strongest category', () => {
  const result = game.evaluate([c(14, '♠'), c(13, '♠'), c(12, '♠'), c(11, '♠'), c(10, '♠')]);
  assert.equal(result.cat, 9);
});

test('evaluates full house and four of a kind categories', () => {
  assert.equal(game.evaluate([c(9, '♠'), c(9, '♥'), c(9, '♦'), c(9, '♣'), c(2, '♠')]).cat, 7);
  assert.equal(game.evaluate([c(8, '♠'), c(8, '♥'), c(8, '♦'), c(3, '♣'), c(3, '♠')]).cat, 6);
});

test('joker chooses a best replacement', () => {
  const result = game.evaluate([c(14, '♥'), c(13, '♥'), c(12, '♥'), c(11, '♥'), { id: 'joker', joker: true, rank: 15, suit: '★' }]);
  assert.equal(result.cat, 9);
});

test('roundNeed includes bonuses but never drops below one', () => {
  const battle = game.createBattle(['bomb', 'magician'], ['lock', 'god']);
  battle.player.playBonus = -10;
  assert.equal(game.roundNeed('player', battle), 1);
  battle.player.playBonus = 2;
  assert.equal(game.roundNeed('player', battle), 5);
});

test('selected-card skills mutate state predictably', () => {
  const battle = game.createBattle(['magician', 'burst'], ['bomb', 'god']);
  const before = battle.player.hand.length;
  game.applySkill('player', 'magician', battle, [battle.player.hand[0].id]);
  assert.equal(battle.player.hand.length, before + 1);
  game.applySkill('player', 'burst', battle);
  assert.equal(battle.player.playBonus, 1);
});
