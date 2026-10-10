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

/**
 * Where the full-stack suite finds each service. Defaults match docker-compose.e2e.yml; CI and
 * local runs can override them.
 */
export const FINERACT_API_URL =
  process.env.FINERACT_API_URL ?? 'http://localhost:8888/fineract-provider/api/v1/';
export const FINERACT_USERNAME = process.env.FINERACT_USERNAME ?? 'mifos';
export const FINERACT_PASSWORD = process.env.FINERACT_PASSWORD ?? 'password';
export const FINERACT_TENANT = process.env.FINERACT_TENANT ?? 'default';
export const MAILPIT_URL = process.env.MAILPIT_URL ?? 'http://localhost:8025';
