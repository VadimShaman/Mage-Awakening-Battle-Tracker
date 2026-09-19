// js/battle/battle-attack.js
import { db } from '../firebase-config.js';
import { doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { rollDicePool, formatDiceResult } from './battle-dice.js';
import { applyDamage } from './battle-status.js';
import { addLog } from './battle-log.js';

// ============================================================
// АТАКА В ХРОНИКАХ ТЬМЫ
// ============================================================
export function calculateMageAttack(attacker, defender, options = {}) {
    const {
        isRanged = false,
        weaponBonus = 0,
        aiming = false,
        allOut = false,
        willpower = false
    } = options;

    // 1. Базовый пул
    let pool = isRanged
        ? (attacker.dexterity || 2) + (attacker.firearms || 0)
        : (attacker.strength || 2) + (attacker.brawl || 0);

    // 2. Модификаторы
    pool += weaponBonus;
    if (aiming) pool += 1;
    if (allOut) pool += 2;
    if (willpower) pool += 3;

    // 3. Защита цели
    const defense = Math.min(defender.dexterity || 2, defender.wits || 2) + (defender.athletics || 0);
    pool -= defense;

    // 4. Минимум 0
    pool = Math.max(0, pool);

    // 5. Бросок
    const result = rollDicePool(pool);

    // 6. Урон = успехи
    const damage = result.successes;
    const damageType = options.lethal ? 'lethal' : 'bashing';

    return {
        pool,
        successes: result.successes,
        rolls: result.rolls,
        damage,
        damageType,
        isDramaticFailure: result.isDramaticFailure,
        isExceptional: result.isExceptional,
        defense
    };
}

export async function performAttack(battleId, attackerId, defenderId, options = {}) {
    const battleRef = doc(db, 'battles', battleId);
    const battleSnap = await getDoc(battleRef);
    if (!battleSnap.exists()) throw new Error('Бой не найден');

    const data = battleSnap.data();
    const attacker = data.characters[attackerId];
    const defender = data.characters[defenderId];

    if (!attacker || !defender) throw new Error('Персонаж не найден');

    const result = calculateMageAttack(attacker, defender, options);

    if (result.damage > 0) {
        await applyDamage(battleId, defenderId, result.damage, {
            attacker: attacker.name,
            defender: defender.name,
            damageType: result.damageType,
            rolls: result.rolls,
            successes: result.successes
        });
    } else {
        await addLog(battleId, {
            time: new Date().toLocaleTimeString(),
            text: `${attacker.name} атакует ${defender.name} — ПРОМАХ (${formatDiceResult(result)})`,
            isSystem: true
        });
    }

    if (result.isDramaticFailure) {
        await addLog(battleId, {
            time: new Date().toLocaleTimeString(),
            text: `💀 ${attacker.name} — ДРАМАТИЧЕСКИЙ ПРОВАЛ!`,
            isSystem: true
        });
    }

    return result;
}