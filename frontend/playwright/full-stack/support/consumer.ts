/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Page, expect, test as base } from '@playwright/test';
import { DOCUMENT_TYPE, Fineract, SeededAccount, SeededClient } from './fineract';
import { fill, select, submitOtp } from './ionic';
import { Mailpit } from './mailpit';

/** Meets the BFF's policy: 15–64 characters with upper, lower, digit and special character. */
export const PASSWORD = 'Playwright-e2e-Passw0rd!';
export const OPENING_DEPOSIT = 5000;

/** A consumer as staff would have set them up in Fineract, before they self-register. */
export interface Consumer extends SeededClient {
  email: string;
  password: string;
  savings: SeededAccount;
  secondSavings: SeededAccount;
  loan: SeededAccount;
}

const uid = () => Math.random().toString(36).slice(2, 10);

/** Seeds a Fineract client with two savings accounts (one funded) and an active loan. */
export async function seedConsumer(fineract: Fineract): Promise<Consumer> {
  const client = await fineract.createClient();
  const savings = await fineract.openSavings(client.clientId, OPENING_DEPOSIT);
  const secondSavings = await fineract.openSavings(client.clientId);
  const loan = await fineract.disburseLoan(client.clientId);
  return {
    ...client,
    email: `consumer-${uid()}@e2e.test`,
    password: PASSWORD,
    savings,
    secondSavings,
    loan,
  };
}

/** Self-registration through the wizard: identity, then the emailed OTP. */
export async function registerViaUi(page: Page, mailpit: Mailpit, consumer: Consumer) {
  await mailpit.clear(consumer.email);
  await page.goto('/register');
  await fill(page, 'fineractClientId', consumer.clientId);
  await fill(page, 'email', consumer.email);
  await fill(page, 'password', consumer.password);
  await select(page, 'documentTypeName', DOCUMENT_TYPE);
  await fill(page, 'documentKey', consumer.documentKey);
  await page.getByRole('button', { name: 'Continue' }).click();
  await submitOtp(page, await mailpit.otpFor(consumer.email));
  await expect(page.getByText('Your account is created.')).toBeVisible();
}

/** Another bank customer, not registered for self-service, to pay as a beneficiary. */
export async function seedPayee(fineract: Fineract) {
  const client = await fineract.createClient();
  const savings = await fineract.openSavings(client.clientId);
  return { ...client, savings };
}

/** Adds a beneficiary through the two-step form, confirming with the emailed OTP. */
export async function addBeneficiaryViaUi(
  page: Page,
  mailpit: Mailpit,
  consumer: Consumer,
  beneficiary: { name: string; officeName: string; accountNumber: string; transferLimit?: number },
) {
  await page.goto('/beneficiaries');
  await page.getByRole('button', { name: 'Add beneficiary' }).click();
  await fill(page, 'name', beneficiary.name);
  await fill(page, 'officeName', beneficiary.officeName);
  await fill(page, 'accountNumber', beneficiary.accountNumber);
  if (beneficiary.transferLimit) {
    await fill(page, 'transferLimit', beneficiary.transferLimit);
  }
  await mailpit.clear(consumer.email);
  await page.getByRole('button', { name: 'Continue' }).click();
  await submitOtp(page, await mailpit.otpFor(consumer.email));
  await expect(
    page.locator('ion-toast').filter({ hasText: 'Beneficiary added.' }).last(),
  ).toBeVisible();
}

/** Sign-in with password and the emailed second factor. Lands on the summary. */
export async function loginViaUi(page: Page, mailpit: Mailpit, email: string, password: string) {
  await mailpit.clear(email);
  await page.goto('/login');
  await fill(page, 'email', email);
  await fill(page, 'password', password);
  await page.getByRole('button', { name: 'Continue' }).click();
  await submitOtp(page, await mailpit.otpFor(email));
  await expect(page).toHaveURL(/\/summary$/);
  await expect(page.getByRole('heading', { name: 'Account Summary' })).toBeVisible();
}

interface Fixtures {
  /** A consumer seeded in Fineract and registered, but not signed in. */
  registered: Consumer;
  /** A consumer seeded, registered and signed in on `page`. */
  signedIn: Consumer;
}

interface WorkerFixtures {
  fineract: Fineract;
  mailpit: Mailpit;
}

export const test = base.extend<Fixtures, WorkerFixtures>({
  fineract: [
    async ({}, use) => {
      const fineract = await Fineract.connect();
      await use(fineract);
      await fineract.dispose();
    },
    { scope: 'worker' },
  ],
  mailpit: [
    async ({}, use) => {
      const mailpit = await Mailpit.connect();
      await use(mailpit);
      await mailpit.dispose();
    },
    { scope: 'worker' },
  ],
  registered: async ({ page, fineract, mailpit }, use) => {
    const consumer = await seedConsumer(fineract);
    await registerViaUi(page, mailpit, consumer);
    await use(consumer);
  },
  signedIn: async ({ page, mailpit, registered }, use) => {
    await loginViaUi(page, mailpit, registered.email, registered.password);
    await use(registered);
  },
});

export { expect };
