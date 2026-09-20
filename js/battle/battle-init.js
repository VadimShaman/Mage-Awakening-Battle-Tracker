// js/battle/battle-init.js
// ============================================================
// БОЕВАЯ КОМНАТА — MAGE: THE AWAKENING 2E (ПОЛНАЯ)
// ============================================================
import { db, doc, onSnapshot, updateDoc, serverTimestamp, arrayUnion, getDoc } from '../firebase-config.js';
import { rollDicePool, formatDiceResult } from './battle-dice.js';
import { openCharacterEditor, openCharacterCreator } from './battle-editor.js';
import { performAttack, resolveDamage, calculateAttackPool } from './battle-attack.js';
import { performDodge, getWoundPenalty, applyDamage, healDamage } from './battle-status.js';
import { castSpell, ARCANUM_LIST, PRACTICES } from './battle-magic.js';

// ============================================================
// 1. СОСТОЯНИЕ
// ============================================================
const state = {
    battleId: null,
    battleData: null,
    unsubscribe: null,
    pendingAttack: null
};

const params = new URLSearchParams(window.location.search);
state.battleId = params.get('id');

if (!state.battleId) {
    document.body.innerHTML = `
        <div style="padding:40px; text-align:center; color:#cc4444;">
            ❌ ID боя не указан в URL<br>
            <a href="index.html" style="color:#6a7aff;">На главную</a>
        </div>`;
    throw new Error('ID боя не указан');
}

const $ = (id) => document.getElementById(id);
const combatantsList = $('combatants-list');
const logContainer = $('battle-log');
const battleTitle = $('battle-title');
const battleRef = doc(db, 'battles', state.battleId);

// ============================================================
// 2. УТИЛИТЫ
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

function getDefense(char) {
    return Math.min(char.dexterity || 2, char.wits || 2) + (char.athletics || 0);
}

function renderHealthBar(char) {
    const maxHp = char.maxHealth || 7;
    const health = char.health ?? maxHp;
    const damageTypes = char.damageTypes || [];

    let boxes = '';
    for (let i = 0; i < maxHp; i++) {
        let cls = 'health-box';
        let mark = '';
        if (i >= health) {
            const dmgType = damageTypes[i] || 'bashing';
            cls += ` ${dmgType}`;
            mark = dmgType === 'bashing' ? '/' : dmgType === 'lethal' ? 'X' : '*';
        }
        boxes += `<div class="${cls}" data-box-index="${i}" title="Клетка ${i + 1}">${mark}</div>`;
    }
    return `<div class="health-bar">${boxes}</div>`;
}

function renderConditions(char) {
    const conditions = char.conditions || [];
    if (conditions.length === 0) return '';
    return `<div class="conditions-list">
        ${conditions.map(c => `<span class="condition-badge" data-cond="${c.name}">${c.name}</span>`).join('')}
    </div>`;
}

