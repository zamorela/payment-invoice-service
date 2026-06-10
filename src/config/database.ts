import mongoose from 'mongoose';

export async function connectMongo(uri: string): Promise<typeof mongoose> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
  });
  return mongoose;
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.connection.close();
}
