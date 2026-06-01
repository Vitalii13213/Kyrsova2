import os
import json
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
import tensorflow as tf
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import MultinomialNB
from sklearn.svm import SVC
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
from lime.lime_text import LimeTextExplainer

tf.keras.backend.clear_session()

script_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(script_dir)
output_dir = os.path.join(project_root, 'ml_model')

os.makedirs(output_dir, exist_ok=True)

print("Завантаження та передобробка даних...")
csv_path = os.path.join(script_dir, 'dataset.csv')

if not os.path.exists(csv_path):
    raise FileNotFoundError(f"Файл не знайдено! Переконайся, що dataset.csv лежить тут: {csv_path}")

df = pd.read_csv(csv_path)
texts = df['text'].astype(str).tolist()
categories = df['category'].astype(str).tolist()

unique_categories = sorted(list(set(categories)))
category_to_id = {cat: i for i, cat in enumerate(unique_categories)}
id_to_category = {i: cat for i, cat in enumerate(unique_categories)}

with open(os.path.join(output_dir, 'category_dict.json'), 'w', encoding='utf-8') as f:
    json.dump(id_to_category, f, ensure_ascii=False)

labels = [category_to_id[cat] for cat in categories]

X_train_raw, X_test_raw, y_train, y_test = train_test_split(
    texts, labels, test_size=0.2, random_state=42, stratify=labels
)

tokenizer = tf.keras.preprocessing.text.Tokenizer(num_words=1000, oov_token="<OOV>")
tokenizer.fit_on_texts(X_train_raw)

with open(os.path.join(output_dir, 'word_index.json'), 'w', encoding='utf-8') as f:
    json.dump(tokenizer.word_index, f, ensure_ascii=False)

X_train_matrix = tokenizer.texts_to_matrix(X_train_raw, mode='binary')
X_test_matrix = tokenizer.texts_to_matrix(X_test_raw, mode='binary')

y_train_categorical = tf.keras.utils.to_categorical(y_train, num_classes=len(unique_categories))
y_test_categorical = tf.keras.utils.to_categorical(y_test, num_classes=len(unique_categories))

print("\nНавчання базових моделей (Scikit-Learn)...")
nb_model = MultinomialNB()
nb_model.fit(X_train_matrix, y_train)
nb_preds = nb_model.predict(X_test_matrix)
print(f"Точність Naive Bayes: {accuracy_score(y_test, nb_preds):.4f}")

svm_model = SVC(kernel='linear')
svm_model.fit(X_train_matrix, y_train)
svm_preds = svm_model.predict(X_test_matrix)
print(f"Точність SVM: {accuracy_score(y_test, svm_preds):.4f}")

print("\nНавчання нейронної мережі (TensorFlow)...")
inputs = tf.keras.Input(shape=(1000,), name="input_layer")
x = tf.keras.layers.Dense(64, activation='relu', name="dense_1")(inputs)
x = tf.keras.layers.Dropout(0.3, name="dropout_1")(x)
x = tf.keras.layers.Dense(32, activation='relu', name="dense_2")(x)
x = tf.keras.layers.Dropout(0.2, name="dropout_2")(x)
outputs = tf.keras.layers.Dense(len(unique_categories), activation='softmax', name="output_layer")(x)

model = tf.keras.Model(inputs=inputs, outputs=outputs, name="fintrack_classifier")
model.compile(loss='categorical_crossentropy', optimizer='adam', metrics=['accuracy'])

early_stop = tf.keras.callbacks.EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True)

history = model.fit(
    X_train_matrix, y_train_categorical,
    epochs=100,
    batch_size=16,
    validation_split=0.2,
    callbacks=[early_stop],
    verbose=1
)

plt.figure(figsize=(12, 4))
plt.subplot(1, 2, 1)
plt.plot(history.history['loss'], label='Train Loss')
plt.plot(history.history['val_loss'], label='Validation Loss')
plt.title('Крива втрат (Loss)')
plt.legend()

plt.subplot(1, 2, 2)
plt.plot(history.history['accuracy'], label='Train Accuracy')
plt.plot(history.history['val_accuracy'], label='Validation Accuracy')
plt.title('Крива точності (Accuracy)')
plt.legend()
plt.savefig(os.path.join(output_dir, 'training_history.png'))
print(f"Графіки навчання збережено у '{output_dir}/training_history.png'")

print("\nОцінка моделі на тестових даних...")
nn_preds_proba = model.predict(X_test_matrix)
nn_preds = np.argmax(nn_preds_proba, axis=1)

print("\nЗвіт по класах (Classification Report):")
report = classification_report(y_test, nn_preds, target_names=unique_categories)
print(report)

cm = confusion_matrix(y_test, nn_preds)
plt.figure(figsize=(10, 8))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=unique_categories, yticklabels=unique_categories)
plt.title('Матриця невідповідностей (Confusion Matrix)')
plt.ylabel('Справжня категорія')
plt.xlabel('Передбачена категорія')
plt.tight_layout()
plt.savefig(os.path.join(output_dir, 'confusion_matrix.png'))
print(f"Матрицю помилок збережено у '{output_dir}/confusion_matrix.png'")

print("\nГенерація пояснень ШІ (LIME)...")
explainer = LimeTextExplainer(class_names=unique_categories)

def predict_proba_for_lime(texts_for_lime):
    seq = tokenizer.texts_to_matrix(texts_for_lime, mode='binary')
    return model.predict(seq)

idx_to_explain = 0
if len(X_test_raw) > 0:
    exp = explainer.explain_instance(X_test_raw[idx_to_explain], predict_proba_for_lime, num_features=5, top_labels=1)
    exp.save_to_file(os.path.join(output_dir, 'lime_explanation.html'))

print("\nЕкспорт моделі для TensorFlow.js...")

h5_model_path = os.path.join(script_dir, 'fintrack_model.h5')
model.save(h5_model_path, save_format='h5')

print("Конвертація у формат для браузера...")
convert_cmd = f'tensorflowjs_converter --input_format=keras "{h5_model_path}" "{output_dir}"'
os.system(convert_cmd)

print(f"ГОТОВО! Всі файли моделі успішно збережені у папку: {output_dir}")