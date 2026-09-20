// js/data/npc-templates.js
// ============================================================
// БИБЛИОТЕКА ШАБЛОНОВ NPC ДЛЯ MAGE: THE AWAKENING 2E
// ============================================================
// Каждый шаблон — набор базовых статов. Можно править в редакторе.
// Поле `type` используется для группировки и иконок.
// Поле `category` — для UI-выбора.
// ============================================================

export const NPC_CATEGORIES = [
    { key: 'sleeper', name: 'Смертные', icon: '👤', types: ['sleeper'] },
    { key: 'mage', name: 'Маги', icon: '🧙', types: ['mage'] },
    { key: 'vampire', name: 'Вампиры', icon: '🦇', types: ['vampire'] },
    { key: 'werewolf', name: 'Оборотни', icon: '🐺', types: ['werewolf'] },
    { key: 'spirit', name: 'Духи и Призраки', icon: '👻', types: ['spirit', 'ghost', 'goetia'] },
    { key: 'changeling', name: 'Похищенные', icon: '🧚', types: ['changeling'] },
    { key: 'other', name: 'Прочие угрозы', icon: '⚠️', types: ['other'] }
];

export const NPC_TEMPLATES = {

    // ============================================================
    // 👤 СМЕРТНЫЕ
    // ============================================================
    sleeper: {
        name: 'Спящий',
        type: 'sleeper',
        icon: '👤',
        description: 'Обычный человек. Не верит в магию, легко поддаётся Вуали.',
        strength: 2, dexterity: 2, stamina: 2,
        intelligence: 2, wits: 2, resolve: 2,
        presence: 2, manipulation: 2, composure: 2,
        brawl: 1, firearms: 0, athletics: 1,
        occult: 0, investigation: 0,
        health: 7, maxHealth: 7,
        willpower: 4, maxWillpower: 4,
        defense: 2,
        initiative: 4,
        speed: 9
    },

    police: {
        name: 'Полицейский',
        type: 'sleeper',
        icon: '🚓',
        description: 'Обучен обращаться с оружием. Типичная угроза для неосторожного мага.',
        strength: 3, dexterity: 2, stamina: 3,
        intelligence: 2, wits: 3, resolve: 2,
        presence: 2, manipulation: 2, composure: 3,
        brawl: 2, firearms: 3, athletics: 2,
        occult: 0, investigation: 2,
        health: 8, maxHealth: 8,
        willpower: 5, maxWillpower: 5,
        defense: 3,
        initiative: 5,
        speed: 10
    },

    soldier: {
        name: 'Солдат / Наёмник',
        type: 'sleeper',
        icon: '🎖️',
        description: 'Профессиональный боец. Опасен даже для опытных магов.',
        strength: 3, dexterity: 3, stamina: 3,
        intelligence: 2, wits: 3, resolve: 3,
        presence: 2, manipulation: 2, composure: 3,
        brawl: 3, firearms: 4, athletics: 3,
        occult: 0, investigation: 2,
        health: 8, maxHealth: 8,
        willpower: 6, maxWillpower: 6,
        defense: 3,
        initiative: 6,
        speed: 11
    },

    hunter: {
        name: 'Охотник (Hunter)',
        type: 'sleeper',
        icon: '🏹',
        description: 'Знает о сверхъестественном. Использует тактики против магов (железо, ловушки, ритуалы).',
        strength: 3, dexterity: 3, stamina: 3,
        intelligence: 3, wits: 3, resolve: 3,
        presence: 3, manipulation: 2, composure: 3,
        brawl: 3, firearms: 4, athletics: 3,
        occult: 2, investigation: 3,
        health: 8, maxHealth: 8,
        willpower: 6, maxWillpower: 6,
        defense: 3,
        initiative: 6,
        speed: 11,
        conditions: [{ name: 'Истинное Зрение', permanent: true }]
    },

    occultist: {
        name: 'Оккультист-любитель',
        type: 'sleeper',
        icon: '📖',
        description: 'Читал книги, но не Пробуждён. Знает ритуалы, но не имеет силы.',
        strength: 2, dexterity: 2, stamina: 2,
        intelligence: 3, wits: 2, resolve: 2,
        presence: 2, manipulation: 3, composure: 2,
        brawl: 1, firearms: 0, athletics: 1,
        occult: 3, investigation: 3,
        health: 7, maxHealth: 7,
        willpower: 4, maxWillpower: 4,
        defense: 2,
        initiative: 4,
        speed: 9
    },

    // ============================================================
    // 🧙 МАГИ
    // ============================================================
    mageInitiate: {
        name: 'Маг-Посвящённый',
        type: 'mage',
        icon: '🔮',
        description: 'Молодой Пробуждённый. Гнозис 1, слабое Таинство.',
        path: '',
        gnosis: 1, mana: 10, maxMana: 10,
        strength: 2, dexterity: 2, stamina: 2,
        intelligence: 2, wits: 3, resolve: 3,
        presence: 2, manipulation: 2, composure: 3,
        brawl: 1, firearms: 1, athletics: 1,
        occult: 2, investigation: 2,
        health: 7, maxHealth: 7,
        willpower: 6, maxWillpower: 6,
        defense: 3,
        initiative: 5,
        speed: 9,
        arcana: { Mind: 2, Space: 1 }
    },

    mageAdept: {
        name: 'Маг-Адепт',
        type: 'mage',
        icon: '🔮',
        description: 'Опытный маг. Гнозис 3-4, Таинства до 4.',
        path: '',
        gnosis: 4, mana: 12, maxMana: 12,
        strength: 2, dexterity: 3, stamina: 3,
        intelligence: 3, wits: 4, resolve: 4,
        presence: 3, manipulation: 3, composure: 4,
        brawl: 2, firearms: 2, athletics: 2,
        occult: 4, investigation: 3,
        health: 8, maxHealth: 8,
        willpower: 8, maxWillpower: 8,
        defense: 4,
        initiative: 7,
        speed: 10,
        arcana: { Forces: 4, Prime: 3, Mind: 1 }
    },

    mageMaster: {
        name: 'Маг-Мастер',
        type: 'mage',
        icon: '✨',
        description: 'Опаснейший противник. Гнозис 5+, Таинства до 5. Легенды ходят о его делах.',
        path: '',
        gnosis: 5, mana: 15, maxMana: 15,
        strength: 3, dexterity: 3, stamina: 3,
        intelligence: 4, wits: 4, resolve: 4,
        presence: 4, manipulation: 4, composure: 4,
        brawl: 3, firearms: 2, athletics: 3,
        occult: 5, investigation: 4,
        health: 8, maxHealth: 8,
        willpower: 8, maxWillpower: 8,
        defense: 4,
        initiative: 7,
        speed: 11,
        arcana: { Death: 5, Matter: 4, Prime: 3, Space: 2 }
    },

    seerApprentice: {
        name: 'Видящий у Престола: Ученик',
        type: 'mage',
        icon: '👁️',
        description: 'Слуга Пано́птикума. Следит за кабалами, докладывает Министериуму.',
        path: 'Obrimos',
        gnosis: 2, mana: 11, maxMana: 11,
        strength: 2, dexterity: 3, stamina: 2,
        intelligence: 3, wits: 4, resolve: 2,
        presence: 2, manipulation: 3, composure: 3,
        brawl: 1, firearms: 1, athletics: 2,
        occult: 4, investigation: 4,
        health: 7, maxHealth: 7,
        willpower: 5, maxWillpower: 5,
        defense: 3,
        initiative: 6,
        speed: 10,
        arcana: { Prime: 3, Forces: 2, Mind: 1 }
    },

    seerMagister: {
        name: 'Видящий у Престола: Магистр',
        type: 'mage',
        icon: '👁️‍🗨️',
        description: 'Командир ячейки Видящих. Мастер Разума и Пространства, следит за городом.',
        path: 'Mastigos',
        gnosis: 4, mana: 14, maxMana: 14,
        strength: 3, dexterity: 3, stamina: 3,
        intelligence: 4, wits: 4, resolve: 4,
        presence: 3, manipulation: 4, composure: 4,
        brawl: 2, firearms: 2, athletics: 2,
        occult: 5, investigation: 5,
        health: 8, maxHealth: 8,
        willpower: 8, maxWillpower: 8,
        defense: 4,
        initiative: 8,
        speed: 10,
        arcana: { Mind: 5, Space: 4, Prime: 3, Fate: 2 }
    },

    banisher: {
        name: 'Отступник (Banisher)',
        type: 'mage',
        icon: '🗡️',
        description: 'Маг, считающий всё сверхъестественное злом. Охотится на своих же.',
        path: 'Thyrsus',
        gnosis: 3, mana: 13, maxMana: 13,
        strength: 3, dexterity: 3, stamina: 3,
        intelligence: 2, wits: 3, resolve: 4,
        presence: 2, manipulation: 2, composure: 4,
        brawl: 4, firearms: 3, athletics: 3,
        occult: 3, investigation: 3,
        health: 8, maxHealth: 8,
        willpower: 8, maxWillpower: 8,
        defense: 4,
        initiative: 7,
        speed: 11,
        arcana: { Life: 4, Spirit: 3, Forces: 2 },
        conditions: [{ name: 'Фанатизм', permanent: true }]
    },

    // ============================================================
    // 🦇 ВАМПИРЫ (Vampire: The Requiem)
    // ============================================================
    vampireNeonate: {
        name: 'Вампир: Неофит',
        type: 'vampire',
        icon: '🦇',
        description: 'Молодой вампир. Дисциплины 1-2, жаждет крови, но осторожен.',
        strength: 3, dexterity: 3, stamina: 3,
        intelligence: 2, wits: 3, resolve: 2,
        presence: 3, manipulation: 3, composure: 2,
        brawl: 3, firearms: 1, athletics: 2,
        occult: 2, investigation: 2,
        health: 8, maxHealth: 8,
        willpower: 5, maxWillpower: 5,
        defense: 3,
        initiative: 5,
        speed: 11,
        conditions: [
            { name: 'Вампир: солнце обжигает', permanent: true },
            { name: 'Вампир: нужна кровь', permanent: true }
        ]
    },

    vampireElder: {
        name: 'Вампир: Старейшина',
        type: 'vampire',
        icon: '🧛',
        description: 'Древний вампир. Дисциплины 4-5, огромная власть и осторожность.',
        strength: 4, dexterity: 4, stamina: 4,
        intelligence: 4, wits: 4, resolve: 4,
        presence: 4, manipulation: 4, composure: 4,
        brawl: 4, firearms: 3, athletics: 3,
        occult: 4, investigation: 4,
        health: 9, maxHealth: 9,
        willpower: 8, maxWillpower: 8,
        defense: 4,
        initiative: 8,
        speed: 13,
        conditions: [
            { name: 'Вампир: солнце обжигает', permanent: true },
            { name: 'Вампир: нужна кровь', permanent: true },
            { name: 'Дисциплина: Доминирование', permanent: true }
        ]
    },

    // ============================================================
    // 🐺 ОБОРОТНИ (Werewolf: The Forsaken)
    // ============================================================
    werewolfGhost: {
        name: 'Оборотень: Призрачный Волк',
        type: 'werewolf',
        icon: '🐺',
        description: 'Молодой Урата. Оборотень в форме Dalu или Urshul. Опасен в бою.',
        strength: 4, dexterity: 3, stamina: 4,
        intelligence: 2, wits: 3, resolve: 3,
        presence: 3, manipulation: 2, composure: 3,
        brawl: 4, firearms: 0, athletics: 3,
        occult: 2, investigation: 2,
        health: 9, maxHealth: 9,
        willpower: 6, maxWillpower: 6,
        defense: 3,
        initiative: 6,
        speed: 12,
        conditions: [
            { name: 'Ярость', permanent: true },
            { name: 'Регенерация', permanent: true }
        ]
    },

    werewolfAlpha: {
        name: 'Оборотень: Альфа',
        type: 'werewolf',
        icon: '🌕',
        description: 'Лидер стаи. Огромная мощь, Ритуалы, полное доверие стаи.',
        strength: 5, dexterity: 4, stamina: 5,
        intelligence: 3, wits: 4, resolve: 4,
        presence: 4, manipulation: 3, composure: 4,
        brawl: 5, firearms: 0, athletics: 4,
        occult: 3, investigation: 3,
        health: 10, maxHealth: 10,
        willpower: 8, maxWillpower: 8,
        defense: 4,
        initiative: 8,
        speed: 14,
        conditions: [
            { name: 'Ярость', permanent: true },
            { name: 'Регенерация', permanent: true },
            { name: 'Ритуалы', permanent: true }
        ]
    },

    // ============================================================
    // 👻 ДУХИ И ПРИЗРАКИ
    // ============================================================
    spirit: {
        name: 'Дух',
        type: 'spirit',
        icon: '💫',
        description: 'Дух Сумеречной зоны. Ранг 2, Influence 3, Numina 2.',
        rank: 2,
        power: 5, finesse: 4, resistance: 5,
        essence: 15, maxEssence: 15,
        corpus: 10, maxCorpus: 10,
        influence: 3,
        numina: 2,
        // Псевдостаты для совместимости
        strength: 5, dexterity: 4, stamina: 5,
        intelligence: 3, wits: 4, resolve: 5,
        presence: 3, manipulation: 3, composure: 5,
        brawl: 3, firearms: 0, athletics: 2,
        occult: 4, investigation: 3,
        health: 10, maxHealth: 10,
        willpower: 10, maxWillpower: 10,
        defense: 4,
        initiative: 8,
        speed: 12,
        conditions: [{ name: 'Дух: бесплотный', permanent: true }]
    },

    ghost: {
        name: 'Призрак',
        type: 'ghost',
        icon: '👻',
        description: 'Душа умершего, застрявшая в Сумеречной зоне. Привязана к якорю.',
        rank: 2,
        power: 4, finesse: 3, resistance: 4,
        essence: 10, maxEssence: 10,
        corpus: 8, maxCorpus: 8,
        anchors: 2,
        strength: 4, dexterity: 3, stamina: 4,
        intelligence: 2, wits: 3, resolve: 4,
        presence: 3, manipulation: 3, composure: 4,
        brawl: 1, firearms: 0, athletics: 1,
        occult: 2, investigation: 2,
        health: 8, maxHealth: 8,
        willpower: 7, maxWillpower: 7,
        defense: 3,
        initiative: 6,
        speed: 10,
        conditions: [
            { name: 'Призрак: бесплотный', permanent: true },
            { name: 'Призрак: привязан к якорю', permanent: true }
        ]
    },

    ghostWraith: {
        name: 'Призрак: Кербер',
        type: 'ghost',
        icon: '💀',
        description: 'Могущественный призрак, почти дух. Может атаковать живых.',
        rank: 3,
        power: 6, finesse: 4, resistance: 5,
        essence: 15, maxEssence: 15,
        corpus: 12, maxCorpus: 12,
        anchors: 1,
        strength: 5, dexterity: 4, stamina: 5,
        intelligence: 3, wits: 4, resolve: 5,
        presence: 4, manipulation: 3, composure: 5,
        brawl: 3, firearms: 0, athletics: 2,
        occult: 4, investigation: 3,
        health: 10, maxHealth: 10,
        willpower: 9, maxWillpower: 9,
        defense: 4,
        initiative: 8,
        speed: 12,
        conditions: [
            { name: 'Призрак: бесплотный', permanent: true },
            { name: 'Призрак: Numina', permanent: true }
        ]
    },

    goetia: {
        name: 'Гоэтия',
        type: 'goetia',
        icon: '🌀',
        description: 'Сущность из Астрального плана, порождённая разумом. Может быть врагом или союзником.',
        rank: 2,
        power: 5, finesse: 5, resistance: 4,
        essence: 10, maxEssence: 10,
        corpus: 9, maxCorpus: 9,
        strength: 5, dexterity: 5, stamina: 4,
        intelligence: 4, wits: 4, resolve: 4,
        presence: 3, manipulation: 4, composure: 4,
        brawl: 2, firearms: 0, athletics: 2,
        occult: 4, investigation: 4,
        health: 9, maxHealth: 9,
        willpower: 8, maxWillpower: 8,
        defense: 4,
        initiative: 8,
        speed: 12,
        conditions: [{ name: 'Гоэтия: астральна', permanent: true }]
    },

    // ============================================================
    // 🧚 ПОХИЩЕННЫЕ (Changeling: The Lost)
    // ============================================================
    changeling: {
        name: 'Похищенный (Changeling)',
        type: 'changeling',
        icon: '🧚',
        description: 'Беглец из Аркадии. Обладает Глэмором и Контрактами.',
        strength: 2, dexterity: 3, stamina: 3,
        intelligence: 3, wits: 3, resolve: 3,
        presence: 3, manipulation: 4, composure: 3,
        brawl: 2, firearms: 1, athletics: 2,
        occult: 3, investigation: 3,
        health: 8, maxHealth: 8,
        willpower: 6, maxWillpower: 6,
        defense: 3,
        initiative: 6,
        speed: 10,
        conditions: [
            { name: 'Контракт: Сокрытие', permanent: true },
            { name: 'Глэмор', permanent: true }
        ]
    },

    loyalist: {
        name: 'Лоялист',
        type: 'changeling',
        icon: '🎭',
        description: 'Похищенный, служащий своим похитителям (True Fae). Предатель.',
        strength: 3, dexterity: 3, stamina: 3,
        intelligence: 3, wits: 4, resolve: 3,
        presence: 4, manipulation: 5, composure: 3,
        brawl: 3, firearms: 1, athletics: 2,
        occult: 4, investigation: 4,
        health: 8, maxHealth: 8,
        willpower: 6, maxWillpower: 6,
        defense: 4,
        initiative: 7,
        speed: 11,
        conditions: [
            { name: 'Контракт: Обман', permanent: true },
            { name: 'Глэмор', permanent: true },
            { name: 'Слуга Аркадии', permanent: true }
        ]
    },

    // ============================================================
    // ⚠️ ПРОЧИЕ УГРОЗЫ
    // ============================================================
    proximus: {
        name: 'Сноходец (Proximus)',
        type: 'other',
        icon: '🌌',
        description: 'Смертный, изучающий магию. Видит магию, но не имеет Таинств.',
        strength: 2, dexterity: 2, stamina: 2,
        intelligence: 3, wits: 3, resolve: 3,
        presence: 3, manipulation: 3, composure: 3,
        brawl: 1, firearms: 1, athletics: 1,
        occult: 4, investigation: 4,
        health: 7, maxHealth: 7,
        willpower: 6, maxWillpower: 6,
        defense: 3,
        initiative: 5,
        speed: 9,
        conditions: [{ name: 'Сноходец: видит магию', permanent: true }]
    },

    possessed: {
        name: 'Одержимый',
        type: 'other',
        icon: '😈',
        description: 'Смертный или маг, в которого вселился дух или демон.',
        strength: 4, dexterity: 3, stamina: 4,
        intelligence: 3, wits: 4, resolve: 4,
        presence: 4, manipulation: 4, composure: 4,
        brawl: 3, firearms: 0, athletics: 2,
        occult: 3, investigation: 3,
        health: 9, maxHealth: 9,
        willpower: 8, maxWillpower: 8,
        defense: 4,
        initiative: 7,
        speed: 12,
        conditions: [
            { name: 'Одержимость', permanent: true },
            { name: 'Сверхъестественная сила', permanent: true }
        ]
    },

    abyssal: {
        name: 'Абиссальная сущность',
        type: 'other',
        icon: '🌑',
        description: 'Сущность из Бездны. Не подчиняется законам реальности. Опаснейший враг.',
        strength: 5, dexterity: 4, stamina: 5,
        intelligence: 4, wits: 4, resolve: 5,
        presence: 5, manipulation: 4, composure: 5,
        brawl: 4, firearms: 0, athletics: 3,
        occult: 5, investigation: 4,
        health: 10, maxHealth: 10,
        willpower: 10, maxWillpower: 10,
        defense: 4,
        initiative: 8,
        speed: 14,
        conditions: [
            { name: 'Абиссальная: искажает реальность', permanent: true },
            { name: 'Абиссальная: не подчиняется магии', permanent: true }
        ]
    }
};

// ============================================================
// ХЕЛПЕРЫ
// ============================================================

/**
 * Получить все шаблоны указанной категории.
 */
export function getTemplatesByCategory(categoryKey) {
    const cat = NPC_CATEGORIES.find(c => c.key === categoryKey);
    if (!cat) return [];
    return Object.entries(NPC_TEMPLATES)
        .filter(([_, t]) => cat.types.includes(t.type))
        .map(([key, t]) => ({ key, ...t }));
}

/**
 * Получить шаблон по ключу.
 */
export function getTemplate(key) {
    return NPC_TEMPLATES[key] || null;
}