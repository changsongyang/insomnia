import React, { useState } from 'react';
import { Button, Input, Label, TextField } from 'react-aria-components';

import { type BaseCloudCredential, type CloudProviderCredential, type CloudProviderName, HashiCorpCrdentialType, type HashiCorpCredentialsType, HashiCorpVaultAuthMethod, type HCPCrdential, type VaultAppRoleCredential, type VaultTokenCredential } from '../../../../models/cloud-credential';
import { HelpTooltip } from '../../help-tooltip';
import { Icon } from '../../icon';
import { ToggleBtn } from './toggle-btn';

type HashiCorpOnPremCredential = VaultAppRoleCredential | VaultTokenCredential;
export interface HashiCorpCredentialFormProps {
  data?: CloudProviderCredential;
  onSubmit: (newData: BaseCloudCredential) => void;
  isLoading: boolean;
  errorMessage?: string;
}
const initialFormValue = {
  name: '',
  credentials: {
    type: HashiCorpCrdentialType.onPrem,
    authMethod: HashiCorpVaultAuthMethod.appRole,
    serverAddress: '',
  },
};
export const providerType: CloudProviderName = 'hashicorp';

export const HashiCorpCredentialForm = (props: HashiCorpCredentialFormProps) => {
  const { data, onSubmit, isLoading, errorMessage } = props;
  const isEdit = !!data;
  const { name, credentials } = data || initialFormValue;
  const [isValidUrl, setIsValidUrl] = useState(true);
  const { type } = credentials as HashiCorpCredentialsType;
  const [credentialType, setCredentialType] = useState<HashiCorpCrdentialType>(type);
  const [credentialAuthMethod, setAuthMethod] = useState<HashiCorpVaultAuthMethod>((credentials as VaultTokenCredential | VaultAppRoleCredential).authMethod);
  const [hideValueItemNames, setHideValueItemNames] = useState(['client_secret', 'secret_id', 'access_token']);

  const showOrHideItemValue = (name: string) => {
    if (hideValueItemNames.includes(name)) {
      setHideValueItemNames(hideValueItemNames.filter(n => n !== name));
    } else {
      setHideValueItemNames([...hideValueItemNames, name]);
    }
  };

  const validateServerAddress = (address: string) => {
    let isValid = true;
    try {
      new URL(address);
    } catch (error) {
      isValid = false;
    };
    setIsValidUrl(isValid);
  };

  return (
    <form
      className='flex flex-col gap-2 flex-shrink-0'
      onSubmit={e => {
        e.preventDefault();
        e.stopPropagation();
        const formData = new FormData(e.currentTarget);
        const {
          name, type,
          // cloud system credentials
          client_id, client_secret,
          // on-prem system credential
          authMethod, serverAddress, access_token, role_id, secret_id,
        } = Object.fromEntries(formData.entries()) as Record<string, string>;
        const commonData = {
          name,
          provider: providerType,
        };
        let newData;
        if (type === HashiCorpCrdentialType.cloud) {
          newData = {
            ...commonData,
            credentials: {
              type: type as HashiCorpCrdentialType.cloud,
              client_id, client_secret,
            },
          };
        } else {
          newData = {
            ...commonData,
            credentials: {
              type: type as HashiCorpCrdentialType.onPrem,
              authMethod: authMethod as HashiCorpVaultAuthMethod,
              serverAddress,
              ...(authMethod === HashiCorpVaultAuthMethod.token && { access_token }),
              ...(authMethod === HashiCorpVaultAuthMethod.appRole && { role_id, secret_id }),
            },
          };
        };
        onSubmit(newData as BaseCloudCredential);
      }}
    >
      <TextField
        className="flex flex-col gap-2"
        defaultValue={name}
      >
        <Label className='col-span-4'>
          Credential Name:
        </Label>
        <Input
          required
          className='py-1 h-8 w-full pl-2 pr-7 rounded-sm border border-solid border-[--hl-sm] bg-[--color-bg] text-[--color-font] focus:outline-none focus:ring-1 focus:ring-[--hl-md] transition-colors flex-1 placeholder:italic placeholder:opacity-60 col-span-3'
          type="text"
          name="name"
          placeholder="Credential name"
        />
      </TextField>
      <div>
        <label>
          System Type:
        </label>
        <div className='mt-2 flex flex-row'>
          <input
            type="radio"
            id="hashiCorpEnvironmentTypeChoice-onPrem"
            name="type"
            className='mr-2'
            value={HashiCorpCrdentialType.onPrem}
            checked={credentialType === HashiCorpCrdentialType.onPrem}
            onChange={() => setCredentialType(HashiCorpCrdentialType.onPrem)}
          />
          <label className="pt-0 mr-8 w-32" htmlFor="hashiCorpEnvironmentTypeChoice-onPrem">On-Premises</label>

          <input
            type="radio"
            id="hashiCorpEnvironmentTypeChoice-cloud"
            name="type"
            className='mr-2'
            value={HashiCorpCrdentialType.cloud}
            checked={credentialType === HashiCorpCrdentialType.cloud}
            onChange={() => setCredentialType(HashiCorpCrdentialType.cloud)}
          />
          <label className="pt-0" htmlFor="hashiCorpEnvironmentTypeChoice-cloud">Cloud</label>
        </div>
      </div>
      {credentialType === HashiCorpCrdentialType.onPrem &&
        <>
          <div>
            <label>
              Auth Method:
            </label>
            <div className='mt-2 flex flex-row'>
              <input
                type="radio"
                id="authMethodChoice-appRole"
                name="authMethod"
                className='mr-2'
                value={HashiCorpVaultAuthMethod.appRole}
                checked={credentialAuthMethod === HashiCorpVaultAuthMethod.appRole}
                onChange={() => setAuthMethod(HashiCorpVaultAuthMethod.appRole)}
              />
              <label className="pt-0 mr-8 w-32" htmlFor="authMethodChoice-appRole">AppRole</label>

              <input
                type="radio"
                id="authMethodChoice-token"
                name="authMethod"
                className='mr-2'
                value={HashiCorpVaultAuthMethod.token}
                checked={credentialAuthMethod === HashiCorpVaultAuthMethod.token}
                onChange={() => setAuthMethod(HashiCorpVaultAuthMethod.token)}
              />
              <label className="pt-0" htmlFor="authMethodChoice-token">Token</label>
            </div>
          </div>
          <TextField
            className="flex flex-col gap-2"
            defaultValue={(credentials as HashiCorpOnPremCredential).serverAddress}
          >
            <Label className='col-span-4'>
              Server Address:
              <HelpTooltip className='ml-2 sapce-left'>HashiCorp on-prem server address like https://localhost:8200</HelpTooltip>
            </Label>
            <Input
              required
              className='py-1 h-8 w-full pl-2 pr-7 rounded-sm border border-solid border-[--hl-sm] bg-[--color-bg] text-[--color-font] focus:outline-none focus:ring-1 focus:ring-[--hl-md] transition-colors flex-1 placeholder:italic placeholder:opacity-60 col-span-3'
              type="text"
              name="serverAddress"
              onChange={e => validateServerAddress(e.target.value)}
              placeholder="Server Address"
            />
          </TextField>
          {!isValidUrl &&
            <p className="notice error margin-top-sm no-margin-bottom">Invalid server address, please check and input again</p>
          }
          {credentialAuthMethod === HashiCorpVaultAuthMethod.token &&
            <TextField
              className="flex flex-col gap-2"
              defaultValue={(credentials as VaultTokenCredential).access_token}
            >
              <Label className='col-span-4'>
                Authentication Token:
              </Label>
              <div className='flex items-center gap-2'>
                <Input
                  required
                  className='py-1 h-8 w-full pl-2 pr-7 rounded-sm border border-solid border-[--hl-sm] bg-[--color-bg] text-[--color-font] focus:outline-none focus:ring-1 focus:ring-[--hl-md] transition-colors flex-1 placeholder:italic placeholder:opacity-60 col-span-3'
                  type={hideValueItemNames.includes('access_token') ? 'password' : 'text'}
                  name="access_token"
                  placeholder="Authentication Token"
                />
                <ToggleBtn
                  isHidden={hideValueItemNames.includes('access_token')}
                  onShowHideInput={() => showOrHideItemValue('access_token')}
                />
              </div>
            </TextField>
          }
          {credentialAuthMethod === HashiCorpVaultAuthMethod.appRole &&
            <>
              <TextField
                className="flex flex-col gap-2"
                defaultValue={(credentials as VaultAppRoleCredential).role_id}
              >
                <Label className='col-span-4'>
                  Role Id:
                </Label>
                <Input
                  required
                  className='py-1 h-8 w-full pl-2 pr-7 rounded-sm border border-solid border-[--hl-sm] bg-[--color-bg] text-[--color-font] focus:outline-none focus:ring-1 focus:ring-[--hl-md] transition-colors flex-1 placeholder:italic placeholder:opacity-60 col-span-3'
                  type='text'
                  name="role_id"
                  placeholder="Role Id"
                />
              </TextField>
              <TextField
                className="flex flex-col gap-2"
                defaultValue={(credentials as VaultAppRoleCredential).secret_id}
              >
                <Label className='col-span-4'>
                  Secret Id:
                </Label>
                <div className='flex items-center gap-2'>
                  <Input
                    required
                    className='py-1 h-8 w-full pl-2 pr-7 rounded-sm border border-solid border-[--hl-sm] bg-[--color-bg] text-[--color-font] focus:outline-none focus:ring-1 focus:ring-[--hl-md] transition-colors flex-1 placeholder:italic placeholder:opacity-60 col-span-3'
                    type={hideValueItemNames.includes('secret_id') ? 'password' : 'text'}
                    name="secret_id"
                    placeholder="Secret Id"
                  />
                  <ToggleBtn
                    isHidden={hideValueItemNames.includes('secret_id')}
                    onShowHideInput={() => showOrHideItemValue('secret_id')}
                  />
                </div>
              </TextField>
            </>
          }
        </>
      }
      {credentialType === HashiCorpCrdentialType.cloud &&
        <>
          <TextField
            className="flex flex-col gap-2"
            defaultValue={(credentials as HCPCrdential).client_id}
          >
            <Label className='col-span-4'>
              Cliend Id:
            </Label>
            <Input
              required
              className='py-1 h-8 w-full pl-2 pr-7 rounded-sm border border-solid border-[--hl-sm] bg-[--color-bg] text-[--color-font] focus:outline-none focus:ring-1 focus:ring-[--hl-md] transition-colors flex-1 placeholder:italic placeholder:opacity-60 col-span-3'
              type="text"
              name="client_id"
              placeholder="Client Id"
            />
          </TextField>
          <TextField
            className="flex flex-col gap-2"
            defaultValue={(credentials as HCPCrdential).client_secret}
          >
            <Label className='col-span-4'>
              Client Secret:
            </Label>
            <div className='flex items-center gap-2'>
              <Input
                required
                className='py-1 h-8 w-full pl-2 pr-7 rounded-sm border border-solid border-[--hl-sm] bg-[--color-bg] text-[--color-font] focus:outline-none focus:ring-1 focus:ring-[--hl-md] transition-colors flex-1 placeholder:italic placeholder:opacity-60 col-span-3'
                type={hideValueItemNames.includes('client_secret') ? 'password' : 'text'}
                name="client_secret"
                placeholder="Client Secret"
              />
              <ToggleBtn
                isHidden={hideValueItemNames.includes('client_secret')}
                onShowHideInput={() => showOrHideItemValue('client_secret')}
              />
            </div>
          </TextField>
        </>
      }
      {errorMessage &&
        <p className="notice error margin-top-sm no-margin-bottom">{errorMessage}</p>
      }
      <div className='w-full flex flex-row items-center justify-end gap-[--padding-md] pt-[--padding-md]'>
        <Button
          className="hover:no-underline text-right bg-[--color-surprise] hover:bg-opacity-90 border border-solid border-[--hl-md] py-2 px-3 text-[--color-font-surprise] transition-colors rounded-sm"
          type='submit'
          isDisabled={isLoading || !isValidUrl}
        >
          {isLoading && <Icon icon="spinner" className="text-[--color-font] animate-spin m-auto inline-block mr-2" />}
          {isEdit ? 'Update' : 'Create'}
        </Button>
      </div>
    </form>
  );
};
