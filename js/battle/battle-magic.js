// js/battle/battle-magic.js
// ============================================================
// ЛОГИКА ЗАКЛИНАНИЙ (Маг: Пробуждение)
// ============================================================
import { db } from '../firebase-config.js';
import { doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { rollDicePool, formatDiceResult } from './battle-dice.js';
import { applyDamage } from './battle-status.js';
import { addLog } from './battle-log.js';

/**
 * Сотворение заклинания
 */
export async function castSpell(battleId, casterId, spellData) {
    const battleRef = doc(db, 'battles', battleId);
    const battleSnap = await getDoc(battleRef);
    if (!battleSnap.exists()) throw new Error('Бой не найден');

    const data = battleSnap.data();
    const caster = data.characters[casterId];
    if (!caster) throw new Error('Маг не найден');

    // 1. Проверка Маны
    if (spellData.manaCost > (caster.mana || 0)) {
        return { error: 'Недостаточно Маны' };
    }

    // 2. Расчет пула
    let pool = (caster.gnosis || 1) + (spellData.arcanumRating || 1);
    pool += (spellData.yantraBonus || 0);
    pool -= (spellData.penalties || 0);
    pool = Math.max(0, pool);

    // 3. Бросок заклинания
    const result = rollDicePool(pool, {
        roteQuality: spellData.isRote || false
    });

    // 4. Парадокс
    let paradoxResult = null;
    if (spellData.paradoxDice > 0) {
        paradoxResult = rollDicePool(spellData.paradoxDice);
        // TODO: обработка Парадокса (аномалии, урон, состояния)
    }

    // 5. Применение эффекта
    if (spellData.type === 'attack' && result.successes > 0) {
        await applyDamage(battleId, spellData.targetId, result.successes, {
            attacker: caster.name,
            spell: spellData.name,
            damageType: spellData.damageType || 'lethal',
            isMagical: true
        });
    }

    // 6. Трата Маны
    if (spellData.manaCost > 0) {
        await updateDoc(battleRef, {
            [`characters.${casterId}.mana`]: (caster.mana || 0) - spellData.manaCost
        });
    }

    // 7. Лог
    await addLog(battleId, {
        time: new Date().toLocaleTimeString(),
        text: `🔮 ${caster.name} творит «${spellData.name}»: ${formatDiceResult(result)}`,
        isSystem: false,
        isMagic: true
    });

    return { result, paradoxResult };
}