/**
 * BNB Wallet Integration Module
 * Syncs Wagmi state with Zustand store
 */

import { useAccount } from 'wagmi';
import { useOverflowStore } from '@/lib/store';
import { useEffect } from 'react';

/**
 * Hook for managing BNB wallet connection state
 */
export function useWalletConnection() {
    const { address, isConnected, connector } = useAccount();

    // Get store actions
    const setAddress = useOverflowStore(state => state.setAddress);
    const setIsConnected = useOverflowStore(state => state.setIsConnected);
    const fetchBalance = useOverflowStore(state => state.fetchBalance);

    // Sync wallet state with store
    useEffect(() => {
        if (address && isConnected) {
            setAddress(address);
            setIsConnected(true);

            // Fetch house balance when wallet connects
            fetchBalance(address).catch(console.error);

            // Persist session to localStorage
            if (typeof window !== 'undefined') {
                localStorage.setItem('bnbnomo_wallet_session', JSON.stringify({
                    address: address,
                    walletName: connector?.name || 'Injected',
                    timestamp: Date.now()
                }));
            }
        } else {
            setAddress(null);
            setIsConnected(false);

            // Clear localStorage session
            if (typeof window !== 'undefined') {
                localStorage.removeItem('bnbnomo_wallet_session');
            }
        }
    }, [address, isConnected, connector, setAddress, setIsConnected, fetchBalance]);

    return {
        address,
        isConnected,
        walletName: connector?.name || null
    };
}
