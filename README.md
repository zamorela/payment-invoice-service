# Payment Invoice Service

Небольшой сервис для приёма платежей: мерчант создаёт счёт, платёжная система
шлёт webhook со статусом оплаты. Основной упор — на деньги (без ошибок округления),
безопасность webhook и то, чтобы при повторных или одновременных запросах
зачисление происходило ровно один раз.

## Стек

- **Node.js + Express** (+ helmet)
- **MongoDB (Mongoose)** — счета и мерчанты
- **Redis (ioredis)** — защита от повторных webhook (nonce)
- **TypeScript**
- **Jest + Supertest** — тесты

## Архитектура

Проект построен по **Clean Architecture / DDD**: зависимости направлены только
внутрь (Dependency Rule), домен ничего не знает про Express, Mongoose и Redis.

```
src/
  domain/          ядро. Сущности и value objects, БЕЗ внешних зависимостей
    shared/        Money, Currency, доменные ошибки
    invoice/       агрегат Invoice, FeePolicy, порт InvoiceRepository
    merchant/      Merchant, порт MerchantRepository
  application/     use cases (бизнес-сценарии) и порты инфраструктуры
    invoice/       CreateInvoice, GetInvoice
    webhook/       ProcessWebhook
    ports/         NonceStore, UnitOfWork
  infrastructure/  реализации портов (детали)
    persistence/   Mongoose-схемы, мапперы, репозитории, Unit of Work
    redis/         RedisNonceStore
    config/        env, подключения Mongo и Redis
  interfaces/      входной слой
    http/          контроллеры, роуты, middleware, DTO, подпись, обработчик ошибок
  composition-root.ts   единственное место сборки зависимостей (ручной DI)
  server.ts        bootstrap
tests/             unit (домен, подпись) + integration (HTTP)
```

Поток запроса: `http (interface) → use case (application) → entity + repository port
(domain) → mongoose/redis adapter (infrastructure)`.

Ключевые приёмы:

- **Сущности с поведением.** `Invoice.markPaid()` инкапсулирует инвариант
  (переход только из `pending`), а не «анемичная» модель.
- **Value objects.** Деньги — это `Money` (целые минорные единицы + валюта),
  а не «голый» `number`; нельзя случайно сложить разные валюты.
- **Порты и адаптеры.** Use cases зависят от интерфейсов (`InvoiceRepository`,
  `NonceStore`, `UnitOfWork`), реализации Mongoose/Redis подключаются снаружи.
- **Domain service.** `SettlementService` координирует финализацию счёта и
  зачисление мерчанту; use case только управляет транзакцией.
- **Composition root + DI.** Use cases связываются в одной точке без HTTP;
  wiring middleware — в `server.ts`. Зависимости слоёв проверяются
  `npm run lint:deps` (dependency-cruiser).

> Это **Clean Architecture + DDD** для сервиса такого размера: слои разделены,
> зависимости проверяются (`npm run lint:deps`), id генерируется через порт
> `IdGenerator`, settlement — через доменный `SettlementService`, мерчант
> зачисляет через `credit()`. Composition root не знает про HTTP; scripts
> используют use cases, как и API.

## Как запустить

Нужны **MongoDB (как replica set)** и **Redis**. Replica set нужен для
транзакций при зачислении денег — подробнее ниже в разделе «Как устроено».

Локально хватит одного узла:

```bash
# MongoDB как replica set
mongod --replSet rs0 --dbpath /tmp/payments-db
# один раз 
mongosh --eval 'rs.initiate()'
```

На Atlas и других managed-сервисах replica set уже включён.

```bash
npm install
cp .env.example .env
npm run seed          # создаст тестового мерчанта, выведет merchantId
npm run dev           # dev-режим
# или
npm run build && npm start
```

Healthcheck: `GET /health` → `{ "status": "ok" }`.

### Быстрая проверка руками

В двух терминалах:

```bash
# Терминал 1
npm run dev

# Терминал 2 — прогонит весь сценарий сам
npm run demo
```

`demo` создаст мерчанта, счёт, отправит webhook paid, проверит статус и
отправит повторный webhook (должен вернуть `applied: false`).

Отправить webhook по готовому счёту:

```bash
npm run webhook -- <invoiceId> paid
npm run webhook -- <invoiceId> failed
```

### Переменные окружения

