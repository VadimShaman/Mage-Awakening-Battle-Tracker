// js/battle/battle-status.js
// ============================================================
// СТАТУСЫ, УРОН, СОСТОЯНИЯ, РЕАКЦИИ
// ============================================================
import { db, doc, getDoc, updateDoc } from '../firebase-config.js';
import { rollDicePool, formatDiceResult } from './battle-dice.js';
import { addLog } from './battle-log.js';

// ============================================================
// 1. ПРИМЕНЕНИЕ УРОНА
// ============================================================
export async function applyDamage(battleId, charId, damage, damageType = 'bashing', meta = {}) {
    const battleRef = doc(db, 'battles', battleId);
    const snap = await getDoc(battleRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const char = data.characters?.[charId];
    if (!char) return;
    if (char.status === 'dead') return;

    const maxHp = char.maxHealth || 7;
    const currentHp = char.health ?? maxHp;
    const newHp = Math.max(-maxHp, currentHp - damage);

    // Массив типов урона
    let damageTypes = char.damageTypes || new Array(maxHp).fill(null);
    const rank = { bashing: 1, lethal: 2, aggravated: 3 };

    for (let i = currentHp - 1; i >= newHp && i >= 0; i--) {
        const existing = damageTypes[i];
        const existingRank = existing ? rank[existing] : 0;
        const newRank = rank[damageType] || 1;
        damageTypes[i] = newRank > existingRank ? damageType : existing;
    }

    // Статус
    let status = 'alive';
    let isActive = true;
    if (newHp <= -maxHp) {
        status = 'dead';
        isActive = false;
    } else if (newHp <= 0) {
        status = 'critical';
    }

    const isDead = status === 'dead';
    const killIncrement = isDead && char.status !== 'dead' ? 1 : 0;

    // Обновляем персонажа
    const updates = {
        [`characters.${charId}.health`]: newHp,
        [`characters.${charId}.damageTypes`]: damageTypes,
        [`characters.${charId}.status`]: status,
        [`characters.${charId}.isActive`]: isActive
    };

    if (killIncrement > 0) {
        updates.kills = (data.kills || 0) + killIncrement;
    }

    await updateDoc(battleRef, updates);

    const labels = { bashing: '💥 тупой', lethal: '🩸 летальный', aggravated: '☠️ особый' };
    await addLog(battleId, {
        text: `💥 ${meta.attackerName || 'Кто-то'} наносит ${damage} ${labels[damageType]} урона ${char.name}${isDead ? ' ☠️ СМЕРТЬ' : ''}`,
        damage: damage,
        isSystem: false
    });

    return { newHp, status, isDead };
}

// ============================================================
// 2. ШТРАФЫ ЗА РАНЕНИЯ
// ============================================================
/**
 * Возвращает штраф за ранения (0, -1, -2, -3).
 * Проверяет три правые клетки здоровья.
 */
export function getWoundPenalty(char) {
    const maxHp = char.maxHealth || 7;
    const hp = char.health ?? maxHp;
    if (hp > 0) return 0;

    // Клетки считаются от 1 до maxHp (последние — самые правые)
    // hp=0 → ранена последняя клетка (−1)
    // hp=-1 → ранены последние 2 (−2)
    // hp<=-2 → ранены последние 3 (−3)
    if (hp <= -2) return -3;
    if (hp <= -1) return -2;
    if (hp <= 0) return -1;
    return 0;
}

// ============================================================
// 3. УКЛОНЕНИЕ
// ============================================================
/**
 * Бросок активного уклонения: удвоенная Защита как пул кубов.
 * Успехи вычитаются из успехов атакующего.
 */
export async function performDodge(battleId, charId, incomingSuccesses, attackerName) {
    const battleRef = doc(db, 'battles', battleId);
    const snap = await getDoc(battleRef);
    if (!snap.exists()) return { dodged: false, remainingSuccesses: incomingSuccesses };

    const data = snap.data();
    const char = data.characters?.[charId];
    if (!char) return { dodged: false, remainingSuccesses: incomingSuccesses };

    // Защита = Min(Лов, Сообр) + Атлетика
    const defense = Math.min(char.dexterity || 2, char.wits || 2) + (char.athletics || 0);

    // Уклонение = удвоенная Защита как пул кубов
    const dodgePool = defense * 2;
    const result = rollDicePool(dodgePool);

    const remaining = Math.max(0, incomingSuccesses - result.successes);
    const dodged = remaining === 0;

    await addLog(battleId, {
        text: `🏃 ${char.name} уклоняется (пул ${dodgePool}): ${formatDiceResult(result)} → ${remaining === 0 ? '✅ ПОЛНОСТЬЮ УКЛОНИЛСЯ' : `осталось ${remaining} успехов`}`,
        isSystem: true
    });

    return {
        dodged,
        remainingSuccesses: remaining,
        dodgeRolls: result.rolls,
        dodgeSuccesses: result.successes,
        dodgePool
    };
}

// ============================================================
// 4. ЛЕЧЕНИЕ
// ============================================================
/**
 * Лечит персонажа от урона (по типу и количеству).
 * Снимает урон справа налево, начиная с самого лёгкого типа.
 */
export async function healDamage(battleId, charId, amount, damageType = 'bashing') {
    const battleRef = doc(db, 'battles', battleId);
    const snap = await getDoc(battleRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const char = data.characters?.[charId];
    if (!char) return;

    const maxHp = char.maxHealth || 7;
    let hp = char.health ?? maxHp;
    let damageTypes = (char.damageTypes || new Array(maxHp).fill(null)).slice();

    let healed = 0;

    // Проходим по клеткам справа налево (самые правые — самые лёгкие повреждения)
    for (let i = maxHp - 1; i >= 0 && healed < amount; i--) {
        if (i < hp) continue; // пустая клетка

        const cellType = damageTypes[i];
        if (!cellType) continue;

        // Проверяем, можно ли лечить этот тип
        const canHeal =
            damageType === 'aggravated' || // особый урон лечит всё
            (damageType === 'lethal' && cellType !== 'aggravated') ||
            (damageType === 'bashing' && cellType === 'bashing');

        if (!canHeal) continue;

        damageTypes[i] = null;
        hp++;
        healed++;
    }

    // Пересчёт статуса
    let status = 'alive';
    let isActive = true;
    if (hp <= -maxHp) {
        status = 'dead';
        isActive = false;
    } else if (hp <= 0) {
        status = 'critical';
    }

    await updateDoc(battleRef, {
        [`characters.${charId}.health`]: hp,
        [`characters.${charId}.damageTypes`]: damageTypes,
        [`characters.${charId}.status`]: status,
        [`characters.${charId}.isActive`]: isActive
    });

    const labels = { bashing: 'тупого', lethal: 'летального', aggravated: 'особого' };
    await addLog(battleId, {
        text: `💚 ${char.name} восстановил ${healed} ${labels[damageType]} урона`,
        isSystem: true
    });

    return { healed, newHp: hp };
}

// ============================================================
// 5. СОСТОЯНИЯ
// ============================================================
/**
 * Добавить состояние (постоянное или временное)
 */
export async function addCondition(battleId, charId, conditionName, options = {}) {
    const battleRef = doc(db, 'battles', battleId);
    const snap = await getDoc(battleRef);
    if (!snap.exists()) return;

    const char = snap.data().characters?.[charId];
    if (!char) return;

    const conditions = char.conditions || [];
    if (conditions.find(c => c.name === conditionName)) return;

    conditions.push({
        name: conditionName,
        permanent: options.permanent || false,
        turnsLeft: options.turnsLeft || null,
        appliedAt: Date.now()
    });

    await updateDoc(battleRef, {
        [`characters.${charId}.conditions`]: conditions
    });

    await addLog(battleId, {
        text: `⚠️ ${char.name} получает состояние: ${conditionName}`,
        isSystem: true
    });
}

export async function removeCondition(battleId, charId, conditionName) {
    const battleRef = doc(db, 'battles', battleId);
    const snap = await getDoc(battleRef);
    if (!snap.exists()) return;

    const char = snap.data().characters?.[charId];
    if (!char) return;

    const conditions = (char.conditions || []).filter(c => c.name !== conditionName);

    await updateDoc(battleRef, {
        [`characters.${charId}.conditions`]: conditions
    });
}