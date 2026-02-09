import React from 'react';
import { useStore } from '@/lib/store';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export const WalletConnect: React.FC = () => {

  return (
    <div className="flex flex-col items-end gap-2">
      <WalletMultiButton
        className="!bg-[#FF006E] hover:!bg-[#D0005A] !h-10 !px-6 !text-sm !font-bold !rounded-none !transition-all hover:!scale-105 active:!scale-95 !border-b-4 !border-black/30"
      />
    </div>
  );
};
