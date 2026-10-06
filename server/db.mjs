import { MongoClient, ServerApiVersion } from 'mongodb';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'linear';

let clientPromise;
let indexesPromise;

export function configured() {
  return Boolean(uri);
}

export async function database() {
  if (!uri) throw new Error('DB_NOT_CONFIGURED');
  if (!clientPromise) {
    const client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
      maxPoolSize: 10,
    });
    clientPromise = client.connect();
  }
  const client = await clientPromise;
  const db = client.db(dbName);
  if (!indexesPromise) {
    indexesPromise = Promise.all([
      db.collection(collections.leads).createIndex({ updatedAt: -1 }),
      db.collection(collections.leads).createIndex({ stage: 1, nextContact: 1 }),
      db.collection(collections.activities).createIndex({ leadId: 1, createdAt: -1 }),
      db.collection(collections.events).createIndex({ name: 1, createdAt: -1 }),
      db.collection(collections.events).createIndex({ sessionId: 1, createdAt: -1 }),
    ]);
  }
  await indexesPromise;
  return db;
}

export const collections = {
  leads: 'linear_leads',
  activities: 'linear_activities',
  audit: 'linear_audit_log',
  events: 'linear_smoke_events',
};

export const leadFromDoc = (doc) => ({
  id: String(doc._id),
  company: doc.company,
  contact: doc.contact || '',
  email: doc.email || '',
  phone: doc.phone || '',
  stage: doc.stage,
  valueCents: Number(doc.valueCents || 0),
  source: doc.source || '',
  nextAction: doc.nextAction || '',
  nextContact: doc.nextContact || '',
  notes: doc.notes || '',
  createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt || ''),
  updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt || ''),
});

export const activityFromDoc = (doc) => ({
  id: String(doc._id),
  leadId: String(doc.leadId),
  text: doc.text,
  createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt || ''),
});
