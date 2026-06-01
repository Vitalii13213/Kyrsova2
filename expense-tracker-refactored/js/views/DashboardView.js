import { Helpers } from '../utils/Helpers.js';
import { AnalyticsService } from '../services/AnalyticsService.js';

let expenseChartInstance = null;
export const DashboardView = {

    updateSummary(summary) {
        const balanceEl = document.getElementById('display-total-balance');
        if (balanceEl) {
            balanceEl.innerText = Helpers.formatCurrency(summary.balance);
        }
    },

    updateBudget(limit, spent) {
        const bar = document.getElementById('budget-progress');
        if (!bar) return;

        const percent = limit > 0 ? Math.min((spent / limit) * 100, 100) : 0;
        bar.style.width = `${percent}%`;

        if (percent >= 90) bar.style.backgroundColor = 'var(--danger-color)';
        else if (percent >= 70) bar.style.backgroundColor = 'var(--warning-color)';
        else bar.style.backgroundColor = 'var(--success-color)';
    },

    updateChart(transactions) {
        const ctx = document.getElementById('expenseChart');
        if (!ctx) return;

        const categoryTotals = AnalyticsService.getExpenseTotalsByCategory(transactions);
        const labels = Object.keys(categoryTotals);
        const data = Object.values(categoryTotals);

        if (expenseChartInstance) {
            expenseChartInstance.destroy();
        }

        expenseChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b',
                        '#ef4444', '#14b8a6', '#64748b', '#f472b6' // Додав ще кольорів на випадок нових категорій
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff',
                    hoverOffset: 6,
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                layout: {
                    padding: 10
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                family: "'Roboto', sans-serif",
                                size: 13,
                                weight: '500'
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        padding: 12,
                        cornerRadius: 8,
                        usePointStyle: true,
                        titleFont: { size: 13, family: "'Roboto', sans-serif" },
                        bodyFont: { size: 14, weight: 'bold', family: "'Roboto', sans-serif" },
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) label += ': ';
                                if (context.parsed !== null) {
                                    label += Helpers.formatCurrency(context.parsed);
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }
};