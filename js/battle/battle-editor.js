// js/battle/battle-editor.js
// ============================================================
// РЕДАКТОР ПЕРСОНАЖА С АВТОПОДСЧЁТОМ ПРОИЗВОДНЫХ
// ============================================================
import { db, doc, updateDoc, serverTimestamp, arrayUnion } from '../firebase-config.js';

const ARCANUM_LIST = [
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

const PATHS = [
    { key: '', name: '— (не маг) —' },
    { key: 'Acanthus', name: 'Акантус' },
    { key: 'Mastigos', name: 'Мастигос' },
    { key: 'Moros', name: 'Морос' },
    { key: 'Obrimos', name: 'Обримос' },
    { key: 'Thyrsus', name: 'Тирсус' }
];

// ============================================================
// ОТКРЫТИЕ МОДАЛЬНОГО ОКНА
// ============================================================
export function openCharacterEditor(battleId, charId, charData) {
    const modalRoot = document.getElementById('character-editor-modal');
    if (!modalRoot) {
        alert('Контейнер модального окна не найден.');
        return;
    }

    const isNew = !charId;
    const char = charData || getEmptyCharacter();

    modalRoot.innerHTML = buildModalHTML(char, isNew);
    attachHandlers(modalRoot, battleId, charId);
    attachAutoCalc(modalRoot);
    recalcDerived(modalRoot); // первый расчёт
}

export function openCharacterCreator(battleId) {
    openCharacterEditor(battleId, null, null);
}

function getEmptyCharacter() {
    return {
        name: '', role: 'NPC', isNPC: true, path: '',
        gnosis: 1, mana: 10, maxMana: 10, wisdom: 7,
        // Ментальные
        intelligence: 2, wits: 2, resolve: 2,
        // Физические
        strength: 2, dexterity: 2, stamina: 2,
        // Социальные
        presence: 2, manipulation: 2, composure: 2,
        // Навыки
        brawl: 1, firearms: 0, athletics: 1,
        occult: 1, investigation: 1,
        // Производные (будут пересчитаны)
        health: 7, maxHealth: 7,
        willpower: 4, maxWillpower: 4,
        defense: 2, speed: 9, initiative: 5,
        arcana: {}
    };
}

// ============================================================
// HTML МОДАЛЬНОГО ОКНА
// ============================================================
function buildModalHTML(c, isNew) {
    const arcanumInputs = ARCANUM_LIST.map(a => `
        <div class="arcana-item">
            <label>${a.name}</label>
            <input type="number" min="0" max="5" data-arcanum="${a.key}"
                   value="${c.arcana?.[a.key] || 0}">
        </div>
    `).join('');

    return `
    <div class="modal-overlay" id="modal-overlay">
        <div class="modal-window">
            <h2>${isNew ? '➕ Новый персонаж' : `✏️ Редактирование: ${c.name || 'Безымянный'}`}</h2>

            <!-- ОСНОВНОЕ -->
            <div class="modal-section">
                <h4>Основное</h4>
                <div class="modal-grid">
                    <div class="modal-field" style="grid-column: span 2;">
                        <label>Имя</label>
                        <input type="text" id="ed-name" value="${c.name || ''}" placeholder="Например: Алиса Тень">
                    </div>
                    <div class="modal-field">
                        <label>Роль</label>
                        <select id="ed-role">
                            <option value="Игрок" ${c.role === 'Игрок' ? 'selected' : ''}>Игрок</option>
                            <option value="Союзник" ${c.role === 'Союзник' ? 'selected' : ''}>Союзник</option>
                            <option value="Враг" ${c.role === 'Враг' ? 'selected' : ''}>Враг</option>
                            <option value="NPC" ${c.role === 'NPC' || !c.role ? 'selected' : ''}>NPC</option>
                        </select>
                    </div>
                    <div class="modal-field">
                        <label>Путь</label>
                        <select id="ed-path">
                            ${PATHS.map(p => `<option value="${p.key}" ${c.path === p.key ? 'selected' : ''}>${p.name}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </div>

            <!-- МАГИЯ -->
            <div class="modal-section">
                <h4>Магические статы</h4>
                <div class="modal-grid">
                    <div class="modal-field"><label>Гнозис</label>
                        <input type="number" id="ed-gnosis" min="1" max="10" value="${c.gnosis || 1}"></div>
                    <div class="modal-field"><label>Мана (тек.)</label>
                        <input type="number" id="ed-mana" min="0" max="30" value="${c.mana ?? 10}"></div>
                    <div class="modal-field"><label>Мана (макс)</label>
                        <input type="number" id="ed-maxMana" min="0" max="30" value="${c.maxMana ?? 10}"></div>
                    <div class="modal-field"><label>Мудрость</label>
                        <input type="number" id="ed-wisdom" min="0" max="10" value="${c.wisdom ?? 7}"></div>
                </div>
            </div>

            <!-- МЕНТАЛЬНЫЕ -->
            <div class="modal-section attr-section attr-mental">
                <h4>🧠 Ментальные</h4>
                <div class="modal-grid">
                    <div class="modal-field">
                        <label>Интеллект</label>
                        <input type="number" id="ed-intelligence" min="1" max="10" value="${c.intelligence || 2}">
                    </div>
                    <div class="modal-field">
                        <label>Сообразительность</label>
                        <input type="number" id="ed-wits" min="1" max="10" value="${c.wits || 2}">
                    </div>
                    <div class="modal-field">
                        <label>Решимость</label>
                        <input type="number" id="ed-resolve" min="1" max="10" value="${c.resolve || 2}">
                    </div>
                </div>
            </div>

            <!-- ФИЗИЧЕСКИЕ -->
            <div class="modal-section attr-section attr-physical">
                <h4>💪 Физические</h4>
                <div class="modal-grid">
                    <div class="modal-field">
                        <label>Сила</label>
                        <input type="number" id="ed-strength" min="1" max="10" value="${c.strength || 2}">
                    </div>
                    <div class="modal-field">
                        <label>Ловкость</label>
                        <input type="number" id="ed-dexterity" min="1" max="10" value="${c.dexterity || 2}">
                    </div>
                    <div class="modal-field">
                        <label>Выносливость</label>
                        <input type="number" id="ed-stamina" min="1" max="10" value="${c.stamina || 2}">
                    </div>
                </div>
            </div>

            <!-- СОЦИАЛЬНЫЕ -->
            <div class="modal-section attr-section attr-social">
                <h4>🗣️ Социальные</h4>
                <div class="modal-grid">
                    <div class="modal-field">
                        <label>Внушительность</label>
                        <input type="number" id="ed-presence" min="1" max="10" value="${c.presence || 2}">
                    </div>
                    <div class="modal-field">
                        <label>Манипулирование</label>
                        <input type="number" id="ed-manipulation" min="1" max="10" value="${c.manipulation || 2}">
                    </div>
                    <div class="modal-field">
                        <label>Самообладание</label>
                        <input type="number" id="ed-composure" min="1" max="10" value="${c.composure || 2}">
                    </div>
                </div>
            </div>

            <!-- НАВЫКИ -->
            <div class="modal-section">
                <h4>Навыки</h4>
                <div class="modal-grid">
                    <div class="modal-field"><label>Драка</label>
                        <input type="number" id="ed-brawl" min="0" max="10" value="${c.brawl || 0}"></div>
                    <div class="modal-field"><label>Стрельба</label>
                        <input type="number" id="ed-firearms" min="0" max="10" value="${c.firearms || 0}"></div>
                    <div class="modal-field"><label>Атлетика</label>
                        <input type="number" id="ed-athletics" min="0" max="10" value="${c.athletics || 0}"></div>
                    <div class="modal-field"><label>Оккультизм</label>
                        <input type="number" id="ed-occult" min="0" max="10" value="${c.occult || 0}"></div>
                    <div class="modal-field"><label>Расследование</label>
                        <input type="number" id="ed-investigation" min="0" max="10" value="${c.investigation || 0}"></div>
                </div>
            </div>

            <!-- ⭐ ПРОИЗВОДНЫЕ (АВТОРАСЧЁТ) -->
            <div class="modal-section derived-section">
                <h4>⚙️ Производные (авторасчёт)</h4>
                <div class="modal-grid">
                    <div class="modal-field"><label>Макс. Здоровье</label>
                        <input type="number" id="ed-maxHealth" readonly value="${c.maxHealth ?? 7}"
                            style="background:#0a0a12; cursor:not-allowed; color:var(--accent-cyan);"></div>
                    <div class="modal-field"><label>Защита</label>
                        <input type="number" id="ed-defense" readonly value="${c.defense ?? 2}"
                            style="background:#0a0a12; cursor:not-allowed; color:var(--accent-cyan);"></div>
                    <div class="modal-field"><label>Инициатива</label>
                        <input type="number" id="ed-initiative" readonly value="${c.initiative ?? 5}"
                            style="background:#0a0a12; cursor:not-allowed; color:var(--accent-cyan);"></div>
                    <div class="modal-field"><label>Скорость</label>
                        <input type="number" id="ed-speed" readonly value="${c.speed ?? 9}"
                            style="background:#0a0a12; cursor:not-allowed; color:var(--accent-cyan);"></div>
                    <div class="modal-field"><label>Макс. Сила Воли</label>
                        <input type="number" id="ed-maxWillpower" readonly value="${c.maxWillpower ?? 4}"
                            style="background:#0a0a12; cursor:not-allowed; color:var(--accent-cyan);"></div>
                    <div class="modal-field"><label>Макс. Мана</label>
                        <input type="number" id="ed-maxMana-der" readonly value="${c.maxMana ?? 10}"
                            style="background:#0a0a12; cursor:not-allowed; color:var(--accent-cyan);"></div>
                </div>
            </div>

            <!-- ЗДОРОВЬЕ И БОЙ (текущие) -->
            <div class="modal-section">
                <h4>Текущее состояние</h4>
                <div class="modal-grid">
                    <div class="modal-field"><label>Здоровье (тек.)</label>
                        <input type="number" id="ed-health" min="-10" max="30" value="${c.health ?? 7}"></div>
                    <div class="modal-field"><label>Сила Воли (тек.)</label>
                        <input type="number" id="ed-willpower" min="0" max="20" value="${c.willpower ?? 4}"></div>
                </div>
            </div>

            <!-- ТАИНСТВА -->
            <div class="modal-section">
                <h4>Таинства (0–5)</h4>
                <div class="arcana-grid">${arcanumInputs}</div>
            </div>

            <div class="modal-actions">
                <button class="btn-primary" id="modal-save-btn">
                    ${isNew ? '➕ Создать' : '💾 Сохранить'}
                </button>
                <button class="btn-danger" id="modal-cancel-btn">❌ Отмена</button>
            </div>
        </div>
    </div>`;
}

// ============================================================
// ⭐ АВТОПОДСЧЁТ ПРОИЗВОДНЫХ
// ============================================================
function recalcDerived(root) {
    const num = (id, def = 0) => {
        const el = root.querySelector('#' + id);
        if (!el) return def;
        const v = parseInt(el.value, 10);
        return isNaN(v) ? def : v;
    };

    const strength = num('ed-strength', 2);
    const dexterity = num('ed-dexterity', 2);
    const stamina = num('ed-stamina', 2);
    const wits = num('ed-wits', 2);
    const resolve = num('ed-resolve', 2);
    const composure = num('ed-composure', 2);
    const athletics = num('ed-athletics', 0);
    const gnosis = num('ed-gnosis', 1);

    // ⭐ Формулы Хроник Тьмы 2e
    const size = 5;                                         // Размер по умолчанию
    const maxHealth = stamina + size;                       // Здоровье = Вын + Размер
    const defense = Math.min(dexterity, wits) + athletics;  // Защита
    const initiative = dexterity + composure;               // Инициатива
    const speed = 5 + strength + dexterity;                 // Скорость
    const maxWillpower = resolve + composure;               // Макс. Сила Воли

    // ⭐ Макс. Мана по Гнозису (упрощённо: 10 + Гнозис)
    const maxMana = 10 + gnosis;

    // Обновляем поля
    const set = (id, val) => {
        const el = root.querySelector('#' + id);
        if (el) el.value = val;
    };

    set('ed-maxHealth', maxHealth);
    set('ed-defense', defense);
    set('ed-initiative', initiative);
    set('ed-speed', speed);
    set('ed-maxWillpower', maxWillpower);
    set('ed-maxMana-der', maxMana);

    // Заодно обновим maxMana (основной, редактируемый)
    const maxManaEl = root.querySelector('#ed-maxMana');
    if (maxManaEl && !maxManaEl.dataset.manual) {
        maxManaEl.value = maxMana;
    }
}

function attachAutoCalc(root) {
    // Список полей, изменение которых триггерит пересчёт
    const triggerIds = [
        'ed-strength', 'ed-dexterity', 'ed-stamina',
        'ed-wits', 'ed-resolve', 'ed-composure',
        'ed-athletics', 'ed-gnosis'
    ];

    triggerIds.forEach(id => {
        const el = root.querySelector('#' + id);
        if (el) {
            el.addEventListener('input', () => recalcDerived(root));
            el.addEventListener('change', () => recalcDerived(root));
        }
    });

    // Мана: если игрок вручную меняет maxMana — отключаем автообновление
    const maxManaEl = root.querySelector('#ed-maxMana');
    if (maxManaEl) {
        maxManaEl.addEventListener('input', () => {
            maxManaEl.dataset.manual = 'true';
        });
    }
}

// ============================================================
// ОБРАБОТЧИКИ
// ============================================================
function attachHandlers(modalRoot, battleId, charId) {
    const overlay = modalRoot.querySelector('#modal-overlay');

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    modalRoot.querySelector('#modal-cancel-btn').addEventListener('click', closeModal);

    modalRoot.querySelector('#modal-save-btn').addEventListener('click', async () => {
        try {
            const charData = readForm(modalRoot);
            if (!charData.name.trim()) {
                alert('Введите имя персонажа');
                return;
            }

            const battleRef = doc(db, 'battles', battleId);

            if (charId) {
                const updates = {};
                Object.entries(charData).forEach(([k, v]) => {
                    updates[`characters.${charId}.${k}`] = v;
                });
                await updateDoc(battleRef, updates);
            } else {
                const newId = `char_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
                await updateDoc(battleRef, {
                    [`characters.${newId}`]: {
                        ...charData,
                        id: newId,
                        isActive: true,
                        status: 'alive',
                        damageTypes: [],
                        conditions: [],
                        joinedAt: serverTimestamp()
                    },
                    turnOrder: arrayUnion({
                        id: newId,
                        initiative: 0,
                        name: charData.name
                    })
                });
            }

            closeModal();
        } catch (err) {
            console.error('Ошибка сохранения:', err);
            alert('Ошибка: ' + err.message);
        }
    });
}

