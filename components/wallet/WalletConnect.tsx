import { ConnectKitButton } from 'connectkit';

export const WalletConnect: React.FC = () => {

  return (
    <div className="flex flex-col items-end gap-2">
      <ConnectKitButton />
    </div>
  );
};
