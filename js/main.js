// js/main.js
// ============================================================
// ГЛАВНАЯ СТРАНИЦА — СПИСОК БОЁВ
// ============================================================
import {
    db, collection, onSnapshot, query, where, addDoc,
    serverTimestamp, deleteDoc, doc, getDoc
} from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
    const battlesList = document.getElementById('active-battles-list');
    const createBtn = document.getElementById('btn-create-battle');
    const nameInput = document.getElementById('battle-name-input');

    // ============================================================
    // 1. ПОДПИСКА НА АКТИВНЫЕ БОИ
    // ============================================================
    if (battlesList) {
        const q = query(collection(db, 'battles'), where('isActive', '==', true));
        onSnapshot(q, (snapshot) => {
            if (snapshot.empty) {
                battlesList.innerHTML = '<div class="empty-state">🌙 Активных сражений нет. Создайте первое.</div>';
                return;
            }

            let html = '';
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                const id = docSnap.id;
                const date = data.createdAt?.toDate
                    ? data.createdAt.toDate().toLocaleString('ru-RU')
                    : 'только что';

                html += `
                    <div class="battle-card">
                        <div>
                            <div class="battle-name">⚔️ ${data.name || 'Бой'}</div>
                            <div class="battle-meta">Создан: ${date}</div>
                        </div>
                        <div style="display:flex; gap:8px; flex-wrap:wrap;">
                            <button class="btn-primary" onclick="window.location.href='battle.html?id=${id}'">
                                Войти
                            </button>
                            <button class="btn-danger" onclick="window.deleteBattle('${id}')">
                                🗑️ Удалить
                            </button>
                        </div>
                    </div>`;
            });
            battlesList.innerHTML = html;
        });
    }

    // ============================================================
    // 2. СОЗДАНИЕ БОЯ
    // ============================================================
    if (createBtn) {
        createBtn.addEventListener('click', async () => {
            const name = nameInput ? nameInput.value.trim() : '';
            if (!name) {
                alert('Введите название боя');
                return;
            }

            try {
                await addDoc(collection(db, 'battles'), {
                    name: name,
                    isActive: true,
                    isFinished: false,
                    turn: 0,
                    turnOrder: [],
                    currentTurnIndex: 0,
                    currentPlayerId: null,
                    characters: {},
                    log: [],
                    kills: 0,
                    createdAt: serverTimestamp()
                });
                if (nameInput) nameInput.value = '';
            } catch (e) {
                console.error('Ошибка создания:', e);
                alert('Ошибка создания боя: ' + e.message);
            }
        });
    }

    // ============================================================
    // 3. УДАЛЕНИЕ БОЯ (с двойным подтверждением)
    // ============================================================
    window.deleteBattle = async (id) => {
        if (!id || id === 'undefined') return;

        try {
            const battleSnap = await getDoc(doc(db, 'battles', id));
            if (!battleSnap.exists()) {
                alert('❌ Бой не найден');
                return;
            }
            const battleName = battleSnap.data().name || 'Без названия';

            if (!confirm(`⚠️ Удалить бой "${battleName}"?\nЭто действие НЕОБРАТИМО.`)) return;

            const userInput = prompt(
                `Для подтверждения введите название боя:\n"${battleName}"`
            );
            if (userInput === null) return;
            if (userInput.trim() !== battleName) {
                alert('❌ Название введено неверно. Удаление отменено.');
                return;
            }

            await deleteDoc(doc(db, 'battles', id));
            alert(`✅ Бой "${battleName}" удалён.`);
        } catch (e) {
            console.error('Ошибка удаления:', e);
            alert('❌ Ошибка при удалении боя: ' + e.message);
        }
    };
});