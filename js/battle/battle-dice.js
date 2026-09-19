// js/battle/battle-dice.js
// ============================================================
// ПУЛ КУБОВ D10 ДЛЯ ХРОНИК ТЬМЫ
// ============================================================

/**
 * Бросок пула d10.
 * Успех на 8, 9, 10. Десятки взрываются.
 * @param {number} poolSize — количество кубов
 * @param {object} options — { tenAgain: true, roteQuality: false, chanceDie: false }
 * @returns {object} — { successes, rolls, isDramaticFailure, isExceptional }
 */
export function rollDicePool(poolSize, options = {}) {
    const tenAgain = options.tenAgain !== false;
    const roteQuality = options.roteQuality || false;
    const chanceDie = options.chanceDie || false;

    // Шанс-бросок: если пул <= 0, бросаем 1 куб, успех только на 10
    if (poolSize <= 0) {
        const r = Math.floor(Math.random() * 10) + 1;
        return {
            successes: r === 10 ? 1 : 0,
            rolls: [r],
            isDramaticFailure: r === 1,
            isExceptional: false,
            isChanceDie: true
        };
    }

    let successes = 0;
    const rolls = [];

    for (let i = 0; i < poolSize; i++) {
        let r = Math.floor(Math.random() * 10) + 1;
        rolls.push(r);

        // Rote Quality: перебрасываем провалы
        if (roteQuality && r < 8) {
            const reroll = Math.floor(Math.random() * 10) + 1;
            rolls.push(`r${reroll}`);
            if (reroll >= 8) {
                successes++;
                r = reroll; // для взрыва
            }
        }

        if (r >= 8) successes++;

        // Взрыв десяток
        if (r === 10 && tenAgain) {
            let extra = Math.floor(Math.random() * 10) + 1;
            rolls.push(`+${extra}`);
            while (extra === 10) {
                successes++;
                extra = Math.floor(Math.random() * 10) + 1;
                rolls.push(`+${extra}`);
            }
            if (extra >= 8) successes++;
        }
    }

    // Драматический провал: 0 успехов и есть хотя бы одна 1
    const isDramaticFailure = successes === 0 && rolls.some(r => r === 1 || r === '1');

    // Исключительный успех: 5+ успехов
    const isExceptional = successes >= 5;

    return {
        successes,
        rolls,
        isDramaticFailure,
        isExceptional,
        isChanceDie: false
    };
}

/**
 * Форматирует результат броска для лога
 */
export function formatDiceResult(result) {
    const rollsStr = result.rolls.join(', ');
    let text = `[${rollsStr}] → ${result.successes} успех(ов)`;
    if (result.isDramaticFailure) text += ' 💀 ДРАМАТИЧЕСКИЙ ПРОВАЛ';
    if (result.isExceptional) text += ' 🌟 ИСКЛЮЧИТЕЛЬНЫЙ УСПЕХ';
    if (result.isChanceDie) text += ' 🎲 ШАНС-БРОСОК';
    return text;
}