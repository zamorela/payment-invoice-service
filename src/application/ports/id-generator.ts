/** Порт генерации идентификаторов. Домен и репозитории не привязаны к Mongo ObjectId. */
export interface IdGenerator {
  generate(): string;
}
