# Payment Invoice Service

Небольшой сервис приёма платежей: мерчант создаёт счёт (invoice), платёжная
система присылает webhook со статусом оплаты. Особое внимание — корректности
денежных расчётов, проверке подписи, защите от повторных запросов и
устойчивости к конкурентным запросам.

## Стек

- **Node.js + Express** (+ helmet) — HTTP API
- **MongoDB (Mongoose)** — хранение счетов и мерчантов; транзакции для зачисления
- **Redis (ioredis)** — атомарный учёт nonce (anti-replay)
- **TypeScript** — типобезопасность денежных операций
- **Jest + Supertest + mongodb-memory-server + ioredis-mock** — тесты

## Архитектура

```
src/
  config/      env (zod-валидация), подключения Mongo и Redis
  models/      Merchant, Invoice
  utils/       money (целочисленная арифметика), errors, async-handler
  invoice/     schemas → controller → service → presenter → routes
  webhook/     signature, nonce.service, middleware (HMAC/ts/nonce), service, routes
  middlewares/ error-handler
  scripts/     seed, sign-webhook (утилиты для ручной проверки)
  app.ts       сборка Express
  server.ts    bootstrap + graceful shutdown
tests/         unit (money, signature) + integration (invoice, webhook)
```

Поток: `routes → middleware (валидация/подпись) → controller → service → model`.
Контроллеры тонкие, вся бизнес-логика — в сервисах.

## Запуск

Требуются запущенные **MongoDB (как replica set)** и Redis. Replica set нужен
для транзакций при зачислении (см. «Ключевые решения»). Локально достаточно
одного узла:

```bash
# запустить mongod как replica set
mongod --replSet rs0 --dbpath /tmp/payments-db
# один раз инициализировать (в другом терминале)
mongosh --eval 'rs.initiate()'
```

В managed-окружениях (например, MongoDB Atlas) replica set включён по умолчанию.

```bash
# 1. Зависимости
npm install

# 2. Конфигурация
cp .env.example .env  

# 3. Тестовый мерчант (печатает merchantId)
npm run seed

# 4. Запуск в dev-режиме (hot reload)
npm run dev
# или прод-сборка
npm run build && npm start
```

Проверка здоровья: `GET /health` → `{ "status": "ok" }`.

### Быстрая ручная проверка (без curl)

В **двух терминалах**:

```bash
# Терминал 1 — сервер
npm run dev

# Терминал 2 — полный сценарий одной командой
npm run demo
```

`demo` сам: создаёт мерчанта → счёт → webhook paid → проверяет статус → повтор webhook.

Отдельно отправить webhook по уже существующему счёту:

```bash
npm run webhook -- <invoiceId> paid
# или
npm run webhook -- <invoiceId> failed
```

Скрипт **сразу отправляет** запрос и печатает JSON-ответ — curl копировать не нужно.

### Переменные окружения

| Переменная                  | Назначение                                            | Дефолт |
| --------------------------- | ----------------------------------------------------- | ------ |
| `PORT`                      | Порт HTTP                                              | `3000` |
| `MONGO_URI`                 | Строка подключения MongoDB                             | —      |
| `REDIS_URL`                 | Строка подключения Redis                               | —      |
| `WEBHOOK_SECRET`            | Секрет для HMAC-SHA256 подписи webhook (≥ 16 символов) | —      |
| `WEBHOOK_TOLERANCE_SECONDS` | Окно актуальности timestamp (в секундах); TTL nonce = ×2 | `300`  |

## Тесты

```bash
npm test
```

> Тестам нужен реальный `mongod` (его поднимает `mongodb-memory-server`,
> при первом запуске бинарь скачивается автоматически). Redis в тестах
> подменяется на `ioredis-mock`, внешний Redis не требуется.

Покрытие ключевых требований ТЗ:

- **расчёт комиссии** с округлением (`tests/unit/money.test.ts`);
- **проверка подписи** (валид/неверный секрет/изменённое тело/мусор) — `signature.test.ts`, `webhook.test.ts`;
- **протухший timestamp** → 401; **подмена тела** → 401; **нет заголовка** → 400;
- **идемпотентность webhook**: повторная доставка (тот же nonce → 409; новый nonce → зачисление не повторяется);
- **конкурентность**: 10 параллельных webhook → зачисление ровно один раз;
- **атомарность транзакции**: при сбое зачисления смена статуса откатывается;
- **failed финален**: последующий paid не применяется;
- **404** на webhook для несуществующего счёта; **граница `amount`** → 400.

## API

### `POST /invoice` — создание счёта

Запрос:

```json
{ "amount": 10000, "currency": "USD", "merchantId": "<id>" }
```

Ответ `201`:

```json
{
  "invoiceId": "...",
  "merchantId": "...",
  "amount": 10000,
  "currency": "USD",
  "fee": 250,
  "amountToReceive": 9750,
  "status": "pending",
  "settledAt": null,
  "createdAt": "..."
}
```

### `GET /invoice/:id` — текущий статус счёта

Ответ `200` — тот же формат, что и при создании.

### `POST /webhook` — приём статуса оплаты

Заголовки:

