import { Types } from 'mongoose';
import { IdGenerator } from '../../application/ports/id-generator';

/** Генерирует MongoDB-совместимые ObjectId (деталь инфраструктуры). */
export class MongoIdGenerator implements IdGenerator {
  generate(): string {
    return new Types.ObjectId().toString();
  }
}
