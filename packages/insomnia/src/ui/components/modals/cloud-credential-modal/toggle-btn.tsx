import React from 'react';
import { Button } from 'react-aria-components';

export const ToggleBtn = (props: { isHidden: boolean; onShowHideInput: () => void }) => {
  const { isHidden, onShowHideInput } = props;
  return (
    <Button
      className="px-4 h-8 min-w-[12ch] py-1 font-semibold border border-solid border-[--hl-md] flex items-center justify-center gap-2 aria-pressed:bg-[--hl-sm] rounded-sm text-[--color-font] hover:bg-[--hl-xs] focus:ring-inset ring-1 ring-transparent focus:ring-[--hl-md] transition-all text-sm"
      onPress={onShowHideInput}
    >
      {isHidden ? <i className="fa fa-eye-slash" /> : <i className="fa fa-eye" />}
    </Button>
  );
};
