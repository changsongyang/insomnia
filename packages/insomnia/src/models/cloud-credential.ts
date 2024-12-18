import type { AuthenticationResult as AzureOAuthCredential } from '@azure/msal-node';

import { database as db } from '../common/database';
import type { BaseModel } from './index';

export type CloudProviderName = 'aws' | 'azure' | 'gcp' | 'hashicorp';
export enum AWSCredentialType {
  temp = 'temporary'
}
export interface AWSTemporaryCredential {
  type: AWSCredentialType.temp;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  region: string;
}
interface IBaseCloudCredential {
  name: string;
  provider: CloudProviderName;
}
export interface AWSCloudCredential extends IBaseCloudCredential {
  provider: 'aws';
  credentials: AWSTemporaryCredential;
}
export interface AzureCloudCredential extends IBaseCloudCredential {
  provider: 'azure';
  credentials: AzureOAuthCredential;
}
export interface GCPCloudCredential extends IBaseCloudCredential {
  provider: 'gcp';
  credentials: string;
}
export interface HashiCorpBaseCredential {
  access_token?: string;
  expires_at?: number;
}
export enum HashiCorpCrdentialType {
  cloud = 'cloud',
  onPrem = 'onPrem',
};
export enum HashiCorpVaultAuthMethod {
  token = 'token',
  appRole = 'appRole',
}
export interface HCPCrdential extends HashiCorpBaseCredential {
  client_id: string;
  client_secret: string;
  type: HashiCorpCrdentialType.cloud;
};
export interface VaultAppRoleCredential extends HashiCorpBaseCredential {
  role_id: string;
  secret_id: string;
  authMethod: HashiCorpVaultAuthMethod.appRole;
  type: HashiCorpCrdentialType.onPrem;
  serverAddress: string;
}
export interface VaultTokenCredential extends HashiCorpBaseCredential {
  authMethod: HashiCorpVaultAuthMethod.token;
  access_token: string;
  type: HashiCorpCrdentialType.onPrem;
  serverAddress: string;
}
export type HashiCorpCredentialsType = HCPCrdential | VaultAppRoleCredential | VaultTokenCredential;
export interface HashiCorpCredential extends IBaseCloudCredential {
  provider: 'hashicorp';
  credentials: HashiCorpCredentialsType;
}
export type BaseCloudCredential = AWSCloudCredential | AzureCloudCredential | GCPCloudCredential | HashiCorpCredential;
export type CloudProviderCredential = BaseModel & BaseCloudCredential;

export const name = 'Cloud Credential';
export const type = 'CloudCredential';
export const prefix = 'cloudCred';
export const canDuplicate = false;
export const canSync = false;

export const isCloudCredential = (model: Pick<BaseModel, 'type'>): model is CloudProviderCredential => (
  model.type === type
);

export function getProviderDisplayName(provider: CloudProviderName) {
  switch (provider) {
    case 'aws':
      return 'AWS';
    case 'azure':
      return 'Azure';
    case 'gcp':
      return 'GCP';
    case 'hashicorp':
      return 'HashiCorp';
    default:
      return '';
  }
};

export function init(): Partial<BaseCloudCredential> {
  return {
    name: '',
    provider: undefined,
    credentials: undefined,
  };
}

export function migrate(doc: BaseCloudCredential) {
  return doc;
}

export function create(patch: Partial<CloudProviderCredential> = {}) {
  return db.docCreate<CloudProviderCredential>(type, patch);
}

export async function getById(id: string) {
  return db.getWhere<CloudProviderCredential>(type, { _id: id });
}

export function update(credential: CloudProviderCredential, patch: Partial<CloudProviderCredential>) {
  return db.docUpdate<CloudProviderCredential>(credential, patch);
}

export function remove(credential: CloudProviderCredential) {
  return db.remove(credential);
}

export function getByName(name: string, provider: CloudProviderName) {
  return db.find<CloudProviderCredential>(type, { name, provider });
}

export function all() {
  return db.all<CloudProviderCredential>(type);
}