function updateCombatants(data) {
    if (!combatantsList) return;
    const chars = data.characters || {};
    const turnOrder = data.turnOrder || [];
    const entries = Object.entries(chars);

    $('total-combatants').textContent = entries.length;
    $('active-combatants').textContent = entries.filter(([_, c]) => c.isActive !== false).length;
    $('kill-counter').textContent = data.kills || 0;

    // Селекты
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

    // Карточки
    if (entries.length === 0) {
        combatantsList.innerHTML = '<div class="empty-state">Нет участников</div>';
        return;
    }

    let html = '';
    for (const [id, char] of entries) {
        const isDead = char.status === 'dead';
        const isCurrent = turnOrder[data.currentTurnIndex]?.id === id;
        const hp = char.health ?? 7;
        const maxHp = char.maxHealth ?? 7;
        const defense = getDefense(char);
        const woundPenalty = getWoundPenalty(char);

        html += `
            <div class="combatant-card ${isCurrent ? 'active-turn' : ''} ${isDead ? 'dead' : ''}">
                <button class="delete-char-btn" data-delete-id="${id}" title="Удалить">🗑️</button>
                <button class="edit-char-btn" data-edit-id="${id}" title="Редактировать">✏️</button>
                <div class="name">${char.name || 'Безымянный'}</div>
                <div class="meta">
                    ❤️ ${hp}/${maxHp} · 🛡️ ${defense}
                    ${woundPenalty ? ` · <span style="color:var(--danger);">⚠️ ${woundPenalty}</span>` : ''}
                    ${char.gnosis ? ` · ✦${char.gnosis}` : ''}
                    ${char.mana !== undefined ? ` · 💧${char.mana}` : ''}
                    <span class="stat-badge ${char.status || 'alive'}">${char.status || 'alive'}</span>
                </div>
                ${renderHealthBar(char)}
                ${renderConditions(char)}
            </div>`;
    }
    combatantsList.innerHTML = html;

    // Обработчики: редактирование
    combatantsList.querySelectorAll('.edit-char-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const charId = btn.dataset.editId;
            const char = data.characters[charId];
            if (char) openCharacterEditor(state.battleId, charId, char);
        });
    });

    // Обработчики: удаление
    combatantsList.querySelectorAll('.delete-char-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const charId = btn.dataset.deleteId;
            const char = data.characters[charId];
            if (!char) return;

            if (!confirm(`🗑️ Удалить персонажа "${char.name}"?\nЭто действие необратимо.`)) return;

            try {
                await deleteCharacter(state.battleId, charId, char.name);
            } catch (err) {
                console.error(err);
                alert('Ошибка удаления: ' + err.message);
            }
        });
    });

    // Обработчики: клик по клетке здоровья (цикл: пусто → / → X → * → пусто)
    combatantsList.querySelectorAll('.health-box').forEach(box => {
        box.addEventListener('click', async (e) => {
            e.stopPropagation();
            const card = box.closest('.combatant-card');
            const editBtn = card.querySelector('.edit-char-btn');
            const charId = editBtn?.dataset.editId;
            const char = data.characters[charId];
            if (!char) return;

            const idx = parseInt(box.dataset.boxIndex, 10);
            await cycleHealthBox(charId, char, idx);
        });
    });

    // Обработчики: клик по состоянию (удалить)
    combatantsList.querySelectorAll('.condition-badge').forEach(badge => {
        badge.addEventListener('click', async (e) => {
            e.stopPropagation();
            const card = badge.closest('.combatant-card');
            const editBtn = card.querySelector('.edit-char-btn');
            const charId = editBtn?.dataset.editId;
            const condName = badge.dataset.cond;
            await removeConditionFromChar(charId, condName);
        });
    });
}

// ============================================================
// 3. КЛИК ПО КЛЕТКЕ ЗДОРОВЬЯ (цикл)
// ============================================================
async function cycleHealthBox(charId, char, idx) {
    const maxHp = char.maxHealth || 7;
    let health = char.health ?? maxHp;
    let damageTypes = (char.damageTypes || new Array(maxHp).fill(null)).slice();

    // Синхронизируем длину массива
    while (damageTypes.length < maxHp) damageTypes.push(null);

    const current = damageTypes[idx];
    // Цикл: null → bashing → lethal → aggravated → null
    let next = null;
    let newHealth = health;

    if (current === null) {
        next = 'bashing';
        newHealth = Math.min(health, idx);
        for (let i = idx; i < maxHp; i++) {
            if (!damageTypes[i]) damageTypes[i] = 'bashing';
        }
    } else if (current === 'bashing') {
        next = 'lethal';
        damageTypes[idx] = 'lethal';
    } else if (current === 'lethal') {
        next = 'aggravated';
        damageTypes[idx] = 'aggravated';
    } else if (current === 'aggravated') {
        damageTypes[idx] = null;
        let lastDamage = -1;
        for (let i = maxHp - 1; i >= 0; i--) {
            if (damageTypes[i]) { lastDamage = i; break; }
        }
        newHealth = lastDamage + 1;
    }

    // Пересчёт health: количество целых клеток = индекс первой повреждённой
    let firstDamage = maxHp;
    for (let i = 0; i < maxHp; i++) {
        if (damageTypes[i]) { firstDamage = i; break; }
    }
    newHealth = firstDamage;

    damageTypes = damageTypes.slice(0, maxHp);

    let status = 'alive';
    let isActive = true;
    if (newHealth <= -maxHp) {
        status = 'dead';
        isActive = false;
    } else if (newHealth <= 0) {
        status = 'critical';
    }

    await updateDoc(battleRef, {
        [`characters.${charId}.health`]: newHealth,
        [`characters.${charId}.damageTypes`]: damageTypes,
        [`characters.${charId}.status`]: status,
        [`characters.${charId}.isActive`]: isActive
    });
}