function closeModal() {
    const modalRoot = document.getElementById('character-editor-modal');
    if (modalRoot) modalRoot.innerHTML = '';
}

// ============================================================
// ЧТЕНИЕ ФОРМЫ
// ============================================================
function readForm(root) {
    const num = (id, def = 0) => {
        const el = root.querySelector('#' + id);
        if (!el) return def;
        const v = parseInt(el.value, 10);
        return isNaN(v) ? def : v;
    };
    const str = (id, def = '') => {
        const el = root.querySelector('#' + id);
        return el ? el.value : def;
    };

    const arcana = {};
    root.querySelectorAll('input[data-arcanum]').forEach(inp => {
        const v = parseInt(inp.value, 10);
        if (v > 0) arcana[inp.dataset.arcanum] = v;
    });

    const role = str('ed-role', 'NPC');
    const path = str('ed-path', '');

    return {
        name: str('ed-name', '').trim(),
        role: role,
        isNPC: role !== 'Игрок',
        path: path,
        gnosis: num('ed-gnosis', 1),
        mana: num('ed-mana', 10),
        maxMana: num('ed-maxMana', 10),
        wisdom: num('ed-wisdom', 7),
        // Ментальные
        intelligence: num('ed-intelligence', 2),
        wits: num('ed-wits', 2),
        resolve: num('ed-resolve', 2),
        // Физические
        strength: num('ed-strength', 2),
        dexterity: num('ed-dexterity', 2),
        stamina: num('ed-stamina', 2),
        // Социальные
        presence: num('ed-presence', 2),
        manipulation: num('ed-manipulation', 2),
        composure: num('ed-composure', 2),
        // Навыки
        brawl: num('ed-brawl', 0),
        firearms: num('ed-firearms', 0),
        athletics: num('ed-athletics', 0),
        occult: num('ed-occult', 0),
        investigation: num('ed-investigation', 0),
        // Производные (пересчитываются)
        health: num('ed-health', 7),
        maxHealth: num('ed-maxHealth', 7),
        defense: num('ed-defense', 2),
        speed: num('ed-speed', 9),
        initiative: num('ed-initiative', 5),
        willpower: num('ed-willpower', 4),
        maxWillpower: num('ed-maxWillpower', 4),
        arcana: arcana
    };
}