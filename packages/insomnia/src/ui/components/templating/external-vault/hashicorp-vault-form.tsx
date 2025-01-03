import React, { useEffect, useState } from 'react';

import { type HashiCorpSecretConfig, type HashiCorpVaultKVV1SecretConfig, type HashiCorpVaultKVV2SecretConfig, type HCPSecretConfig } from '../../../../main/ipc/cloud-service-integraion/types';
import * as models from '../../../../models';
import { HashiCorpCrdentialType, type HashiCorpCredentialsType } from '../../../../models/cloud-credential';
import type { NunjucksParsedTag } from '../../../../templating/utils';
import { HelpTooltip } from '../../help-tooltip';

export interface HashiCorpVaultFormProps {
  formData: HashiCorpSecretConfig;
  onChange: (newConfig: HashiCorpSecretConfig) => void;
  activeTagData: NunjucksParsedTag;
}

export const HashiCorpVaultForm = (props: HashiCorpVaultFormProps) => {
  const { formData, onChange, activeTagData } = props;
  const {
    secretName,
  } = formData;
  // onPrem secret config
  const { kvVersion = 'v1', secretEnginePath, secretKey } = formData as HashiCorpVaultKVV1SecretConfig | HashiCorpVaultKVV2SecretConfig;
  // cloud secret config
  const { organizationId, projectId, appName, version: cloudSecretVersion } = formData as HCPSecretConfig;
  const credentialId = activeTagData.args[1].value as string;
  const [credentialType, setCredentialType] = useState<HashiCorpCrdentialType>();
  const handleOnChange = () => {
    const formElement = document.getElementById('hashicorp-vault-form') as HTMLFormElement;
    if (formElement) {
      const formData = new FormData(formElement);
      const newConfig = Object.fromEntries(formData.entries());
      onChange(newConfig as unknown as HashiCorpSecretConfig);
    }
  };

  const getCredentialData = async (credentialId: string) => {
    const providerCredential = await models.cloudCrendential.getById(credentialId);
    if (providerCredential) {
      const { credentials } = providerCredential;
      setCredentialType((credentials as HashiCorpCredentialsType).type);
    }
  };

  useEffect(() => {
    if (credentialId) {
      getCredentialData(credentialId);
    }
  }, [credentialId]);
  return (
    <form id='hashicorp-vault-form'>
      <div className="form-row">
        <div className="form-control">
          <label>
            Secret Name:
            <input
              name='secretName'
              defaultValue={secretName}
              onChange={() => handleOnChange()}
            />
          </label>
        </div>
      </div>
      {credentialType === HashiCorpCrdentialType.onPrem &&
        <>
          <div className="form-row">
            <div className="form-control">
              <label>
                KV Secret Engine Version:
              </label>
              <div className='mt-2 flex flex-row'>
                <input
                  type="radio"
                  id="kvVersionChoice-v1"
                  name="kvVersion"
                  className='mr-2'
                  value='v1'
                  checked={kvVersion === 'v1'}
                  onChange={() => handleOnChange()}
                />
                <label className="pt-0 mr-8" htmlFor="hashiCorpEnvironmentTypeChoice-onPrem">V1</label>

                <input
                  type="radio"
                  id="kvVersionChoice-v2"
                  name="kvVersion"
                  className='mr-2'
                  value='v2'
                  checked={kvVersion === 'v2'}
                  onChange={() => handleOnChange()}
                />
                <label className="pt-0" htmlFor="hashiCorpEnvironmentTypeChoice-cloud">V2</label>
              </div>
            </div>
          </div>
          <div className="form-row">
            <div className="form-control">
              <label>
                Secret Engine Path:
                <input
                  name='secretEnginePath'
                  defaultValue={secretEnginePath}
                  onChange={() => handleOnChange()}
                />
              </label>
            </div>
          </div>
          {kvVersion === 'v2' &&
            <div className="form-row">
              <div className="form-control">
                <label>
                  Version:
                  <HelpTooltip className="space-left">
                    Optional version of the secret to retrieve, leave it blank to get latest version
                  </HelpTooltip>
                  <input
                    name='version'
                    defaultValue={(formData as HashiCorpVaultKVV2SecretConfig).version}
                    onChange={() => handleOnChange()}
                  />
                </label>
              </div>
            </div>
          }
          <div className="form-row">
            <div className="form-control">
              <label>
                Secret Key:
                <HelpTooltip className="space-left">
                  The secret key of the retrived key-value secrets.
                </HelpTooltip>
                <input
                  name='secretKey'
                  defaultValue={secretKey}
                  onChange={() => handleOnChange()}
                />
              </label>
            </div>
          </div>
        </>
      }
      {credentialType === HashiCorpCrdentialType.cloud &&
        <>
          <div className="form-row">
            <div className="form-control">
              <label>
                Organization Id:
                <input
                  name='organizationId'
                  defaultValue={organizationId}
                  onChange={() => handleOnChange()}
                />
              </label>
            </div>
          </div>
          <div className="form-row">
            <div className="form-control">
              <label>
                Project Id:
                <input
                  name='projectId'
                  defaultValue={projectId}
                  onChange={() => handleOnChange()}
                />
              </label>
            </div>
          </div>
          <div className="form-row">
            <div className="form-control">
              <label>
                App Name:
                <input
                  name='appName'
                  defaultValue={appName}
                  onChange={() => handleOnChange()}
                />
              </label>
            </div>
          </div>
          <div className="form-row">
            <div className="form-control">
              <label>
                Version:
                <HelpTooltip className="space-left">
                  Optional version of the secret to retrieve, leave it blank to get latest version
                </HelpTooltip>
                <input
                  name='version'
                  defaultValue={cloudSecretVersion}
                  onChange={() => handleOnChange()}
                />
              </label>
            </div>
          </div>
        </>
      }
    </form>
  );
};
