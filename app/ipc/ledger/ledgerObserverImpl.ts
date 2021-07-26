// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import TransportNodeHid from '@ledgerhq/hw-transport-node-hid-singleton';
import type {
    Observer,
    DescriptorEvent,
    Subscription,
} from '@ledgerhq/hw-transport';
import { BrowserWindow } from 'electron';
import ConcordiumLedgerClientMain from '../../features/ledger/ConcordiumLedgerClientMain';
import { isConcordiumApp } from '../../components/ledger/util';
import { LedgerSubscriptionAction } from '../../components/ledger/useLedger';
import ledgerIpcCommands from '~/constants/ledgerIpcCommands.json';
import { LedgerObserver } from './ledgerObserver';

export default class LedgerObserverImpl implements LedgerObserver {
    concordiumClient: ConcordiumLedgerClientMain | undefined;

    ledgerSubscription: Subscription | undefined;

    getLedgerClient(): ConcordiumLedgerClientMain {
        if (!this.concordiumClient) {
            throw new Error('A connection to the Ledger is not available.');
        }
        return this.concordiumClient;
    }

    async subscribeLedger(mainWindow: BrowserWindow): Promise<void> {
        if (!this.ledgerSubscription) {
            this.ledgerSubscription = TransportNodeHid.listen(
                this.createLedgerObserver(mainWindow)
            );
        }
    }

    closeTransport(): void {
        if (this.concordiumClient) {
            this.concordiumClient.closeTransport();
        }
    }

    /**
     * Creates an observer for events happening on the Ledger. The events will be sent using
     * IPC to the window provided.
     * @param mainWindow the window that should receive events from the observer
     */
    createLedgerObserver(
        mainWindow: BrowserWindow
    ): Observer<DescriptorEvent<string>> {
        const ledgerObserver: Observer<DescriptorEvent<string>> = {
            complete: () => {
                // This is expected to never trigger.
            },
            error: () => {
                mainWindow.webContents.send(
                    ledgerIpcCommands.listenChannel,
                    LedgerSubscriptionAction.ERROR_SUBSCRIPTION
                );
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            next: async (event: any) => {
                if (event.type === 'add') {
                    const deviceName = event.deviceModel.productName;
                    const transport = await TransportNodeHid.open();
                    this.concordiumClient = new ConcordiumLedgerClientMain(
                        mainWindow,
                        transport
                    );

                    const appAndVersionResult = await this.concordiumClient.getAppAndVersion();
                    const appAndVersion = appAndVersionResult.result;
                    if (!appAndVersion) {
                        // We could not extract the version information.
                        mainWindow.webContents.send(
                            ledgerIpcCommands.listenChannel,
                            LedgerSubscriptionAction.RESET
                        );
                        return;
                    }

                    if (isConcordiumApp(appAndVersion)) {
                        mainWindow.webContents.send(
                            ledgerIpcCommands.listenChannel,
                            LedgerSubscriptionAction.CONNECTED_SUBSCRIPTION,
                            deviceName
                        );
                    } else {
                        // The device has been connected, but the Concordium application has not
                        // been opened yet.
                        mainWindow.webContents.send(
                            ledgerIpcCommands.listenChannel,
                            LedgerSubscriptionAction.PENDING,
                            deviceName
                        );
                    }
                } else if (event.type === 'remove') {
                    if (this.concordiumClient) {
                        this.concordiumClient.closeTransport();
                    }
                    mainWindow.webContents.send(
                        ledgerIpcCommands.listenChannel,
                        LedgerSubscriptionAction.RESET
                    );
                }
            },
        };
        return ledgerObserver;
    }
}
