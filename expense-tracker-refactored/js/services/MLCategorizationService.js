class MLCategorizationService {
    constructor() {
        this.model = null;
        this.wordIndex = null;
        this.categoryDict = null;
        this.isReady = false;
    }

    async init() {
        try {
            const wordRes = await fetch('./ml_model/word_index.json');
            this.wordIndex = await wordRes.json();

            const catRes = await fetch('./ml_model/category_dict.json');
            this.categoryDict = await catRes.json();

            this.model = await tf.loadLayersModel('./ml_model/model.json');

            this.isReady = true;
            console.log('ШІ-модель успішно завантажена!');
        } catch (error) {
            console.error('Помилка завантаження ШІ-моделі:', error);
        }
    }

    tokenize(text) {
        const words = text.toLowerCase().replace(/[^\w\sа-яіїєґ]/gi, '').split(' ');
        const sequence = new Array(1000).fill(0); // Розмір словника - 1000

        words.forEach(word => {
            const index = this.wordIndex[word];
            if (index && index < 1000) {
                sequence[index] = 1;
            } else if (this.wordIndex['<OOV>']) {
                sequence[this.wordIndex['<OOV>']] = 1;
            }
        });

        return tf.tensor2d([sequence]);
    }

    async predictCategory(text) {
        if (!this.isReady || !text.trim()) return null;

        try {
            const inputTensor = this.tokenize(text);

            const prediction = this.model.predict(inputTensor);
            const probabilities = await prediction.data();

            const maxIndex = probabilities.indexOf(Math.max(...probabilities));

            inputTensor.dispose();
            prediction.dispose();

            return this.categoryDict[maxIndex];
        } catch (error) {
            console.error('Помилка під час передбачення:', error);
            return null;
        }
    }
}

window.mlService = new MLCategorizationService();
document.addEventListener('DOMContentLoaded', () => {
    window.mlService.init();
});