// ============================================================
// 4. УДАЛЕНИЕ СОСТОЯНИЯ
// ============================================================
async function removeConditionFromChar(charId, condName) {
    const snap = await getDoc(battleRef);
    if (!snap.exists()) return;
    const char = snap.data().characters?.[charId];
    if (!char) return;

    const conditions = (char.conditions || []).filter(c => c.name !== condName);
    await updateDoc(battleRef, {
        [`characters.${charId}.conditions`]: conditions
    });
    addLogEntry(`✅ Состояние "${condName}" снято с ${char.name}`, 'system');
}

// ============================================================
// 5. УДАЛЕНИЕ ПЕРСОНАЖА
// ============================================================
async function deleteCharacter(battleId, charId, charName) {
    const battleRefLocal = doc(db, 'battles', battleId);
    const snap = await getDoc(battleRefLocal);
    if (!snap.exists()) return;

    const data = snap.data();
    const char = data.characters?.[charId];
    if (!char) return;

    // 1. Убираем из turnOrder
    const oldOrder = data.turnOrder || [];
    const turnOrder = oldOrder.filter(t => t.id !== charId);

    // 2. Корректируем currentTurnIndex
    let currentTurnIndex = data.currentTurnIndex || 0;
    const removedIndex = oldOrder.findIndex(t => t.id === charId);

    if (removedIndex !== -1) {
        if (removedIndex < currentTurnIndex) {
            currentTurnIndex = Math.max(0, currentTurnIndex - 1);
        } else if (removedIndex === currentTurnIndex) {
            if (currentTurnIndex >= turnOrder.length) {
                currentTurnIndex = 0;
            }
        }
    }

    if (turnOrder.length > 0) {
        currentTurnIndex = Math.min(currentTurnIndex, turnOrder.length - 1);
    } else {
        currentTurnIndex = 0;
    }

    // 3. Считаем убийства, если удалили живого
    const wasAlive = char.status !== 'dead' && char.isActive !== false;
    const newKills = wasAlive ? (data.kills || 0) + 1 : (data.kills || 0);

    // 4. Обновляем Firestore
    const updates = {
        [`characters.${charId}`]: null,
        turnOrder: turnOrder,
        currentTurnIndex: currentTurnIndex,
        kills: newKills
    };

    await updateDoc(battleRefLocal, updates);

    // 5. Лог
    addLogEntry(`🗑️ ${charName} удалён из боя`, 'system');
}

// ============================================================
// 6. ПОДПИСКА НА БОЙ
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
    $('turn-display').textContent = data.turn || 0;
    const curId = data.turnOrder?.[data.currentTurnIndex]?.id;
    $('current-turn-display').textContent = data.characters?.[curId]?.name || '—';

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
});

// ============================================================
// 7. ВЫБОР ТИПА УРОНА
// ============================================================
function updateDamageTypeSelection() {
    document.querySelectorAll('.damage-option').forEach(label => {
        const input = label.querySelector('input[type="radio"]');
        label.classList.toggle('selected', input.checked);
    });
}
document.querySelectorAll('input[name="damage-type"]').forEach(input => {
    input.addEventListener('change', updateDamageTypeSelection);
});
updateDamageTypeSelection();

