// js/data/npc-templates.js
// ============================================================
// ШАБЛОНЫ NPC ДЛЯ МАГА
// ============================================================
export const NPC_TEMPLATES = {
    sleeper: {
        name: 'Спящий',
        strength: 2, dexterity: 2, stamina: 2,
        wits: 2, resolve: 2, composure: 2,
        presence: 2, manipulation: 2, composure2: 2,
        brawl: 1, firearms: 0, athletics: 1,
        health: 7, maxHealth: 7,
        willpower: 4, maxWillpower: 4,
        defense: 2,
        initiative: 4,
        speed: 9,
        type: 'sleeper'
    },
    mageInitiate: {
        name: 'Маг-Посвящённый',
        gnosis: 1, mana: 10, maxMana: 10,
        strength: 2, dexterity: 2, stamina: 2,
        wits: 3, resolve: 3, composure: 3,
        brawl: 1, firearms: 1, athletics: 1,
        occult: 2, investigation: 2,
        health: 7, maxHealth: 7,
        willpower: 6, maxWillpower: 6,
        defense: 3,
        initiative: 5,
        speed: 9,
        arcana: { Death: 1, Fate: 1, Forces: 1, Life: 1, Matter: 1, Mind: 1, Prime: 1, Spirit: 1, Space: 1, Time: 1 },
        type: 'mage'
    },
    mageAdept: {
        name: 'Маг-Адепт',
        gnosis: 4, mana: 12, maxMana: 12,
        strength: 2, dexterity: 3, stamina: 3,
        wits: 4, resolve: 4, composure: 4,
        brawl: 2, firearms: 2, athletics: 2,
        occult: 4, investigation: 3,
        health: 8, maxHealth: 8,
        willpower: 8, maxWillpower: 8,
        defense: 4,
        initiative: 7,
        speed: 10,
        arcana: { Death: 3, Fate: 3, Forces: 3, Life: 3, Matter: 3, Mind: 3, Prime: 3, Spirit: 3, Space: 3, Time: 3 },
        type: 'mage'
    },
    spirit: {
        name: 'Дух',
        rank: 2,
        power: 5, finesse: 4, resistance: 5,
        essence: 15, maxEssence: 15,
        corpus: 10, maxCorpus: 10,
        influence: 3,
        numina: 2,
        type: 'spirit'
    },
    ghost: {
        name: 'Призрак',
        rank: 2,
        power: 4, finesse: 3, resistance: 4,
        essence: 10, maxEssence: 10,
        corpus: 8, maxCorpus: 8,
        anchors: 2,
        type: 'ghost'
    },
    goetia: {
        name: 'Гоэтия',
        rank: 2,
        power: 5, finesse: 5, resistance: 4,
        essence: 10, maxEssence: 10,
        corpus: 9, maxCorpus: 9,
        type: 'goetia'
    }
};