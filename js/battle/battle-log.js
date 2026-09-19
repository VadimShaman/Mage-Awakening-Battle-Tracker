// js/battle/battle-log.js
// ============================================================
// ЛОГИРОВАНИЕ БОЯ
// ============================================================
import { db, doc, getDoc, updateDoc } from '../firebase-config.js';

/**
 * Добавить запись в лог боя.
 * @param {string} battleId — ID боя
 * @param {object} entry — { time, text, isSystem?, isMagic?, damage? }
 */
export async function addLog(battleId, entry) {
    const battleRef = doc(db, 'battles', battleId);
    const snap = await getDoc(battleRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const log = data.log || [];

    log.push({
        time: entry.time || new Date().toLocaleTimeString('ru-RU'),
        text: entry.text || '',
        isSystem: entry.isSystem || false,
        isMagic: entry.isMagic || false,
        damage: entry.damage || 0,
        timestamp: new Date().toISOString()
    });

    // Ограничим размер лога
    if (log.length > 500) log.splice(0, log.length - 500);

    await updateDoc(battleRef, { log });
}