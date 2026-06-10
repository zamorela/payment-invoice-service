import { sendSignedWebhook } from './webhook-client';

/**
 * Отправляет подписанный webhook на локальный сервер.
 * Использование: npm run webhook -- <invoiceId> <paid|failed>
 */
async function main(): Promise<void> {
  const [invoiceId, statusArg = 'paid'] = process.argv.slice(2);
  if (!invoiceId) {
    // eslint-disable-next-line no-console
    console.error('Usage: npm run webhook -- <invoiceId> <paid|failed>');
    process.exit(1);
  }
  if (statusArg !== 'paid' && statusArg !== 'failed') {
    // eslint-disable-next-line no-console
    console.error('Status must be "paid" or "failed"');
    process.exit(1);
  }

  const { status, body } = await sendSignedWebhook(invoiceId, statusArg);
  // eslint-disable-next-line no-console
  console.log(`HTTP ${status}`);
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(body, null, 2));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to send webhook:', err.message ?? err);
  process.exit(1);
});