- `X-Signature` — HMAC-SHA256 (hex) от строки `"{timestamp}.{nonce}.{rawBody}"`
- `X-Timestamp` — unix-время (секунды)
- `X-Nonce` — уникальное значение запроса

Тело: `{ "invoiceId": "...", "status": "paid" | "failed" }`

Ответ `200`: `{ "received": true, "applied": <bool>, "invoice": {...} }`,
где `applied=true` означает, что именно этот запрос перевёл счёт в финальный статус.

Готовую подписанную команду curl можно сгенерировать:

```bash
npm run webhook -- <invoiceId> paid
```

## Ключевые инженерные решения

### 1. Деньги — целые минорные единицы

Все суммы (`amount`, `fee`, `amountToReceive`, `balance`) хранятся и передаются
как **целые числа в минорных единицах** (копейки/центы). Это полностью исключает
ошибки округления `float`.

Комиссия мерчанта хранится в **базисных пунктах** (`feeBps`, integer): `1 bps = 0.01%`,
т.е. `feePercent% = feeBps / 100` (2.5% → 250). Тогда
`fee = round(amount × feeBps / 10000)` считается **исключительно в целочисленной
(BigInt) арифметике** с округлением «половина вверх», без float. См. `src/utils/money.ts`.

Политика округления — **round half up** в пользу платформы: дробная часть копейки
оседает как комиссия (мерчант получает на ≤ 1 минорную единицу меньше). `amount`
ограничен `Number.MAX_SAFE_INTEGER`, чтобы все суммы точно представлялись целыми.

### 2. Безопасность webhook (anti-replay)

- **Подпись**: HMAC-SHA256 от `"{timestamp}.{nonce}.{rawBody}"` — в подпись входят
  и заголовки, и сырое тело, поэтому подмена любого из них инвалидирует подпись.
  Сравнение через `crypto.timingSafeEqual` (защита от timing-атак).
- **Timestamp**: запрос валиден только в окне `±WEBHOOK_TOLERANCE_SECONDS`.
- **Nonce**: атомарный резерв в Redis через `SET key NX EX ttl` — один nonce
  принимается ровно один раз; повтор → `409 REPLAY_DETECTED`. TTL nonce =
  `2 × tolerance`: окно валидности timestamp двустороннее (ширина `2×tolerance`),
  поэтому nonce живёт столько же — иначе на границе окна возможен повтор.

Порядок в middleware важен: подпись → валидация тела → резерв nonce. Nonce
резервируется **только после** успешной проверки подписи (чтобы неаутентифи-
цированный запрос не «сжигал» чужие nonce) и **после** валидации тела (чтобы
структурно некорректный запрос не блокировал легитимный повтор). Дополнительно
включён `helmet` и лимит размера тела (16 КБ).

### 3. Зачисление ровно один раз + конкурентность

Финализация статуса и зачисление баланса выполняются **в одной MongoDB-транзакции**:

```ts
await session.withTransaction(async () => {
  const updated = await InvoiceModel.findOneAndUpdate(
    { _id, status: 'pending' },
    { $set: { status, settledAt } },
    { new: true, session },
  );
  if (updated && status === 'paid') {
    await MerchantModel.updateOne(
      { _id: updated.merchantId },
      { $inc: { balance: updated.amountToReceive } },
      { session },
    );
  }
  // ...
});
```

Две независимые гарантии:

1. **Exactly-once.** Условие `status: 'pending'` в `findOneAndUpdate` — это
   compare-and-swap: среди любого числа конкурентных/повторных webhook переход
   `pending → paid|failed` «выигрывает» ровно один запрос. Остальные получают
   `applied: false` и баланс не двигают.
2. **Атомарность.** Смена статуса и `$inc` баланса коммитятся **вместе**.
   Невозможно состояние «счёт paid, но деньги не зачислены» (или наоборот): при
   любом сбое транзакция откатывается целиком. Именно поэтому требуется replica set.

## Принятые допущения

- **`amount` передаётся в минорных единицах** (целое > 0). Это снимает любую
  неоднозначность с парсингом десятичных дробей на входе. Конвертацию из
  «человеческих» сумм при желании делает клиент/шлюз.
- **Комиссия — атрибут мерчанта** (`feeBps`), берётся из его настроек, как в ТЗ.
  Мерчанты считаются заранее существующими; создан `seed`-скрипт.
- **Валюта** валидируется как 3-буквенный ISO-4217 код; кросс-курсовые операции
  и мультивалютные комиссии вне объёма задания.
- **Баланс мерчанта** используется как простая модель «зачисления» (заглушка
  вместо реальной платёжной системы), пополняется на `amountToReceive`.
- Аутентификация пользователей, Docker/CI/CD и реальная интеграция с PSP —
  вне объёма по условию.

## Что доделал бы при наличии времени

- Подписанный/устойчивый **ledger** проводок (double-entry) вместо инкремента
  поля `balance` — для полноценного аудита движения средств.
- **Идемпотентность ответа** для повторов: возвращать исходный результат, а не
  просто `applied: false`.
- **Rate limiting** (с общим хранилищем для нескольких инстансов),
  структурированное логирование (pino) с correlation-id, OpenAPI-спека.

