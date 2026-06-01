export const ModalView = {
    show(modalId) {
        const container = document.getElementById('modal-container');
        if (container) {
            container.style.display = 'flex';
        }

        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
        }
    },

    hide(modalId) {
        const container = document.getElementById('modal-container');
        if (container) {
            container.style.display = 'none';
        }

        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    },

    getFormData() {
        return {
            name: document.getElementById('inpName').value,
            amount: document.getElementById('inpAmount').value,
            type: document.getElementById('inpType').value,
            category: document.getElementById('inpCategory').value,
            date: document.getElementById('inpDate').value,
            comment: document.getElementById('inpComment').value
        };
    },

    fillForm(data) {
        document.getElementById('inpName').value = data.name;
        document.getElementById('inpAmount').value = data.amount;
        document.getElementById('inpType').value = data.type;
        document.getElementById('inpCategory').value = data.category;
        document.getElementById('inpDate').value = data.date;
        document.getElementById('inpComment').value = data.comment || "";
    },

    setEditMode(isEditing, transactionId = null) {
        const btnSave = document.querySelector('.btn-save');
        if (isEditing) {
            btnSave.innerText = "Оновити запис";
            btnSave.dataset.mode = 'edit';
            btnSave.dataset.id = transactionId;
        } else {
            btnSave.innerText = "Зберегти транзакцію";
            delete btnSave.dataset.mode;
            delete btnSave.dataset.id;
        }
    },

    clearForm() {
        document.getElementById('inpName').value = "";
        document.getElementById('inpAmount').value = "";
        document.getElementById('inpComment').value = "";
    }
};

window.ModalView = ModalView;

document.addEventListener('DOMContentLoaded', () => {
    const nameInput = document.getElementById('inpName');
    const categorySelect = document.getElementById('inpCategory');
    const typeSelect = document.getElementById('inpType');

    if (nameInput && categorySelect && typeSelect) {
        nameInput.addEventListener('blur', async (e) => {
            const text = e.target.value;

            if (text && typeof window.mlService !== 'undefined' && window.mlService.isReady) {
                const predictedCategory = await window.mlService.predictCategory(text);

                if (predictedCategory) {
                    categorySelect.value = predictedCategory;

                    if (predictedCategory === 'Зарплата') {
                        typeSelect.value = 'income';
                    } else {
                        typeSelect.value = 'expense';
                    }

                    const highlightStyle = "0 0 0 3px rgba(76, 175, 80, 0.4)";
                    categorySelect.style.transition = "box-shadow 0.3s";
                    typeSelect.style.transition = "box-shadow 0.3s";

                    categorySelect.style.boxShadow = highlightStyle;
                    typeSelect.style.boxShadow = highlightStyle;

                    setTimeout(() => {
                        categorySelect.style.boxShadow = "none";
                        typeSelect.style.boxShadow = "none";
                    }, 1000);
                }
            }
        });
    }
});