// ============================================================
// 8. ДОБАВЛЕНИЕ ПЕРСОНАЖЕЙ
// ============================================================
$('add-player-btn')?.addEventListener('click', () => {
    openCharacterEditor(state.battleId, null, {
        name: 'Маг', role: 'Игрок', isNPC: false, path: '',
        gnosis: 1, mana: 10, maxMana: 10,
        strength: 2, dexterity: 2, stamina: 2,
        wits: 2, resolve: 2, composure: 2,
        presence: 2, manipulation: 2,
        brawl: 1, firearms: 0, athletics: 1,
        health: 7, maxHealth: 7,
        willpower: 4, maxWillpower: 4,
        arcana: {}
    });
});
$('add-ally-btn')?.addEventListener('click', () => {
    openCharacterEditor(state.battleId, null, {
        name: 'Союзник', role: 'Союзник', isNPC: true,
        strength: 2, dexterity: 2, stamina: 2,
        wits: 2, resolve: 2, composure: 2,
        brawl: 1, athletics: 1,
        health: 7, maxHealth: 7
    });
});
$('add-enemy-btn')?.addEventListener('click', () => {
    openCharacterEditor(state.battleId, null, {
        name: 'Враг', role: 'Враг', isNPC: true,
        strength: 2, dexterity: 2, stamina: 2,
        wits: 2, resolve: 2, composure: 2,
        brawl: 1, athletics: 1,
        health: 7, maxHealth: 7
    });
});
$('add-npc-btn')?.addEventListener('click', () => {
    openCharacterEditor(state.battleId, null, {
        name: 'NPC', role: 'NPC', isNPC: true,
        strength: 2, dexterity: 2, stamina: 2,
        wits: 2, resolve: 2, composure: 2,
        brawl: 1, athletics: 1,
        health: 7, maxHealth: 7
    });
});
$('create-custom-char-btn')?.addEventListener('click', () => {
    openCharacterCreator(state.battleId);
});

// ============================================================
// 9. ИНИЦИАТИВА — АВТО
// ============================================================
$('roll-init-btn')?.addEventListener('click', rollInitiativeForAll);

async function rollInitiativeForAll() {
    const data = state.battleData;
    if (!data || !data.characters) return;

    const turnOrder = [];
    for (const [id, char] of Object.entries(data.characters)) {
        if (char.isActive === false || char.status === 'dead') continue;
        const dex = char.dexterity || 2;
        const comp = char.composure || 2;
        const roll = Math.floor(Math.random() * 10) + 1;
        const total = roll + dex + comp;
        turnOrder.push({ id, name: char.name || '?', initiative: total, roll, dex, comp });
    }

    turnOrder.sort((a, b) => {
        if (b.initiative !== a.initiative) return b.initiative - a.initiative;
        return b.dex - a.dex;
    });

    const cleanOrder = turnOrder.map(t => ({ id: t.id, name: t.name, initiative: t.initiative }));

    await updateDoc(battleRef, {
        turnOrder: cleanOrder,
        currentTurnIndex: 0,
        turn: 1
    });

    addLogEntry(`🎲 Инициатива: ${cleanOrder.map((t, i) => `${i + 1}. ${t.name} (${t.initiative})`).join(' → ')}`, 'system');
}

// ============================================================
// 10. ИНИЦИАТИВА — РУЧНОЙ ВВОД
// ============================================================
$('manual-init-btn')?.addEventListener('click', () => {
    const data = state.battleData;
    if (!data || !data.characters) return;

    const chars = Object.entries(data.characters)
        .filter(([_, c]) => c.isActive !== false && c.status !== 'dead');

    if (chars.length === 0) {
        alert('Нет активных персонажей');
        return;
    }

    const modalRoot = $('manual-init-modal');
    modalRoot.innerHTML = `
        <div class="modal-overlay" id="manual-init-overlay">
            <div class="modal-window">
                <h2>✏️ Ручной ввод инициативы</h2>
                <div class="modal-grid">
                    ${chars.map(([id, c]) => `
                        <div class="modal-field">
                            <label>${c.name}</label>
                            <input type="number" data-init-id="${id}" value="0" min="0" max="50">
                        </div>
                    `).join('')}
                </div>
                <div class="modal-actions">
                    <button class="btn-primary" id="manual-init-save">💾 Применить</button>
                    <button class="btn-danger" id="manual-init-cancel">❌ Отмена</button>
                </div>
            </div>
        </div>`;

    const overlay = modalRoot.querySelector('#manual-init-overlay');
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) modalRoot.innerHTML = '';
    });
    modalRoot.querySelector('#manual-init-cancel').addEventListener('click', () => modalRoot.innerHTML = '');

    modalRoot.querySelector('#manual-init-save').addEventListener('click', async () => {
        const inputs = modalRoot.querySelectorAll('input[data-init-id]');
        const order = [];
        inputs.forEach(inp => {
            const id = inp.dataset.initId;
            const char = data.characters[id];
            const init = parseInt(inp.value, 10) || 0;
            order.push({ id, name: char.name, initiative: init });
        });

        order.sort((a, b) => b.initiative - a.initiative);

        await updateDoc(battleRef, {
            turnOrder: order,
            currentTurnIndex: 0,
            turn: 1
        });

        addLogEntry(`✏️ Инициатива (вручную): ${order.map((t, i) => `${i + 1}. ${t.name} (${t.initiative})`).join(' → ')}`, 'system');
        modalRoot.innerHTML = '';
    });
});

