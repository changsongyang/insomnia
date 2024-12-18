import type { AWSGetSecretConfig } from '../../../main/ipc/cloud-service-integraion/aws-service';
import type { CloudServiceSecretOption } from '../../../main/ipc/cloud-service-integraion/cloud-service';
import type { GCPGetSecretConfig } from '../../../main/ipc/cloud-service-integraion/gcp-servcie';
import type { HashiCorpVaultKVV1SecretValue, HashiCorpVaultKVV2SecretValue, HCPStaticSecretValue } from '../../../main/ipc/cloud-service-integraion/hashicorp-service';
import type { AWSSecretConfig, AzureSecretConfig, ExternalVaultConfig, GCPSecretConfig, HashiCorpSecretConfig, HashiCorpVaultKVV1SecretConfig, HashiCorpVaultKVV2SecretConfig, HCPSecretConfig } from '../../../main/ipc/cloud-service-integraion/types';
import { type CloudProviderCredential, type CloudProviderName, HashiCorpCrdentialType, type HashiCorpCredentialsType } from '../../../models/cloud-credential';

export const getExternalVault = async (provider: CloudProviderName, providerCredential: CloudProviderCredential, secretConfig: ExternalVaultConfig) => {
  switch (provider) {
    case 'aws':
      return getAWSSecret(secretConfig as AWSSecretConfig, providerCredential);
    case 'azure':
      return getAzureSecret(secretConfig as AzureSecretConfig, providerCredential);
    case 'gcp':
      return getGCPSecret(secretConfig as GCPSecretConfig, providerCredential);
    case 'hashicorp':
      return getHashiCorpSecret(secretConfig as HashiCorpSecretConfig, providerCredential);
    default:
      return '';
  }
};

export const getAWSSecret = async (secretConfig: AWSSecretConfig, providerCredential: CloudProviderCredential) => {
  const {
    SecretId, VersionId, VersionStage, SecretKey,
    SecretType = 'plaintext',
  } = secretConfig;
  if (!SecretId) {
    throw new Error('Get secret from AWS failed: Secret Name or ARN is required');
  }
  const getSecretOption: CloudServiceSecretOption<AWSGetSecretConfig> = {
    provider: 'aws',
    secretId: SecretId,
    config: {
      VersionId, VersionStage,
    },
    credentials: providerCredential.credentials,
  };
  const secretResult = await window.main.cloudService.getSecret(getSecretOption);
  const { success, error, result } = secretResult;
  if (success && result) {
    const { SecretString } = result!;
    let parsedJSON;
    if (SecretType === 'plaintext' || !SecretKey) {
      return SecretString;
    } else {
      try {
        parsedJSON = JSON.parse(SecretString || '{}');
      } catch (error) {
        throw new Error(`Get secret from AWS failed: Secret value ${SecretString} can not parsed to key/value pair, please change Secret Type to plaintext`);
      }
      if (SecretKey in parsedJSON) {
        return parsedJSON[SecretKey];
      }
      throw new Error(`Get secret from AWS failed: Secret key ${SecretKey} does not exist in key/value secret ${SecretString}`);
    }
  } else {
    throw new Error(`Get secret from AWS failed: ${error?.errorMessage}`);
  }
};

export const getAzureSecret = async (secretConfig: AzureSecretConfig, providerCredential: CloudProviderCredential) => {
  const { secretIdentifier } = secretConfig;
  if (!secretIdentifier) {
    throw new Error('Get secret from Azure failed: Secret Identifieror is required');
  }
  const getSecretOption: CloudServiceSecretOption<{}> = {
    provider: 'azure',
    secretId: secretIdentifier,
    credentials: providerCredential.credentials,
    config: {},
  };
  const secretResult = await window.main.cloudService.getSecret(getSecretOption);
  const { success, error, result } = secretResult;
  if (success && result) {
    return result.value;
  } else {
    throw new Error(`Get secret from Azure failed: ${error?.errorMessage}`);
  }
};

export const getGCPSecret = async (secretConfig: GCPSecretConfig, providerCredential: CloudProviderCredential) => {
  const { secretName, version } = secretConfig;
  if (!secretName) {
    throw new Error('Get secret from GCP failed: Secret Name is required');
  }
  const getSecretOption: CloudServiceSecretOption<GCPGetSecretConfig> = {
    provider: 'gcp',
    secretId: secretName,
    credentials: providerCredential.credentials,
    config: { version },
  };
  const secretResult = await window.main.cloudService.getSecret(getSecretOption);
  const { success, error, result } = secretResult;
  if (success && result) {
    return result.value;
  } else {
    throw new Error(`Get secret from GCP failed: ${error?.errorMessage}`);
  }
};

export const getHashiCorpSecret = async (secretConfig: HashiCorpSecretConfig, providerCredential: CloudProviderCredential) => {
  const { secretName } = secretConfig;
  if (!secretName) {
    throw new Error('Secret Name is required');
  }
  const { credentials } = providerCredential;
  const { type } = credentials as HashiCorpCredentialsType;
  if (type === HashiCorpCrdentialType.cloud) {
    const { organizationId, projectId, appName } = secretConfig as HCPSecretConfig;
    if (!organizationId || !projectId || !appName) {
      throw new Error('Organization Id, Project Id, App Name is required');
    }
  } else {
    const { secretEnginePath } = secretConfig as HashiCorpVaultKVV1SecretConfig;
    if (!secretEnginePath) {
      throw new Error('Secret Engine Path is required');
    }
  };
  const getSecretOption: CloudServiceSecretOption<HashiCorpSecretConfig> = {
    provider: 'hashicorp',
    secretId: secretConfig.secretName,
    credentials: providerCredential.credentials,
    config: secretConfig,
  };
  const secretResult = await window.main.cloudService.getSecret(getSecretOption);
  const { success, error, result } = secretResult;
  if (success && result) {
    if (type === HashiCorpCrdentialType.cloud) {
      // cloud static secret value
      const { value } = result as HCPStaticSecretValue;
      return value;
    } else {
      const { kvVersion, secretKey } = secretConfig as HashiCorpVaultKVV1SecretConfig | HashiCorpVaultKVV2SecretConfig;
      if (kvVersion === 'v1') {
        // onPrem kv v1 secert value
        const { data } = result as HashiCorpVaultKVV1SecretValue;
        if (secretKey) {
          if (secretKey in data) {
            return data[secretKey];
          } else {
            throw new Error(`Secret key ${secretKey} does not exist in kv secert data ${JSON.stringify(data)}`);
          }
        } else {
          return JSON.stringify(data);
        }
      } else if (kvVersion === 'v2') {
        // onPrem kv v2 secert value
        const { data } = result as HashiCorpVaultKVV2SecretValue;
        const { data: secretV2Data } = data;
        if (secretKey) {
          if (secretKey in secretV2Data) {
            return secretV2Data[secretKey];
          } else {
            throw new Error(`Secret key ${secretKey} does not exist in kv secert data ${JSON.stringify(secretV2Data)}`);
          }
        } else {
          return JSON.stringify(secretV2Data);
        }
      };
    };
    return result.toString();
  } else {
    throw new Error(error?.errorMessage);
  }
};
