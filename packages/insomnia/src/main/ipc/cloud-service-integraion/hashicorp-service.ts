import crypto from 'crypto';
import { net } from 'electron';

import { INSOMNIA_FETCH_TIME_OUT } from '../../../common/constants';
import { type CloudProviderName, HashiCorpCrdentialType, HashiCorpVaultAuthMethod, type HCPCrdential, type VaultAppRoleCredential, type VaultTokenCredential } from '../../../models/cloud-credential';
import type { CloudServiceResult, HashiCorpSecretConfig, HashiCorpVaultKVV1SecretConfig, HashiCorpVaultKVV2SecretConfig, HCPSecretConfig, ICloudService } from './types';

export type HashiCorpCredentialType = HCPCrdential | VaultAppRoleCredential | VaultTokenCredential;
export interface AuthenticateResult {
  access_token: string;
  expires_at: number;
};
export interface HCPAccessTokenResponse {
  access_token: string;
  expires_in: number;
};
export interface HashiCorpOnPremTokenReponse {
  auth: {
    client_token: string;
    lease_duration: number;
  };
};
export interface HashiCorpVaultKVV1SecretValue {
  data: Record<string, any>;
}
export interface HashiCorpVaultKVV2SecretValue {
  data: {
    data: Record<string, any>;
    metadata: {
      version: string | number;
    };
  };
};
export interface HCPStaticSecretValue {
  value: any;
  version: string | number;
};
export interface HCPStaticSecretResultWithoutVersion {
  secret: {
    name: string;
    latest_version: string | number;
    static_version: HCPStaticSecretValue;
  };
};
export interface HCPStaticSecretResultWithVersion {
  static_version: HCPStaticSecretValue;
};
export type HashiCorpGetSecretValue = HashiCorpVaultKVV1SecretValue | HashiCorpVaultKVV2SecretValue | HCPStaticSecretValue;

const hcp_auth_url = 'https://auth.idp.hashicorp.com';
const hcp_api_url = 'https://api.cloud.hashicorp.com';
const hcp_api_version = '2023-11-28';
const neverExpireTokenTTL = 0;
export const providerName: CloudProviderName = 'hashicorp';
export class HashiCorpService implements ICloudService {
  _credential: HashiCorpCredentialType;

  constructor(credential: HashiCorpCredentialType) {
    this._credential = credential;
  }

  async _parseResponseError(response: Response) {
    const { type } = this._credential;
    const errorDetial = { errorMessage: '', errorCode: '' };
    try {
      const errorBody = await response.json();
      if (typeof errorBody === 'object') {
        if (type === HashiCorpCrdentialType.cloud) {
          const { message, details, error_description } = errorBody;
          let errorMessage = message as string;
          if (Array.isArray(details) && details.length > 0) {
            errorMessage = `${errorMessage} Details: ${details.join(' ')}`;
          }
          if (error_description) {
            errorMessage = error_description;
          }
          errorDetial.errorMessage = errorMessage || JSON.stringify(errorBody);
        } else {
          const { errors } = errorBody;
          if (errors && Array.isArray(errors)) {
            errorDetial.errorMessage = errors.length > 0 ? errors.join(',') : response.statusText;
          } else {
            errorDetial.errorMessage = JSON.stringify(errorBody);
          }
        }
      } else {
        errorDetial.errorMessage = errorBody.toString();
      }
    } catch (error) {
      errorDetial.errorMessage = error.toString() || response.statusText;
    };
    return {
      success: false,
      result: null,
      error: errorDetial,
    };
  }