| Переменная                  | Что это                          | По умолчанию |
| --------------------------- | -------------------------------- | ------------ |
| `PORT`                      | Порт сервера                     | `3000`       |
| `MONGO_URI`                 | Строка подключения к MongoDB     | —            |
| `REDIS_URL`                 | Строка подключения к Redis       | —            |
| `WEBHOOK_SECRET`            | Секрет для подписи webhook (≥16) | —            |
| `WEBHOOK_TOLERANCE_SECONDS` | Окно времени для timestamp; TTL nonce = ×2 | `300` |

## Тесты

```bash
npm test
```

MongoDB поднимается автоматически через `mongodb-memory-server` (при первом
запуске скачает бинарь). Redis заменяется на mock — отдельно ставить не нужно.

Что покрыто:

- расчёт комиссии и округление;
- проверка подписи (валидная, неверный секрет, изменённое тело);
- протухший timestamp, подмена тела, отсутствие заголовка;
- идемпотентность: тот же nonce → 409, новый nonce → деньги не зачисляются повторно;
- 10 параллельных webhook → зачисление один раз;
- откат транзакции при сбое зачисления;
- `failed` нельзя перезаписать на `paid`;
- 404 на несуществующий счёт, валидация `amount`.

## API

### `POST /invoice` — создать счёт

```json
{ "amount": 10000, "currency": "USD", "merchantId": "<id>" }
```

`amount` — в копейках/центах (целое число). Комиссия считается автоматически
из настроек мерчанта.

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

### `GET /invoice/:id` — статус счёта

Тот же формат, что при создании.

### `POST /webhook` — статус оплаты от платёжной системы

Заголовки:

- `X-Signature` — HMAC-SHA256 от `"{timestamp}.{nonce}.{rawBody}"`
- `X-Timestamp` — unix-время в секундах
- `X-Nonce` — уникальный id запроса

Тело: `{ "invoiceId": "...", "status": "paid" | "failed" }`

Ответ `200`: `{ "received": true, "applied": true/false, "invoice": {...} }`

`applied: true` — именно этот запрос перевёл счёт в финальный статус.

## Как устроено

### Деньги

Деньги — это value object `Money` (целые минорные единицы + валюта), а не
«голый» `number`: нельзя потерять точность на float или случайно смешать валюты.

Комиссия — value object `FeePolicy` в базисных пунктах (`feeBps`): 2.5% = 250 bps.
Формула: `fee = round(amount × feeBps / 10000)`, считается через BigInt, округление
«половина вверх» в пользу платформы. `amount` ограничен `Number.MAX_SAFE_INTEGER`.

### Безопасность webhook

1. Проверяем подпись HMAC-SHA256 (сравнение через `timingSafeEqual`).
2. Проверяем, что timestamp не слишком старый/новый.
3. Резервируем nonce в Redis — один nonce принимается один раз, повтор → 409.

Nonce резервируется только после проверки подписи и валидации тела, чтобы
мусорные запросы не «сжигали» чужие nonce. TTL nonce = `2 × tolerance`, потому
что окно времени двустороннее.

Также стоят `helmet` и лимит тела 16 КБ.

### Зачисление ровно один раз

Переход в финальный статус — это инвариант агрегата `Invoice` (только из
`pending`). Сохранение использует **оптимистичную блокировку по `version`**:
среди параллельных webhook «выигрывает» ровно один, остальные получают конфликт
записи, транзакция откатывается и при повторном чтении счёт уже не `pending` →
`applied: false`.

Смена статуса и пополнение баланса мерчанта идут **в одной транзакции**
(`UnitOfWork`). Если упало посередине — откатывается всё, состояния «paid, но
баланс не пополнен» не существует. Поэтому нужен replica set.

## Допущения

- `amount` приходит в минорных единицах (копейки/центы), целое число > 0.
- Комиссия берётся из настроек мерчанта (`feeBps`), как в ТЗ.
- Мерчанты уже существуют — для тестов есть `npm run seed`.
- Валюта — 3-буквенный код (USD, EUR и т.д.), без кросс-курса.
- `balance` мерчанта — простая заглушка зачисления вместо реальной PSP.
- Аутентификация, Docker, CI/CD — вне объёма задания.

## Доработки для production

Для тестового всё закрыто. В prod я бы добавил:

- **Ledger** (double-entry) вместо `$inc` на поле `balance` — нормальный аудит.
- **Идемпотентные ответы** на повтор webhook — возвращать тот же результат.
- **DI-контейнер** вместо ручного composition root, если число зависимостей вырастет.
- **Rate limiting**, структурные логи (pino), OpenAPI-спека.
