/** DI token for the active PaymentProvider implementation (see billing.module.ts). Swapping providers later means changing one `useClass` line here, nothing else. */
export const PAYMENT_PROVIDER = 'PAYMENT_PROVIDER';
