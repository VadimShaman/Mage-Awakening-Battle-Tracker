// js/battle/battle-init.js
import { db, doc, onSnapshot, updateDoc, serverTimestamp, arrayUnion } from '../firebase-config.js';
import { NPC_TEMPLATES } from '../data/npc-templates.js';
import { rollDicePool, formatDiceResult } from './battle-dice.js';

// ============================================================
// 1. СОСТОЯНИЕ
// ============================================================
const state = {
    battleId: null,
    battleData: null,
    unsubscribe: null
};

const params = new URLSearchParams(window.location.search);
state.battleId = params.get('id');

if (!state.battleId) {
    document.body.innerHTML = `
        <div style="padding:40px; text-align:center; color:#cc4444;">
            ❌ ID боя не указан в URL<br>
            <a href="index.html" style="color:#6a7aff;">Вернуться на главную</a>
        </div>`;
    throw new Error('ID боя не указан');
}

// ============================================================
// 2. DOM-ЭЛЕМЕНТЫ
// ============================================================
const $ = (id) => document.getElementById(id);
const combatantsList = $('combatants-list');
const logContainer = $('battle-log');
const battleTitle = $('battle-title');
const turnDisplay = $('turn-display');
const currentTurnDisplay = $('current-turn-display');
const totalCombatants = $('total-combatants');
const activeCombatants = $('active-combatants');
const killCounter = $('kill-counter');

const battleRef = doc(db, 'battles', state.battleId);

// ============================================================
// 3. УТИЛИТЫ
// ============================================================
function addLogEntry(text, type = 'system') {
    if (!logContainer) return;
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    const time = new Date().toLocaleTimeString('ru-RU');
    entry.innerHTML = `<span class="time">[${time}]</span> ${text}`;
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
}

function updateCombatants(data) {
    if (!combatantsList) return;
    const chars = data.characters || {};
    const turnOrder = data.turnOrder || [];
    const entries = Object.entries(chars);

    totalCombatants.textContent = entries.length;
    activeCombatants.textContent = entries.filter(([_, c]) => c.isActive !== false).length;
    killCounter.textContent = data.kills || 0;

    // Обновляем селекты атаки
    const atkSel = $('attacker-select');
    const defSel = $('defender-select');
    if (atkSel && defSel) {
        atkSel.innerHTML = '<option value="">Атакующий</option>';
        defSel.innerHTML = '<option value="">Цель</option>';
        entries.forEach(([id, char]) => {
            if (char.isActive !== false && char.status !== 'dead') {
                atkSel.innerHTML += `<option value="${id}">${char.name}</option>`;
                defSel.innerHTML += `<option value="${id}">${char.name}</option>`;
            }
        });
    }

    // Порядок инициативы
    const initDisplay = $('init-order-display');
    if (initDisplay) {
        if (turnOrder.length === 0) {
            initDisplay.innerHTML = '<div class="empty-state">Нет инициативы</div>';
        } else {
            initDisplay.innerHTML = turnOrder.map((item, i) => {
                const isCur = i === (data.currentTurnIndex || 0);
                const char = chars[item.id];
                const isDead = char?.status === 'dead';
                return `<div style="padding:6px 8px; border-bottom:1px solid var(--border-color);
                            ${isCur ? 'background:rgba(106,122,255,0.1); border-left:3px solid var(--accent-glow);' : ''}
                            ${isDead ? 'opacity:0.3; text-decoration:line-through;' : ''}">
                    ${isCur ? '▶️ ' : ''}<strong>${item.name}</strong>
                    <span style="float:right; color:var(--accent-glow);">${item.initiative}</span>
                </div>`;
            }).join('');
        }
    }

    // Карточки участников
    if (entries.length === 0) {
        combatantsList.innerHTML = '<div class="empty-state">Нет участников</div>';
        return;
    }

    let html = '';
    for (const [id, char] of entries) {
        const isDead = char.status === 'dead';
        const isActive = char.isActive !== false;
        const isCurrent = turnOrder[data.currentTurnIndex]?.id === id;
        const hp = char.health ?? 7;
        const maxHp = char.maxHealth ?? 7;

        html += `
            <div class="combatant-card ${isCurrent ? 'active-turn' : ''} ${isDead ? 'dead' : ''}">
                <div class="name">${char.name || 'Безымянный'}</div>
                <div class="meta">
                    ❤️ ${hp}/${maxHp}
                    <span class="stat-badge ${char.status || 'alive'}">${char.status || 'alive'}</span>
                </div>
            </div>`;
    }
    combatantsList.innerHTML = html;
}