// ============================================================
// 11. ПЕРЕХОД ХОДА
// ============================================================
$('next-turn-btn')?.addEventListener('click', async () => {
    const data = state.battleData;
    if (!data) return;
    const turnOrder = data.turnOrder || [];
    if (turnOrder.length === 0) { alert('Сначала бросьте инициативу'); return; }

    let nextIndex = (data.currentTurnIndex || 0) + 1;
    let attempts = 0;
    let newRound = data.turn || 0;

    while (attempts < turnOrder.length * 2) {
        if (nextIndex >= turnOrder.length) {
            nextIndex = 0;
            newRound++;
        }
        const char = data.characters?.[turnOrder[nextIndex]?.id];
        if (char && char.isActive !== false && char.status !== 'dead') break;
        nextIndex++;
        attempts++;
    }

    await updateDoc(battleRef, {
        currentTurnIndex: nextIndex,
        turn: newRound
    });
    addLogEntry(`⏩ Ход переходит к ${turnOrder[nextIndex].name}`, 'system');
});

$('prev-turn-btn')?.addEventListener('click', async () => {
    const data = state.battleData;
    if (!data) return;
    const turnOrder = data.turnOrder || [];
    if (turnOrder.length === 0) return;

    let prevIndex = (data.currentTurnIndex || 0) - 1;
    let attempts = 0;
    let newRound = data.turn || 0;

    while (attempts < turnOrder.length * 2) {
        if (prevIndex < 0) {
            prevIndex = turnOrder.length - 1;
            newRound = Math.max(0, newRound - 1);
        }
        const char = data.characters?.[turnOrder[prevIndex]?.id];
        if (char && char.isActive !== false && char.status !== 'dead') break;
        prevIndex--;
        attempts++;
    }

    await updateDoc(battleRef, {
        currentTurnIndex: prevIndex,
        turn: newRound
    });
    addLogEntry(`⬅️ Возврат к ходу ${turnOrder[prevIndex].name}`, 'system');
});

$('next-round-btn')?.addEventListener('click', async () => {
    const data = state.battleData;
    if (!data) return;
    await updateDoc(battleRef, { turn: (data.turn || 0) + 1 });
    addLogEntry(`🔁 Раунд ${(data.turn || 0) + 1}`, 'system');
});
$('prev-round-btn')?.addEventListener('click', async () => {
    const data = state.battleData;
    if (!data) return;
    const newRound = Math.max(0, (data.turn || 0) - 1);
    await updateDoc(battleRef, { turn: newRound });
    addLogEntry(`⬅️ Раунд ${newRound}`, 'system');
});

// ============================================================
// 12. АТАКА (с уклонением)
// ============================================================
$('attack-btn')?.addEventListener('click', async () => {
    const attackerId = $('attacker-select')?.value;
    const defenderId = $('defender-select')?.value;
    const weaponName = $('weapon-name-input')?.value || 'Кулак';
    const weaponBonus = parseInt($('weapon-bonus-input')?.value) || 0;
    const damageType = document.querySelector('input[name="damage-type"]:checked')?.value || 'bashing';
    const willpower = $('willpower-check')?.checked || false;

    if (!attackerId || !defenderId) { alert('Выберите атакующего и цель'); return; }
    if (attackerId === defenderId) { alert('Нельзя атаковать себя'); return; }

    try {
        const result = await performAttack(state.battleId, attackerId, defenderId, {
            weaponName, weaponBonus, damageType, willpower
        });

        if (result.damage === 0) {
            showAttackResult(result, damageType);
            return;
        }

        state.pendingAttack = result;
        showDodgePrompt(result, damageType);
    } catch (err) {
        console.error(err);
        alert('Ошибка атаки: ' + err.message);
    }
});

