// js/battle/battle-attack.js
// ============================================================
// АТАКА В MAGE: THE AWAKENING 2E
// ============================================================
import { db, doc, getDoc, updateDoc } from '../firebase-config.js';
import { rollDicePool, formatDiceResult } from './battle-dice.js';
import { addLog } from './battle-log.js';
import { applyDamage, getWoundPenalty } from './battle-status.js';

const DAMAGE_LABELS = {
    bashing: '💥 Тупой',
    lethal: '🩸 Летальный',
    aggravated: '☠️ Особый'
};

/**
 * Расчёт пула атаки (без броска)
 */
export function calculateAttackPool(attacker, defender, options = {}) {
    const {
        isRanged = false,
        weaponBonus = 0,
        willpower = false
    } = options;

    // Базовый пул
    let pool = isRanged
        ? (attacker.dexterity || 2) + (attacker.firearms || 0)
        : (attacker.strength || 2) + (attacker.brawl || 0);

    pool += weaponBonus;
    if (willpower) pool += 3;

    // Штраф за ранения атакующего
    const woundPenalty = getWoundPenalty(attacker);
    pool += woundPenalty;

    // Штрафы за состояния атакующего
    const conditions = attacker.conditions || [];
    for (const cond of conditions) {
        if (cond.name === 'Ранен') pool -= 2;
        if (cond.name === 'Ослеплён') pool -= 3;
        if (cond.name === 'Оглушён') pool -= 2;
    }

    // Защита цели
    const defense = Math.min(defender.dexterity || 2, defender.wits || 2) + (defender.athletics || 0);
    pool -= defense;

    return {
        pool: Math.max(0, pool),
        rawPool: pool,
        defense,
        woundPenalty
    };
}

/**
 * Выполнение атаки с записью в Firebase
 */
export async function performAttack(battleId, attackerId, defenderId, options = {}) {
    const battleRef = doc(db, 'battles', battleId);
    const snap = await getDoc(battleRef);
    if (!snap.exists()) throw new Error('Бой не найден');

    const data = snap.data();
    const attacker = data.characters[attackerId];
    const defender = data.characters[defenderId];

    if (!attacker || !defender) throw new Error('Персонаж не найден');
    if (!attacker.isActive) throw new Error('Атакующий неактивен');
    if (defender.status === 'dead') throw new Error('Цель уже мертва');

    const weaponName = options.weaponName || 'Кулак';
    const damageType = options.damageType || 'bashing';

    // 1. Пул
    const poolInfo = calculateAttackPool(attacker, defender, options);

    // 2. Бросок
    const result = rollDicePool(poolInfo.pool);
    const successes = result.successes;

    // 3. Лог атаки
    await addLog(battleId, {
        text: `⚔️ ${attacker.name} атакует ${defender.name} (${weaponName}, ${DAMAGE_LABELS[damageType]}, пул ${poolInfo.pool})`,
        isSystem: true
    });

    // 4. Провал?
    if (successes === 0) {
        if (result.isDramaticFailure) {
            await addLog(battleId, {
                text: `💀 ${attacker.name} — ДРАМАТИЧЕСКИЙ ПРОВАЛ! (${result.rolls.join(', ')})`,
                isSystem: true
            });
        } else {
            await addLog(battleId, {
                text: `❌ ${attacker.name} промахивается (${result.rolls.join(', ')})`,
                isSystem: true
            });
        }
        return { ...result, ...poolInfo, damage: 0, damageType, attackerName: attacker.name, defenderName: defender.name };
    }

    // 5. Успех! Возвращаем данные для возможного уклонения
    return {
        ...result,
        ...poolInfo,
        damage: successes, // пока предварительно
        damageType,
        attackerName: attacker.name,
        defenderName: defender.name,
        weaponName,
        defenderId,
        attackerId,
        awaitingDodge: true // сигнал UI: можно предложить уклонение
    };
}

/**
 * Финальная запись урона после возможного уклонения
 */
export async function resolveDamage(battleId, attackerId, defenderId, damage, damageType, meta = {}) {
    await applyDamage(battleId, defenderId, damage, damageType, {
        attackerName: meta.attackerName
    });
    return { applied: damage };
}

/**
 * Восстановление Силы Воли (в начале сессии или за сцену)
 */
export async function restoreWillpower(battleId, charId, amount = 1) {
    const battleRef = doc(db, 'battles', battleId);
    const snap = await getDoc(battleRef);
    if (!snap.exists()) return;

    const char = snap.data().characters?.[charId];
    if (!char) return;

    const maxWP = char.maxWillpower || 4;
    const newWP = Math.min(maxWP, (char.willpower || 0) + amount);

    await updateDoc(battleRef, {
        [`characters.${charId}.willpower`]: newWP
    });
}