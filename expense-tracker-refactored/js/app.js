import { INITIAL_TRANSACTIONS } from './config/constants.js';
import { STORAGE_KEYS, APP_SETTINGS } from './config/settings.js';
import { StorageService } from './services/StorageService.js';
import { AnalyticsService } from './services/AnalyticsService.js';
import { ExportService } from './services/ExportService.js';
import * as TransactionController from './controllers/TransactionController.js';
import * as BudgetController from './controllers/BudgetController.js';
import { TableView } from './views/TableView.js';
import { DashboardView } from './views/DashboardView.js';
import { ModalView } from './views/ModalView.js';
import { DateFormatter } from './utils/DateFormatter.js';
import { SettingsView } from './views/SettingsView.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("[System]: Ініціалізація ректорованої системи...");
    initApp();
    setupEventListeners();
});

function initApp() {
    let transactions = StorageService.load(STORAGE_KEYS.TRANSACTIONS);

    if (!transactions) {
        transactions = INITIAL_TRANSACTIONS;
        StorageService.save(STORAGE_KEYS.TRANSACTIONS, transactions);
    }

    const dateInput = document.getElementById('inpDate');
    if (dateInput) {
        dateInput.value = DateFormatter.getCurrentISODate();
    }

    const settings = StorageService.load(STORAGE_KEYS.SETTINGS) || APP_SETTINGS;
    SettingsView.applyTheme(settings.theme);
    SettingsView.updateCurrencySymbols(settings.currency);

    refreshUI(transactions);
}

function refreshUI(transactions) {
    const summary = AnalyticsService.getSummary(transactions);
    const budgetLimit = StorageService.load(STORAGE_KEYS.BUDGET_LIMIT) || 0;

    DashboardView.updateSummary(summary);
    DashboardView.updateBudget(budgetLimit, summary.expenses);
    DashboardView.updateChart(transactions);

    TableView.render(transactions, TransactionController.handleDeleteTransaction);
}

function setupEventListeners() {
    document.getElementById('btnOpenModal').addEventListener('click', () => {
        ModalView.setEditMode(false);
        ModalView.clearForm();
        ModalView.show('addTransactionModal');
    });

    const nameInput = document.getElementById('inpName');
    const categorySelect = document.getElementById('inpCategory');

    if (nameInput && categorySelect) {
        nameInput.addEventListener('blur', async (e) => {
            const text = e.target.value;
            if (text && window.mlService && window.mlService.isReady) {
                const predictedCategory = await window.mlService.predictCategory(text);
                if (predictedCategory) {
                    categorySelect.value = predictedCategory;

                    categorySelect.style.transition = "box-shadow 0.3s";
                    categorySelect.style.boxShadow = "0 0 8px #4CAF50";
                    setTimeout(() => {
                        categorySelect.style.boxShadow = "none";
                    }, 1000);
                }
            }
        });
    }

    const btnSave = document.querySelector('.btn-save');
    if (btnSave) {
        btnSave.addEventListener('click', () => {
            const formData = ModalView.getFormData();
            const isEdit = btnSave.dataset.mode === 'edit';
            const transactionId = parseInt(btnSave.dataset.id);

            if (isEdit) {
                TransactionController.handleEditTransaction(transactionId, formData);
            } else {
                TransactionController.handleAddTransaction(formData);
            }

            refreshUI(StorageService.load(STORAGE_KEYS.TRANSACTIONS));
        });
    }

    document.getElementById('btnExport').addEventListener('click', () => {
        const transactions = StorageService.load(STORAGE_KEYS.TRANSACTIONS);
        ExportService.exportToCSV(transactions);
    });

    const filters = ['globalSearch', 'categoryFilter', 'typeFilter', 'dateFilter'];
    filters.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => {
                const currentFilters = {
                    search: document.getElementById('globalSearch').value,
                    category: document.getElementById('categoryFilter').value,
                    type: document.getElementById('typeFilter').value,
                    dateRange: document.getElementById('dateFilter').value
                };
                TransactionController.handleFilterChange(currentFilters);
            });
        }
    });

    const headers = document.querySelectorAll('#transactions-table thead th');
    const columnMapping = ['date', 'name', 'category', 'amount'];

    headers.forEach((header, index) => {
        if (index < columnMapping.length) {
            header.style.cursor = 'pointer';
            header.title = 'Натисніть для сортування';
            header.addEventListener('click', () => {
                TransactionController.handleSort(columnMapping[index]);
            });
        }
    });
    document.getElementById('btnBackupJSON').addEventListener('click', () => {
        const transactions = StorageService.load(STORAGE_KEYS.TRANSACTIONS) || [];
        const dataStr = JSON.stringify(transactions, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `FinTrack_Backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    document.getElementById('btnImportJSON').addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';

        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = event => {
                try {
                    const importedData = JSON.parse(event.target.result);

                    if (Array.isArray(importedData)) {
                        StorageService.save(STORAGE_KEYS.TRANSACTIONS, importedData);
                        refreshUI(importedData);
                        alert('Дані успішно імпортовано!');
                    } else {
                        alert('Помилка: Невірний формат файлу. Очікується масив транзакцій.');
                    }
                } catch (error) {
                    console.error('Помилка парсингу JSON:', error);
                    alert('Помилка: Файл пошкоджено або це не JSON.');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    });
}