function showAttackResult(result, damageType) {
    const resultDiv = $('attack-result');
    const dtLabel = { bashing: '💥 Тупой', lethal: '🩸 Летальный', aggravated: '☠️ Особый' }[damageType];

    resultDiv.style.display = 'block';
    resultDiv.innerHTML = `
        <div style="background:var(--bg-dark); padding:12px; border-radius:8px; border-left:3px solid var(--accent-glow);">
            <div><strong>${result.attackerName}</strong> → <strong>${result.defenderName}</strong></div>
            <div>⚔️ ${result.weaponName || 'Кулак'} · ${dtLabel}</div>
            <div>🎯 Пул: ${result.pool} кубов (Защита ${result.defense} вычтена)</div>
            <div>🎲 Бросок: ${formatDiceResult(result)}</div>
            ${result.damage > 0
                ? `<div style="color:var(--danger); font-weight:bold;">💥 Урон: ${result.damage}</div>`
                : '<div style="color:var(--text-dim);">Промах</div>'}
            ${result.isDramaticFailure ? '<div style="color:var(--danger);">💀 Драматический провал!</div>' : ''}
        </div>`;
}

// ============================================================
// 13. УКЛОНЕНИЕ (модальное окно)
// ============================================================
function showDodgePrompt(attackResult, damageType) {
    const defender = state.battleData.characters[attackResult.defenderId];
    const defense = getDefense(defender);
    const modalRoot = $('dodge-modal');

    modalRoot.innerHTML = `
        <div class="modal-overlay" id="dodge-overlay">
            <div class="modal-window" style="max-width:500px;">
                <h2>🏃 ${defender.name} под атакой!</h2>
                <p style="color:var(--text-dim); margin-bottom:12px;">
                    <strong>${attackResult.attackerName}</strong> наносит ${attackResult.damage} успехов.
                </p>
                <p style="color:var(--text-light); margin-bottom:12px;">
                    <strong>Уклонение</strong> — бросок пула <strong>${defense * 2}</strong> кубов.<br>
                    Успехи вычитаются из успехов атакующего.
                </p>
                <div class="modal-actions">
                    <button class="btn-primary" id="dodge-btn">🏃 Уклониться</button>
                    <button class="btn-danger" id="no-dodge-btn">💥 Пропустить</button>
                </div>
            </div>
        </div>`;

    const overlay = modalRoot.querySelector('#dodge-overlay');

    modalRoot.querySelector('#dodge-btn').addEventListener('click', async () => {
        try {
            const dodge = await performDodge(
                state.battleId,
                attackResult.defenderId,
                attackResult.damage,
                attackResult.attackerName
            );

            if (dodge.remainingSuccesses > 0) {
                await resolveDamage(
                    state.battleId,
                    attackResult.attackerId,
                    attackResult.defenderId,
                    dodge.remainingSuccesses,
                    damageType,
                    { attackerName: attackResult.attackerName }
                );
            } else {
                addLogEntry(`✅ ${defender.name} полностью уклонился!`, 'system');
            }

            showAttackResult({ ...attackResult, damage: dodge.remainingSuccesses }, damageType);
        } catch (err) {
            console.error(err);
        }
        modalRoot.innerHTML = '';
        state.pendingAttack = null;
    });

    modalRoot.querySelector('#no-dodge-btn').addEventListener('click', async () => {
        await resolveDamage(
            state.battleId,
            attackResult.attackerId,
            attackResult.defenderId,
            attackResult.damage,
            damageType,
            { attackerName: attackResult.attackerName }
        );
        showAttackResult(attackResult, damageType);
        modalRoot.innerHTML = '';
        state.pendingAttack = null;
    });
}

