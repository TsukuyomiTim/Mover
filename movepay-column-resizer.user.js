// ==UserScript==
// @name         MovePay - Persistent column widths
// @namespace    https://github.com/yourusername/movepay-column-resizer
// @version      3.1
// @description  Удерживает и позволяет изменять ширину колонок: Merchant Transaction, Transaction Ref, Transaction Ext, Payment Method на pub.prod.movepay.online
// @author       NewVicer
// @match        https://pub.prod.movepay.online/*
// @match        https://*.movepay.online/*
// @grant        GM_addStyle
// @run-at       document-end
// @homepageURL  https://github.com/yourusername/movepay-column-resizer
// @supportURL   https://github.com/yourusername/movepay-column-resizer/issues
// ==/UserScript==

(function () {
    'use strict';

    // === Настройки колонок ===
    // Можно менять стартовые ширины по своему вкусу
    const COLUMNS = [
        { match: ['MERCHANT TRANSACTION', 'MERCHANT TRANS'], width: 320, key: 'merchant' },
        { match: ['TRANSACTION REF', 'TRANSACTION REF.'], width: 220, key: 'ref' },
        { match: ['TRANSACTION EXT', 'TRANSACTION EXTE', 'TRANSACTION EXTERNAL'], width: 200, key: 'ext' },
        { match: ['PAYMENT M', 'PAYMENT METHOD', 'PAYMENT METH'], width: 180, key: 'payment' },
    ];

    // Хранилище текущих ширин (чтобы после перерисовки таблицы восстанавливать)
    const savedWidths = {};
    COLUMNS.forEach(c => (savedWidths[c.key] = c.width));

    GM_addStyle(`
        .mp-resizer {
            position: absolute !important;
            right: -2px !important;
            top: 0 !important;
            bottom: 0 !important;
            width: 7px !important;
            cursor: col-resize !important;
            background: rgba(80, 160, 255, 0.4) !important;
            z-index: 99999 !important;
            border-radius: 2px;
        }
        .mp-resizer:hover {
            background: rgba(80, 160, 255, 0.85) !important;
        }
        .mp-resizer:active {
            background: #4a9eff !important;
        }
    `);

    function findHeaderByText(matchList) {
        const candidates = document.querySelectorAll(
            'th, [role="columnheader"], .ant-table-cell, .ant-table-thead th, [class*="header"]'
        );

        for (const el of candidates) {
            const text = (el.textContent || '').toUpperCase().replace(/\s+/g, ' ').trim();
            for (const m of matchList) {
                if (text.includes(m) || text.startsWith(m)) {
                    return el;
                }
            }
        }
        return null;
    }

    function forceColumnWidth(header, width, colIndex) {
        if (!header) return;

        // Заголовок
        header.style.setProperty('width', width + 'px', 'important');
        header.style.setProperty('min-width', width + 'px', 'important');
        header.style.setProperty('max-width', 'none', 'important');
        header.style.setProperty('overflow', 'visible', 'important');

        // Ячейки тела таблицы
        const rows = document.querySelectorAll(
            'tbody tr, .ant-table-tbody tr, .ant-table-row, [role="row"]'
        );
        rows.forEach(row => {
            const cell = row.children[colIndex];
            if (cell) {
                cell.style.setProperty('width', width + 'px', 'important');
                cell.style.setProperty('min-width', width + 'px', 'important');
                cell.style.setProperty('max-width', 'none', 'important');
            }
        });

        // colgroup (часто именно он управляет шириной)
        document.querySelectorAll('table colgroup, colgroup').forEach(group => {
            const cols = group.querySelectorAll('col');
            if (cols[colIndex]) {
                cols[colIndex].style.setProperty('width', width + 'px', 'important');
                cols[colIndex].style.setProperty('min-width', width + 'px', 'important');
            }
        });
    }

    function addResizer(header, key, colIndex) {
        if (header.querySelector('.mp-resizer')) return;

        header.style.position = 'relative';

        const resizer = document.createElement('div');
        resizer.className = 'mp-resizer';
        header.appendChild(resizer);

        let startX, startWidth;

        resizer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();

            startX = e.pageX;
            startWidth = header.getBoundingClientRect().width;

            const onMove = (e) => {
                const newWidth = Math.max(160, Math.round(startWidth + (e.pageX - startX)));
                savedWidths[key] = newWidth; // сохраняем новую ширину
                forceColumnWidth(header, newWidth, colIndex);
            };

            const onUp = () => {
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            };

            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    }

    function process() {
        COLUMNS.forEach(col => {
            const header = findHeaderByText(col.match);
            if (!header) return;

            const colIndex = Array.from(header.parentNode.children).indexOf(header);
            if (colIndex < 0) return;

            const width = savedWidths[col.key];
            forceColumnWidth(header, width, colIndex);
            addResizer(header, col.key, colIndex);
        });
    }

    // === Запуск ===
    process();

    // Частое обновление — таблица постоянно перерисовывается
    setInterval(process, 400);

    // + MutationObserver
    const observer = new MutationObserver(() => process());
    observer.observe(document.body, { childList: true, subtree: true });
})();
