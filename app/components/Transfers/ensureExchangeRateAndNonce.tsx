import React, { ComponentType } from 'react';
import { Account, Fraction } from '~/utils/types';
import Loading from '~/cross-app-components/Loading';
import Card from '~/cross-app-components/Card';
import withExchangeRate from './withExchangeRate';
import withNonce from './withNonce';

interface Extra {
    exchangeRate?: Fraction;
    nonce?: string;
    account: Account;
}

function ensureExchangeRateAndNonce<TProps extends Extra>(
    Component: ComponentType<TProps>
): ComponentType<TProps> {
    return (props) => {
        const { exchangeRate, nonce } = props;

        if (!exchangeRate || !nonce) {
            return (
                <Card className="flex pV50">
                    <Loading
                        inline
                        className="marginCenter"
                        text="Loading information for creating transaction."
                    />
                </Card>
            );
        }

        return <Component {...props} />;
    };
}

export default function withExchangeRateAndNonce<TProps extends Extra>(
    comp: ComponentType<TProps>
) {
    return withNonce(withExchangeRate(ensureExchangeRateAndNonce(comp)));
}