// ============================================================
// 14. МАГИЯ (модальное окно)
// ============================================================
$('cast-spell-btn')?.addEventListener('click', () => {
    const data = state.battleData;
    if (!data) return;

    const mages = Object.entries(data.characters)
        .filter(([_, c]) => c.isActive !== false && c.status !== 'dead' && (c.gnosis || 0) > 0);

    if (mages.length === 0) {
        alert('Нет активных магов');
        return;
    }

    const allChars = Object.entries(data.characters)
        .filter(([_, c]) => c.isActive !== false && c.status !== 'dead');

    const modalRoot = $('spell-modal');
    modalRoot.innerHTML = `
        <div class="modal-overlay" id="spell-overlay">
            <div class="modal-window">
                <h2>✨ Сотворение заклинания</h2>

                <div class="modal-section">
                    <h4>Маг</h4>
                    <div class="modal-field">
                        <select id="sp-caster">
                            ${mages.map(([id, c]) => `<option value="${id}">${c.name} (Гнозис ${c.gnosis}, Мана ${c.mana})</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div class="modal-section">
                    <h4>Заклинание</h4>
                    <div class="modal-grid">
                        <div class="modal-field">
                            <label>Название</label>
                            <input type="text" id="sp-name" placeholder="Например: Разъятие плоти" value="">
                        </div>
                        <div class="modal-field">
                            <label>Таинство</label>
                            <select id="sp-arcanum">
                                ${ARCANUM_LIST.map(a => `<option value="${a.key}">${a.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="modal-field">
                            <label>Ранг</label>
                            <input type="number" id="sp-rating" min="1" max="5" value="1">
                        </div>
                        <div class="modal-field">
                            <label>Практика</label>
                            <select id="sp-practice">
                                ${PRACTICES.map(p => `<option value="${p.level}|${p.name}|${p.type}">${p.name} (${p.level})</option>`).join('')}
                            </select>
                        </div>
                    </div>
                </div>

                <div class="modal-section">
                    <h4>Эффект</h4>
                    <div class="modal-grid">
                        <div class="modal-field">
                            <label>Тип</label>
                            <select id="sp-effect">
                                <option value="none">— без эффекта —</option>
                                <option value="damage">Нанести урон</option>
                                <option value="heal">Исцелить</option>
                                <option value="condition">Наложить состояние</option>
                            </select>
                        </div>
                        <div class="modal-field">
                            <label>Цель</label>
                            <select id="sp-target">
                                <option value="">— нет цели —</option>
                                ${allChars.map(([id, c]) => `<option value="${id}">${c.name}</option>`).join('')}
                            </select>
                        </div>
                        <div class="modal-field">
                            <label>Тип урона/лечения</label>
                            <select id="sp-dmgtype">
                                <option value="bashing">Тупой</option>
                                <option value="lethal" selected>Летальный</option>
                                <option value="aggravated">Особый</option>
                            </select>
                        </div>
                        <div class="modal-field">
                            <label>Состояние (если применимо)</label>
                            <input type="text" id="sp-condname" placeholder="Например: Подчинён">
                        </div>
                    </div>
                </div>

                <div class="modal-section">
                    <h4>Модификаторы</h4>
                    <div class="modal-grid">
                        <div class="modal-field">
                            <label>Бонус от Янтр</label>
                            <input type="number" id="sp-yantra" value="0" min="0" max="10">
                        </div>
                        <div class="modal-field">
                            <label>Штраф за факторы</label>
                            <input type="number" id="sp-factor" value="0" min="0" max="20">
                        </div>
                        <div class="modal-field">
                            <label>Охватов сверх</label>
                            <input type="number" id="sp-reach" value="0" min="0" max="10">
                        </div>
                        <div class="modal-field">
                            <label>Спящих свидетелей</label>
                            <select id="sp-sleepers">
                                <option value="0">Нет</option>
                                <option value="1">1–3</option>
                                <option value="2">4+</option>
                            </select>
                        </div>
                    </div>
                    <div style="margin-top:10px; display:flex; gap:10px; flex-wrap:wrap;">
                        <label style="color:var(--text-dim); font-size:0.9em;">
                            <input type="checkbox" id="sp-sanctum"> В Святилище (−2 Парадокс)
                        </label>
                        <label style="color:var(--text-dim); font-size:0.9em;">
                            <input type="checkbox" id="sp-rote"> Формула
                        </label>
                        <label style="color:var(--text-dim); font-size:0.9em;">
                            <input type="checkbox" id="sp-praxis"> Праксис
                        </label>
                    </div>
                </div>

                <div class="modal-actions">
                    <button class="btn-primary" id="sp-cast">✨ Сотворить</button>
                    <button class="btn-danger" id="sp-cancel">❌ Отмена</button>
                </div>
            </div>
        </div>`;

    const overlay = modalRoot.querySelector('#spell-overlay');
    overlay.addEventListener('click', (e) => { if (e.target === overlay) modalRoot.innerHTML = ''; });
    modalRoot.querySelector('#sp-cancel').addEventListener('click', () => modalRoot.innerHTML = '');

    modalRoot.querySelector('#sp-cast').addEventListener('click', async () => {
        const casterId = modalRoot.querySelector('#sp-caster').value;
        const name = modalRoot.querySelector('#sp-name').value.trim() || 'Заклинание';
        const arcanumKey = modalRoot.querySelector('#sp-arcanum').value;
        const arcanumRating = parseInt(modalRoot.querySelector('#sp-rating').value) || 1;
        const practiceRaw = modalRoot.querySelector('#sp-practice').value.split('|');
        const practice = practiceRaw[1] || 'Познание';
        const practiceType = practiceRaw[2] || 'info';
        const effectType = modalRoot.querySelector('#sp-effect').value;
        const targetId = modalRoot.querySelector('#sp-target').value || null;
        const damageType = modalRoot.querySelector('#sp-dmgtype').value;
        const conditionName = modalRoot.querySelector('#sp-condname').value.trim();
        const yantraBonus = parseInt(modalRoot.querySelector('#sp-yantra').value) || 0;
        const factorPenalty = parseInt(modalRoot.querySelector('#sp-factor').value) || 0;
        const reachOver = parseInt(modalRoot.querySelector('#sp-reach').value) || 0;
        const sleepers = parseInt(modalRoot.querySelector('#sp-sleepers').value) || 0;
        const inSanctum = modalRoot.querySelector('#sp-sanctum').checked;
        const isRote = modalRoot.querySelector('#sp-rote').checked;
        const isPraxis = modalRoot.querySelector('#sp-praxis').checked;

        const spell = {
            name,
            arcanumKey,
            arcanumRating,
            practice,
            practiceType,
            effect: effectType === 'none' ? null : effectType,
            damageType,
            conditionName,
            yantraBonus,
            factorPenalty,
            reachOver,
            sleepers,
            inSanctum,
            isRote,
            isPraxis
        };

        try {
            const result = await castSpell(state.battleId, casterId, spell, targetId);
            addLogEntry(
                `🔮 ${result.casterName}: ${formatDiceResult(result)}` +
                (result.manaSpent ? ` · −${result.manaSpent} Маны` : '') +
                (result.paradoxDice ? ` · Парадокс ${result.paradoxDice}` : ''),
                'magic'
            );
        } catch (err) {
            alert('Ошибка магии: ' + err.message);
        }

        modalRoot.innerHTML = '';
    });
});

// ============================================================
// 15. КУБЫ
// ============================================================
$('dice-custom-btn')?.addEventListener('click', () => {
    const expr = $('dice-custom-input').value.trim();
    const match = expr.match(/^(\d*)d(\d+)([+-]\d+)?$/i);
    if (!match) { addLogEntry(`❌ Формат: ${expr}`, 'system'); return; }
    const count = parseInt(match[1]) || 1;
    const sides = parseInt(match[2]);
    if (sides === 10) {
        const result = rollDicePool(count);
        addLogEntry(`🎲 ${expr} → ${formatDiceResult(result)}`, 'system');
    } else {
        let rolls = [], total = 0;
        for (let i = 0; i < count; i++) { const r = Math.floor(Math.random() * sides) + 1; rolls.push(r); total += r; }
        addLogEntry(`🎲 ${expr} → [${rolls.join(', ')}] = ${total}`, 'system');
    }
});
document.querySelectorAll('.dice-insert-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = $('dice-custom-input');
        if (!input) return;
        input.value = input.value.trim() === '' ? btn.dataset.dice : `${input.value}+${btn.dataset.dice}`;
    });
});

// ============================================================
// 16. ЗАМЕТКИ
// ============================================================
const notesKey = `battle_${state.battleId}_notes`;
const savedNotes = localStorage.getItem(notesKey);
if (savedNotes && $('gm-notes')) $('gm-notes').value = savedNotes;
$('save-notes-btn')?.addEventListener('click', () => {
    localStorage.setItem(notesKey, $('gm-notes').value);
    addLogEntry('📝 Заметки сохранены', 'system');
});

// ============================================================
// 17. КОНЕЦ БОЯ
// ============================================================
$('end-battle-btn')?.addEventListener('click', async () => {
    if (!confirm('⛔ Завершить бой?')) return;
    await updateDoc(battleRef, { isActive: false, isFinished: true, finishedAt: serverTimestamp() });
    addLogEntry('⛔ БОЙ ЗАВЕРШЁН', 'system');
});

console.log('🔥 Боевая комната загружена, ID:', state.battleId);