// ============================================================
// 4. ПОДПИСКА НА БОЙ
// ============================================================
state.unsubscribe = onSnapshot(battleRef, (snapshot) => {
    if (!snapshot.exists()) {
        document.body.innerHTML = `
            <div style="padding:40px; text-align:center; color:#cc4444;">
                ❌ Бой не найден<br>
                <a href="index.html" style="color:#6a7aff;">На главную</a>
            </div>`;
        return;
    }

    const data = snapshot.data();
    state.battleData = data;

    if (battleTitle) battleTitle.textContent = `⚔️ ${data.name || 'Сражение'}`;
    if (turnDisplay) turnDisplay.textContent = data.turn || 0;
    if (currentTurnDisplay) {
        const curId = data.turnOrder?.[data.currentTurnIndex]?.id;
        currentTurnDisplay.textContent = data.characters?.[curId]?.name || '—';
    }

    updateCombatants(data);

    if (data.log && data.log.length > 0 && logContainer) {
        logContainer.innerHTML = '';
        data.log.forEach(entry => {
            const div = document.createElement('div');
            const type = entry.isSystem ? 'system' : entry.isMagic ? 'magic' : entry.damage ? 'damage' : '';
            div.className = `log-entry ${type}`;
            div.innerHTML = `<span class="time">[${entry.time || '--:--'}]</span> ${entry.text}`;
            logContainer.appendChild(div);
        });
        logContainer.scrollTop = logContainer.scrollHeight;
    }
}, (err) => {
    console.error('Ошибка подписки:', err);
    if (logContainer) logContainer.innerHTML = '<div style="color:#cc4444;">❌ Ошибка Firebase</div>';
});

// ============================================================
// 5. ДОБАВЛЕНИЕ ПЕРСОНАЖЕЙ
// ============================================================
async function addCharacterToBattle(charData) {
    const charId = `char_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    await updateDoc(battleRef, {
        [`characters.${charId}`]: {
            ...charData,
            id: charId,
            isActive: true,
            status: 'alive',
            health: charData.maxHealth || 7,
            maxHealth: charData.maxHealth || 7,
            reactions: 1,
            maxReactions: 1,
            joinedAt: serverTimestamp()
        },
        turnOrder: arrayUnion({ id: charId, initiative: 0, name: charData.name })
    });
    addLogEntry(`👤 ${charData.name} добавлен в бой`, 'system');
}

function addSimple(role, isNPC) {
    const name = prompt(`Имя (${role}):`, role === 'Игрок' ? 'Маг' : role);
    if (!name) return;

    addCharacterToBattle({
        name: name.trim(),
        role: role,
        isNPC: isNPC,
        strength: 2, dexterity: 2, stamina: 2,
        wits: 2, resolve: 2, composure: 2,
        brawl: 1, firearms: 0, athletics: 1,
        maxHealth: 7,
        gnosis: 1, mana: 10, maxMana: 10
    });
}

$('add-player-btn')?.addEventListener('click', () => addSimple('Игрок', false));
$('add-ally-btn')?.addEventListener('click', () => addSimple('Союзник', true));
$('add-enemy-btn')?.addEventListener('click', () => addSimple('Враг', true));

$('add-npc-btn')?.addEventListener('click', async () => {
    const key = prompt(
        'Шаблон: sleeper (Спящий), mageInitiate (Маг-Посвящённый), mageAdept (Маг-Адепт), spirit (Дух), ghost (Призрак), goetia (Гоэтия)',
        'mageInitiate'
    );
    if (!key || !NPC_TEMPLATES[key]) {
        alert('Неверный шаблон');
        return;
    }
    await addCharacterToBattle({ ...NPC_TEMPLATES[key], isNPC: true, role: 'NPC' });
});

// ============================================================
// 6. РУЧНОЙ БРОСОК КУБОВ
// ============================================================
$('dice-custom-btn')?.addEventListener('click', () => {
    const expr = $('dice-custom-input').value.trim();
    const match = expr.match(/^(\d*)d(\d+)([+-]\d+)?$/i);
    if (!match) {
        addLogEntry(`❌ Неверный формат: ${expr}`, 'system');
        return;
    }
    const count = parseInt(match[1]) || 1;
    const sides = parseInt(match[2]);
    const mod = parseInt(match[3] || '0');

    if (sides === 10) {
        // Пул d10 по правилам Хроник
        const result = rollDicePool(count);
        addLogEntry(`🎲 ${expr} → ${formatDiceResult(result)}`, 'system');
    } else {
        let rolls = [], total = 0;
        for (let i = 0; i < count; i++) {
            const r = Math.floor(Math.random() * sides) + 1;
            rolls.push(r); total += r;
        }
        total += mod;
        addLogEntry(`🎲 ${expr} → [${rolls.join(', ')}] = <span class="dice-roll">${total}</span>`, 'system');
    }
});

// Кнопки вставки кубов
document.querySelectorAll('.dice-insert-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = $('dice-custom-input');
        if (!input) return;
        input.value = input.value.trim() === '' ? btn.dataset.dice : `${input.value}+${btn.dataset.dice}`;
    });
});

// ============================================================
// 7. ЗАМЕТКИ GM
// ============================================================
const notesKey = `battle_${state.battleId}_notes`;
const savedNotes = localStorage.getItem(notesKey);
if (savedNotes && $('gm-notes')) $('gm-notes').value = savedNotes;

$('save-notes-btn')?.addEventListener('click', () => {
    localStorage.setItem(notesKey, $('gm-notes').value);
    addLogEntry('📝 Заметки сохранены', 'system');
});

console.log('🔥 Боевая комната загружена, ID:', state.battleId);