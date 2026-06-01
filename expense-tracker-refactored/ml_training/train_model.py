import os
import pandas as pd
import json
import tensorflow as tf
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.utils import to_categorical

tf.keras.backend.clear_session()

csv_content = """text,category
Сільпо,Їжа
АТБ маркет,Їжа
Ашан продукти,Їжа
Велмарт,Їжа
Кулиничі,Їжа
WOG АЗС,Транспорт
ОККО бензин,Транспорт
Метро Київ,Транспорт
Укрзалізниця квитки,Транспорт
Bolt поїздка,Транспорт
Кінотеатр Multiplex,Розваги
Netflix підписка,Розваги
Megogo,Розваги
Steam ігри,Розваги
Боулінг клуб,Розваги
Оплата Ясно,Комунальні
Київводоканал,Комунальні
Нафтогаз,Комунальні
ОСББ внесок,Комунальні
Укртелеком інтернет,Комунальні
Аванс ТОВ,Зарплата
Заробітна плата,Зарплата
ФОП дохід,Зарплата
Аптека АНЦ,Здоров'я
Аптека Доброго Дня,Здоров'я
Медичний центр Добробут,Здоров'я
Стоматологія,Здоров'я
Спортзал абонемент,Здоров'я
Нова Пошта,Інше
Розетка товари,Інше
Поповнення мобільного Київстар,Інше"""

with open('dataset.csv', 'w', encoding='utf-8') as f:
    f.write(csv_content)

df = pd.read_csv('dataset.csv')
texts = df['text'].astype(str).tolist()
categories = df['category'].astype(str).tolist()

unique_categories = sorted(list(set(categories)))
category_to_id = {cat: i for i, cat in enumerate(unique_categories)}
id_to_category = {i: cat for i, cat in enumerate(unique_categories)}

os.makedirs('ml_model', exist_ok=True)

with open('ml_model/category_dict.json', 'w', encoding='utf-8') as f:
    json.dump(id_to_category, f, ensure_ascii=False)

labels = [category_to_id[cat] for cat in categories]
labels_categorical = to_categorical(labels)

tokenizer = Tokenizer(num_words=1000, oov_token="<OOV>")
tokenizer.fit_on_texts(texts)

with open('ml_model/word_index.json', 'w', encoding='utf-8') as f:
    json.dump(tokenizer.word_index, f, ensure_ascii=False)

X_matrix = tokenizer.texts_to_matrix(texts, mode='binary')

inputs = tf.keras.Input(shape=(1000,), name="input_layer")
x = tf.keras.layers.Dense(32, activation='relu', name="dense_1")(inputs)
x = tf.keras.layers.Dropout(0.2, name="dropout_1")(x)
outputs = tf.keras.layers.Dense(len(unique_categories), activation='softmax', name="dense_2")(x)
model = tf.keras.Model(inputs=inputs, outputs=outputs, name="model_v1")

model.compile(loss='categorical_crossentropy', optimizer='adam', metrics=['accuracy'])
model.fit(X_matrix, labels_categorical, epochs=50, verbose=0)
print("Модель навчена!")

# Зберігаємо у форматі SavedModel а не .h5
model.export('saved_model')
!tensorflowjs_converter --input_format=tf_saved_model --output_format=tfjs_graph_model saved_model ml_model
print("Модель конвертована!")

import shutil
from google.colab import files
shutil.make_archive('ml_model', 'zip', 'ml_model')
files.download('ml_model.zip')
print("Архів скачується!")