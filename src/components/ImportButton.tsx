import { useRef, type ReactNode } from 'react';
import { importBackup } from '../db/backupIO';

type Props = {
  className?: string;
  children: ReactNode;
  /** После успешной замены данных */
  onDone?: () => void;
};

export function ImportButton({ className, children, onDone }: Props) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" className={className} onClick={() => input.current?.click()}>
        {children}
      </button>
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = ''; // чтобы тот же файл можно было выбрать снова
          if (file && (await importBackup(file))) {
            alert('Данные восстановлены');
            onDone?.();
          }
        }}
      />
    </>
  );
}
