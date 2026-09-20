// js/guide/guide-sections.js
// ============================================================
// АГРЕГАТОР РАЗДЕЛОВ СПРАВОЧНИКА
// ============================================================
// Импортирует все группы из ./sections/ и объединяет в один массив.
// Порядок групп задаётся здесь.
// ============================================================

import { BASICS_SECTION } from './sections/01-basics.js';
import { MAGIC_SECTION } from './sections/02-magic.js';
import { COMBINED_SECTION } from './sections/03-combined.js';
import { XP_SECTION } from './sections/04-xp.js';
import { LEGACIES_SECTION } from './sections/05-legacies.js';
import { DUELS_SECTION } from './sections/06-duels.js';
import { TIMESKIP_SECTION } from './sections/07-timeskip.js';
import { BESTIARY_SECTION } from './sections/08-bestiary.js';

export const GUIDE_SECTIONS = [
    BASICS_SECTION,
    MAGIC_SECTION,
    COMBINED_SECTION,
    XP_SECTION,
    LEGACIES_SECTION,
    DUELS_SECTION,
    TIMESKIP_SECTION,
    BESTIARY_SECTION
];