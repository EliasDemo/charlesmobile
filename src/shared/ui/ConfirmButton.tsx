import { useState } from 'react';
import { Button, type ButtonProps } from './Button';
import { ConfirmDialog } from './ConfirmDialog';
import type { IconName } from './Icon';

export interface ConfirmButtonProps extends Omit<ButtonProps, 'onPress'> {
  /** Runs only after the person confirms. */
  onConfirm: () => void;
  confirm: {
    title: string;
    /** What will happen, in plain words. */
    message: string;
    confirmLabel: string;
    destructive?: boolean;
    icon?: IconName;
  };
}

/** A button for an action that cannot be undone: it asks first (CLAUDE.md §6). */
export function ConfirmButton({ onConfirm, confirm, ...button }: ConfirmButtonProps) {
  const [asking, setAsking] = useState(false);
  return (
    <>
      <Button {...button} onPress={() => setAsking(true)} />
      <ConfirmDialog
        visible={asking}
        title={confirm.title}
        message={confirm.message}
        confirmLabel={confirm.confirmLabel}
        destructive={confirm.destructive}
        icon={confirm.icon}
        loading={button.loading}
        onConfirm={() => {
          setAsking(false);
          onConfirm();
        }}
        onCancel={() => setAsking(false)}
      />
    </>
  );
}
