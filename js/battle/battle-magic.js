// js/battle/battle-magic.js
// ============================================================
// МАГИЯ В БОЕВОЙ КОМНАТЕ
// ============================================================
import { db, doc, getDoc, updateDoc } from '../firebase-config.js';
import { rollDicePool, formatDiceResult } from './battle-dice.js';
import { addLog } from './battle-log.js';
import { applyDamage, healDamage, addCondition } from './battle-status.js';

export const ARCANUM_LIST = [
    { key: 'Death', name: 'Смерть' },
    { key: 'Fate', name: 'Судьба' },
    { key: 'Forces', name: 'Силы' },
    { key: 'Life', name: 'Жизнь' },
    { key: 'Matter', name: 'Материя' },
    { key: 'Mind', name: 'Разум' },
    { key: 'Prime', name: 'Основы' },
    { key: 'Spirit', name: 'Дух' },
    { key: 'Space', name: 'Пространство' },
    { key: 'Time', name: 'Время' }
];

export const PRACTICES = [
    { level: 1, name: 'Принуждение', type: 'control' },
    { level: 1, name: 'Познание', type: 'info' },
    { level: 1, name: 'Раскрытие', type: 'info' },
    { level: 2, name: 'Правление', type: 'control' },
    { level: 2, name: 'Защита', type: 'defense' },
    { level: 2, name: 'Сокрытие', type: 'conceal' },
    { level: 3, name: 'Расплетение', type: 'damage' },
    { level: 3, name: 'Совершенствование', type: 'buff' },
    { level: 3, name: 'Плетение', type: 'transform' },
    { level: 4, name: 'Узорование', type: 'transform' },
    { level: 4, name: 'Разъятие', type: 'damage' },
    { level: 5, name: 'Созидание', type: 'create' },
    { level: 5, name: 'Разрушение', type: 'damage' }
];

// ============================================================
// РАСЧЁТ ПАРАМЕТРОВ ЗАКЛИНАНИЯ
// ============================================================
export function calculateSpell(caster, spell) {
    const gnosis = caster.gnosis || 1;
    const arcanumRating = spell.arcanumRating || 1;
    const arcanumKey = spell.arcanumKey || '';

    // Правящее?
    const pathRuling = {
        Acanthus: ['Fate', 'Time'],
        Mastigos: ['Mind', 'Space'],
        Moros: ['Death', 'Matter'],
        Obrimos: ['Forces', 'Prime'],
        Thyrsus: ['Life', 'Spirit']
    };
    const ruling = (pathRuling[caster.path] || []).includes(arcanumKey);

    // Пул
    let pool = gnosis + arcanumRating;
    pool += (spell.yantraBonus || 0);
    pool -= (spell.factorPenalty || 0);

    // Мана
    let manaCost = 0;
    if (!ruling && !spell.isRote && !spell.isPraxis) manaCost = 1;
    if (spell.manaCostOverride) manaCost = spell.manaCostOverride;

    // Парадокс
    let paradoxDice = (spell.reachOver || 0);
    if (spell.sleepers === 1) paradoxDice += 1;
    if (spell.sleepers === 2) paradoxDice += 2;
    if (spell.inSanctum) paradoxDice = Math.max(0, paradoxDice - 2);
    paradoxDice += (spell.extraParadox || 0);

    return {
        pool: Math.max(0, pool),
        manaCost,
        paradoxDice: Math.max(0, paradoxDice),
        ruling
    };
}

// ============================================================
// СОТВОРЕНИЕ
// ============================================================
export async function castSpell(battleId, casterId, spell, targetId = null) {
    const battleRef = doc(db, 'battles', battleId);
    const snap = await getDoc(battleRef);
    if (!snap.exists()) throw new Error('Бой не найден');

    const data = snap.data();
    const caster = data.characters[casterId];
    if (!caster) throw new Error('Маг не найден');

    const calc = calculateSpell(caster, spell);

    // Проверка Маны
    const currentMana = caster.mana || 0;
    if (calc.manaCost > currentMana) {
        throw new Error(`Недостаточно Маны (нужно ${calc.manaCost}, есть ${currentMana})`);
    }

    // Бросок заклинания
    const result = rollDicePool(calc.pool, {
        roteQuality: spell.isRote || false
    });

    // Парадокс
    let paradoxResult = null;
    if (calc.paradoxDice > 0) {
        paradoxResult = rollDicePool(calc.paradoxDice);
    }

    // Лог
    const arcanumName = ARCANUM_LIST.find(a => a.key === spell.arcanumKey)?.name || spell.arcanumKey;
    await addLog(battleId, {
        text: `🔮 ${caster.name} творит «${spell.name || arcanumName + ' ' + spell.practice}» (${arcanumName} ${spell.arcanumRating}, пул ${calc.pool}): ${formatDiceResult(result)}`,
        isMagic: true
    });

    // Парадокс-лог
    if (paradoxResult && paradoxResult.successes > 0) {
        await addLog(battleId, {
            text: `🌀 ПАРАДОКС! Успехов: ${paradoxResult.successes} (${paradoxResult.rolls.join(', ')})`,
            isMagic: true
        });
    }

    // Трата Маны
    if (calc.manaCost > 0) {
        await updateDoc(battleRef, {
            [`characters.${casterId}.mana`]: currentMana - calc.manaCost
        });
    }

    // Применение эффекта
    if (result.successes > 0 && spell.effect === 'damage' && targetId) {
        const dt = spell.damageType || 'lethal';
        await applyDamage(battleId, targetId, result.successes, dt, {
            attackerName: caster.name
        });
    }

    if (result.successes > 0 && spell.effect === 'heal' && targetId) {
        await healDamage(battleId, targetId, result.successes, spell.damageType || 'bashing');
    }

    if (result.successes > 0 && spell.effect === 'condition' && targetId) {
        await addCondition(battleId, targetId, spell.conditionName || 'Под воздействием');
    }

    return {
        ...result,
        pool: calc.pool,
        manaSpent: calc.manaCost,
        paradoxResult,
        paradoxDice: calc.paradoxDice,
        casterName: caster.name
    };
}