  async authenticate(): Promise<CloudServiceResult<AuthenticateResult>> {
    const { type } = this._credential;
    const timeNow = Date.now();
    try {
      if (type === HashiCorpCrdentialType.cloud) {
        // todo cloud auth
      } else {
        const { authMethod, serverAddress } = this._credential;
        const finalUrl = serverAddress.endsWith('/') ? serverAddress.substring(0, serverAddress.length - 1) : serverAddress;
        if (authMethod === HashiCorpVaultAuthMethod.appRole) {
          const { role_id, secret_id } = this._credential;
          const requestConfig: RequestInit = {
            method: 'POST',
            body: JSON.stringify({
              role_id, secret_id,
            }),
            headers: {
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(INSOMNIA_FETCH_TIME_OUT),
          };
          // authenticate to on-prem deployement with app role
          const authResponse = await net.fetch(`${finalUrl}/v1/auth/approle/login`, requestConfig);
          if (authResponse.ok) {
            const authResponseBody = await authResponse.json() as HashiCorpOnPremTokenReponse;
            const { auth } = authResponseBody;
            const { client_token, lease_duration } = auth;
            return {
              success: true,
              result: {
                access_token: client_token,
                expires_at: timeNow + lease_duration * 1000,
              },
            };
          } else {
            const errorResult = await this._parseResponseError(authResponse);
            return errorResult;
          }
        } else if (authMethod === HashiCorpVaultAuthMethod.token) {
          const { access_token } = this._credential;
          const requestConfig: RequestInit = {
            method: 'GET',
            headers: {
              'X-Vault-Token': access_token,
            },
            signal: AbortSignal.timeout(INSOMNIA_FETCH_TIME_OUT),
          };
          // authenticate to on-prem deployement with token
          const authResponse = await net.fetch(`${finalUrl}/v1/auth/token/lookup-self`, requestConfig);
          if (authResponse.ok) {
            const authResponseBody = await authResponse.json();
            const { data } = authResponseBody as { data: { ttl: number } };
            const { ttl } = data;
            return {
              success: true,
              result: {
                access_token,
                // ttl 0 means the token never expires like root token
                expires_at: ttl === neverExpireTokenTTL ? neverExpireTokenTTL : timeNow + ttl * 1000,
              },
            };
          } else {
            const errorResult = await this._parseResponseError(authResponse);
            return errorResult;
          }
        } else {
          return {
            success: false,
            result: null,
            error: { errorMessage: `Invalid type ${type} with authMethod ${authMethod} for HashiCorp`, errorCode: '' },
          };
        }
      };
    } catch (error) {
      return {
        success: false,
        result: null,
        error: { errorMessage: error.toString(), errorCode: '' },
      };
    }
  };

  getUniqueCacheKey(secretName: string, config?: HashiCorpSecretConfig) {
    const defaultUniqueKeyHash = crypto.createHash('md5').update(secretName).digest('hex');
    if (!config) {
      return defaultUniqueKeyHash;
    }
    const { type } = this._credential;
    if (type === HashiCorpCrdentialType.cloud) {
      const { type, organizationId, projectId, appName, version } = config as HCPSecretConfig;
      const uniqueKey = `${providerName}:${organizationId}:${projectId}:${appName}:${type}:${secretName}:${version || 'latest'}`;
      const uniqueKeyHash = crypto.createHash('md5').update(uniqueKey).digest('hex');
      return uniqueKeyHash;
    } else {
      const { kvVersion, secretEnginePath } = config as HashiCorpVaultKVV1SecretConfig | HashiCorpVaultKVV2SecretConfig;
      switch (kvVersion) {
        case 'v1':
          const uniqueKeyV1 = `${providerName}:${secretEnginePath}:${secretName}`;
          const uniqueKeyHashV1 = crypto.createHash('md5').update(uniqueKeyV1).digest('hex');
          return uniqueKeyHashV1;
        case 'v2':
          const { version } = config as HashiCorpVaultKVV2SecretConfig;
          const uniqueKeyV2 = `${providerName}:${secretEnginePath}:${secretName}:${version || 'latest'}`;
          const uniqueKeyHashV2 = crypto.createHash('md5').update(uniqueKeyV2).digest('hex');
          return uniqueKeyHashV2;
        default:
          return defaultUniqueKeyHash;
      }
    }
  };

  async getSecret(secretName: string, config: HashiCorpSecretConfig): Promise<CloudServiceResult<HashiCorpGetSecretValue>> {
    const { type, access_token } = this._credential;
    try {
      if (type === HashiCorpCrdentialType.onPrem) {
        // on-prem vault
        const { serverAddress } = this._credential;
        const finalUrl = serverAddress.endsWith('/') ? serverAddress.substring(0, serverAddress.length - 1) : serverAddress;
        const { kvVersion, secretEnginePath } = config as HashiCorpVaultKVV1SecretConfig | HashiCorpVaultKVV2SecretConfig;
        if (kvVersion === 'v1') {
        } else {
          // kv version v2
          const { version } = config as HashiCorpVaultKVV2SecretConfig;
          let v2Url = `${finalUrl}/v1/${secretEnginePath}/data/${secretName}`;
          if (version) {
            // add version url params
            const urlObj = new URL(v2Url);
            urlObj.searchParams.append('version', version.toString());
            v2Url = urlObj.toString();
          }
          const requestConfig: RequestInit = {
            method: 'GET',
            headers: {
              'X-Vault-Token': access_token!,
            },
            signal: AbortSignal.timeout(INSOMNIA_FETCH_TIME_OUT),
          };
          const secretResponse = await net.fetch(v2Url, requestConfig);
          if (secretResponse.ok) {
            const secretResponseBody = await secretResponse.json() as HashiCorpVaultKVV2SecretValue;
            return {
              success: true,
              result: secretResponseBody,
            };
          } else {
            const errorResult = await this._parseResponseError(secretResponse);
            return errorResult;
          }
        }
      } else {
        // cloud vault
      }
    } catch (error) {
      return {
        success: false,
        result: null,
        error: { errorMessage: error.toString(), errorCode: '' },
      };
    };
  }
};
